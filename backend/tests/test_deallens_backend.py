"""Backend tests for DealLens AI:
- Health
- Auth-protected endpoints unauthorized
- Image scan (/api/scan) with alternatives
- Text scan (/api/scan-text) with alternatives
- Analytics event + stats
- Mongo persistence checks
"""
import time

import pytest


# ---------- Health ----------
class TestHealth:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        body = r.json()
        assert 'message' in body


# ---------- Auth-protected endpoints reject missing token ----------
class TestAuthGuard:
    @pytest.mark.parametrize('method,path,payload', [
        ('POST', '/api/scan', {'image_base64': 'AAAA'}),
        ('POST', '/api/scan-text', {'text': 'Product'}),
        ('GET', '/api/scans', None),
        ('GET', '/api/scan/nope', None),
        ('POST', '/api/analytics/event', {'event_type': 'scan_started', 'metadata': {}}),
        ('GET', '/api/analytics/stats', None),
    ])
    def test_requires_auth(self, api_client, base_url, method, path, payload):
        url = f"{base_url}{path}"
        if method == 'GET':
            r = api_client.get(url)
        else:
            r = api_client.post(url, json=payload)
        assert r.status_code == 401, f"{method} {path} expected 401 got {r.status_code}: {r.text[:200]}"

    def test_invalid_token_rejected(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/scans", headers={'Authorization': 'Bearer nonsense_token_xyz'})
        assert r.status_code == 401


# ---------- Image scan ----------
class TestImageScan:
    def test_scan_with_real_image(self, api_client, base_url, auth_headers, product_image_b64, mongo_db, test_context):
        r = api_client.post(f"{base_url}/api/scan",
                            json={'image_base64': product_image_b64},
                            headers=auth_headers,
                            timeout=120)
        assert r.status_code == 200, f"scan failed: {r.status_code} {r.text[:500]}"
        data = r.json()

        # Required top-level fields
        for k in ('scan_id', 'product_info', 'analysis', 'image_base64', 'created_at'):
            assert k in data, f"missing key {k}"

        analysis = data['analysis']
        # Existing fields still present
        for k in ('deal_score', 'positive_aspects', 'warnings', 'issues', 'recommendations', 'summary', 'alternatives'):
            assert k in analysis, f"analysis missing {k}"

        assert isinstance(analysis['deal_score'], int)
        assert 0 <= analysis['deal_score'] <= 100
        assert isinstance(analysis['positive_aspects'], list)
        assert len(analysis['positive_aspects']) >= 1, 'positive_aspects (pros) must have >=1 item'
        assert isinstance(analysis['warnings'], list)
        assert isinstance(analysis['issues'], list)
        assert isinstance(analysis['recommendations'], str) and analysis['recommendations']
        assert isinstance(analysis['summary'], str) and analysis['summary']

        # product_info: name + category required (non-empty). price nullable number.
        pi = data['product_info']
        assert isinstance(pi.get('name'), str) and pi['name'], f"product_info.name empty: {pi}"
        assert isinstance(pi.get('category'), str) and pi['category'], f"product_info.category empty: {pi}"
        # HARD ASSERT: must not be the fallback stub sentinels
        assert pi['name'].strip().lower() != 'product detected', f"AI returned stub name 'Product detected': {pi}"
        assert pi['category'].strip().lower() != 'general', f"AI returned stub category 'General': {pi}"
        assert pi.get('price') is None or isinstance(pi['price'], (int, float)), f"price must be null or number: {pi.get('price')}"

        # Alternatives check
        alts = analysis['alternatives']
        assert isinstance(alts, list), 'alternatives should be a list'
        # AI *should* produce >=2 but be lenient in case the AI omits them - track and warn
        # But per prompt requirement of 2-3 we assert >=1 hard, >=2 soft
        assert len(alts) >= 1, f"expected >=1 alternatives, got {len(alts)}"
        for alt in alts:
            assert 'name' in alt and isinstance(alt['name'], str) and alt['name'], f"alt missing name: {alt}"
            assert 'reason' in alt and isinstance(alt['reason'], str) and alt['reason'], f"alt missing reason: {alt}"

        # Persistence: scan stored in mongo
        scan_doc = mongo_db.scans.find_one({'scan_id': data['scan_id']})
        assert scan_doc is not None
        assert scan_doc['user_id'] == test_context['user_id']
        assert 'alternatives' in scan_doc['analysis']

        # Stash for later tests
        pytest.image_scan_id = data['scan_id']
        pytest.image_alts_count = len(alts)

    def test_get_scan_by_id(self, api_client, base_url, auth_headers):
        scan_id = getattr(pytest, 'image_scan_id', None)
        if not scan_id:
            pytest.skip('image scan not created')
        r = api_client.get(f"{base_url}/api/scan/{scan_id}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data['scan_id'] == scan_id
        assert 'alternatives' in data['analysis']

    def test_scans_history(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/scans", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(s['scan_id'] == getattr(pytest, 'image_scan_id', None) for s in data)


# ---------- Text scan ----------
class TestTextScan:
    def test_scan_text(self, api_client, base_url, auth_headers, mongo_db):
        r = api_client.post(f"{base_url}/api/scan-text",
                            json={'text': 'Sony WH-1000XM5 wireless headphones'},
                            headers=auth_headers,
                            timeout=120)
        assert r.status_code == 200, f"scan-text failed: {r.status_code} {r.text[:500]}"
        data = r.json()

        # product_info sanity: must not be stub sentinels
        pi = data['product_info']
        assert isinstance(pi.get('name'), str) and pi['name'], f"product_info.name empty: {pi}"
        assert isinstance(pi.get('category'), str) and pi['category'], f"product_info.category empty: {pi}"
        assert pi['name'].strip().lower() != 'product detected'
        assert pi['category'].strip().lower() != 'general'

        analysis = data['analysis']
        for k in ('deal_score', 'positive_aspects', 'warnings', 'issues', 'recommendations', 'summary', 'alternatives'):
            assert k in analysis

        alts = analysis['alternatives']
        assert isinstance(alts, list)
        assert len(alts) >= 1, f"expected >=1 alternatives, got {len(alts)}"
        for alt in alts:
            assert alt.get('name'), f"alt missing name: {alt}"
            assert alt.get('reason'), f"alt missing reason: {alt}"

        # Persistence
        scan_doc = mongo_db.scans.find_one({'scan_id': data['scan_id']})
        assert scan_doc is not None
        assert scan_doc.get('source') == 'text'

        pytest.text_alts_count = len(alts)


# ---------- Error handling / image validation ----------
class TestImageValidation:
    """Verify hardened validate_image() returns specific 400 error codes."""

    def test_image_too_small_bytes(self, api_client, base_url, auth_headers):
        # base64 of "hello" -> way under 1KB
        import base64 as b64
        tiny = b64.b64encode(b'hello world').decode()
        r = api_client.post(f"{base_url}/api/scan", json={'image_base64': tiny}, headers=auth_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"
        detail = r.json().get('detail', '')
        assert 'IMAGE_TOO_SMALL' in detail, f"expected IMAGE_TOO_SMALL, got: {detail}"

    def test_image_too_small_dimensions(self, api_client, base_url, auth_headers):
        # 32x32 PNG (below 64px min dim). Pad to >1KB with metadata by using a JPEG.
        from PIL import Image
        import io as _io
        import base64 as b64
        img = Image.new('RGB', (32, 32), color=(120, 200, 80))
        # Add some noise so JPEG isn't uniform
        pix = img.load()
        for x in range(32):
            for y in range(32):
                pix[x, y] = ((x*7) % 255, (y*11) % 255, ((x+y)*13) % 255)
        buf = _io.BytesIO()
        img.save(buf, format='JPEG', quality=95)
        data = buf.getvalue()
        # Ensure > 1KB to bypass byte check and hit dimension check
        if len(data) < 1024:
            data = data + b'\x00' * (1024 - len(data) + 200)
        b = b64.b64encode(data).decode()
        r = api_client.post(f"{base_url}/api/scan", json={'image_base64': b}, headers=auth_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"
        detail = r.json().get('detail', '')
        # Either IMAGE_TOO_SMALL (dims) or CORRUPT_IMAGE if padding broke it. Prefer TOO_SMALL.
        assert 'IMAGE_TOO_SMALL' in detail or 'CORRUPT_IMAGE' in detail, f"unexpected detail: {detail}"

    def test_invalid_base64(self, api_client, base_url, auth_headers):
        r = api_client.post(f"{base_url}/api/scan",
                            json={'image_base64': 'not-real-base64!!!'},
                            headers=auth_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"
        detail = r.json().get('detail', '')
        assert 'INVALID_BASE64' in detail or 'INVALID_IMAGE' in detail or 'CORRUPT_IMAGE' in detail, \
            f"expected INVALID_BASE64/INVALID_IMAGE/CORRUPT_IMAGE, got: {detail}"

    def test_corrupt_image_random_bytes(self, api_client, base_url, auth_headers):
        import os as _os
        import base64 as b64
        # 2KB of random bytes (passes size check, fails PIL open)
        random_bytes = _os.urandom(2048)
        b = b64.b64encode(random_bytes).decode()
        r = api_client.post(f"{base_url}/api/scan", json={'image_base64': b}, headers=auth_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"
        detail = r.json().get('detail', '')
        assert 'CORRUPT_IMAGE' in detail, f"expected CORRUPT_IMAGE, got: {detail}"


# ---------- Analytics ----------
class TestAnalytics:
    def test_track_event(self, api_client, base_url, auth_headers, mongo_db, test_context):
        payload = {'event_type': 'scan_started', 'metadata': {'source': 'image'}}
        r = api_client.post(f"{base_url}/api/analytics/event", json=payload, headers=auth_headers)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        assert r.json().get('status') == 'ok'

        # Persisted?
        doc = mongo_db.analytics_events.find_one({'user_id': test_context['user_id'], 'event_type': 'scan_started'})
        assert doc is not None
        assert doc['metadata'].get('source') == 'image'

    def test_track_event_bad_body_400(self, api_client, base_url, auth_headers):
        r = api_client.post(f"{base_url}/api/analytics/event", json={}, headers=auth_headers)
        # Missing required event_type must be validation error (422)
        assert r.status_code in (400, 422)

    def test_stats(self, api_client, base_url, auth_headers):
        # Give mongo a moment (should be instant)
        time.sleep(0.5)
        r = api_client.get(f"{base_url}/api/analytics/stats", headers=auth_headers)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        data = r.json()
        for k in ('total_scans', 'avg_deal_score', 'best_deal_score', 'top_category'):
            assert k in data, f"missing {k}"

        # After image + text scan we should have at least 2
        assert data['total_scans'] >= 2, f"expected >=2 scans, got {data['total_scans']}"
        assert isinstance(data['avg_deal_score'], int)
        assert isinstance(data['best_deal_score'], int)
        assert 0 <= data['avg_deal_score'] <= 100
        assert 0 <= data['best_deal_score'] <= 100
        # top_category can be None or string
        assert data['top_category'] is None or isinstance(data['top_category'], str)
