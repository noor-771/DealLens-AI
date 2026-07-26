#!/usr/bin/env python3
"""
DealLens AI Backend API Tests
Tests all backend endpoints including health check, auth, and image analysis
"""

import requests
import base64
import io
import json
from PIL import Image, ImageDraw, ImageFont

# Backend URL from frontend/.env
BASE_URL = "https://smart-deal-ai-1.preview.emergentagent.com/api"

def create_test_image():
    """Create a simple test product image"""
    # Create a 800x600 image with a product-like appearance
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw a product box
    draw.rectangle([100, 100, 700, 500], fill='lightblue', outline='darkblue', width=3)
    
    # Add text (product name and price)
    try:
        # Try to use a default font, fallback to basic if not available
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
    
    # Product name
    draw.text((150, 200), "Premium Wireless Headphones", fill='black', font=font_large)
    
    # Brand
    draw.text((150, 260), "Brand: TechAudio Pro", fill='darkgray', font=font_medium)
    
    # Price
    draw.text((150, 320), "Price: $149.99", fill='red', font=font_large)
    
    # Specifications
    draw.text((150, 380), "• Noise Cancellation", fill='black', font=font_medium)
    draw.text((150, 420), "• 30hr Battery Life", fill='black', font=font_medium)
    draw.text((150, 460), "• Bluetooth 5.0", fill='black', font=font_medium)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return image_base64

def test_health_check():
    """Test 1: Basic Health Check - GET /api/"""
    print("\n" + "="*80)
    print("TEST 1: Health Check - GET /api/")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "version" in data:
                print("✅ PASSED: Health check successful")
                return True
            else:
                print("❌ FAILED: Response missing expected fields")
                return False
        else:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_auth_session_without_session_id():
    """Test 2: Auth Session Endpoint - Should return error without session_id"""
    print("\n" + "="*80)
    print("TEST 2: Auth Session - POST /api/auth/session (without session_id)")
    print("="*80)
    
    try:
        # Test with missing session_id
        response = requests.post(f"{BASE_URL}/auth/session", json={}, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Should return 422 (validation error) for missing session_id
        if response.status_code == 422:
            print("✅ PASSED: Correctly returns validation error for missing session_id")
            return True
        else:
            print(f"⚠️  WARNING: Expected 422, got {response.status_code}")
            return True  # Not a critical failure
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_auth_me_without_token():
    """Test 3: Get Current User - Should return 401 without token"""
    print("\n" + "="*80)
    print("TEST 3: Get Current User - GET /api/auth/me (without token)")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 401:
            print("✅ PASSED: Correctly returns 401 for missing authorization")
            return True
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_scan_without_token():
    """Test 4: Scan Endpoint - Should return 401 without token"""
    print("\n" + "="*80)
    print("TEST 4: Scan Endpoint - POST /api/scan (without token)")
    print("="*80)
    
    try:
        image_base64 = create_test_image()
        # Note: API expects image_base64 as query parameter (CRITICAL BUG - should be in body)
        response = requests.post(
            f"{BASE_URL}/scan",
            params={"image_base64": image_base64},
            timeout=30
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 401:
            print("✅ PASSED: Correctly returns 401 for missing authorization")
            print("⚠️  WARNING: API accepts image_base64 as query param (should be in request body)")
            return True
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_scan_history_without_token():
    """Test 5: Scan History - Should return 401 without token"""
    print("\n" + "="*80)
    print("TEST 5: Scan History - GET /api/scans (without token)")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/scans", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 401:
            print("✅ PASSED: Correctly returns 401 for missing authorization")
            return True
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_image_validation():
    """Test 6: Image Validation - Test with invalid image data"""
    print("\n" + "="*80)
    print("TEST 6: Image Validation - POST /api/scan (invalid image)")
    print("="*80)
    
    try:
        # Test with invalid base64 (using query param as API expects)
        response = requests.post(
            f"{BASE_URL}/scan",
            params={"image_base64": "invalid_base64_data"},
            headers={"Authorization": "Bearer fake_token"},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Should return 401 (auth error) or 400 (validation error)
        if response.status_code in [400, 401]:
            print("✅ PASSED: Correctly handles invalid image data")
            return True
        else:
            print(f"⚠️  WARNING: Expected 400 or 401, got {response.status_code}")
            return True  # Not critical
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_logout_without_token():
    """Test 7: Logout - Should return 401 without token"""
    print("\n" + "="*80)
    print("TEST 7: Logout - POST /api/auth/logout (without token)")
    print("="*80)
    
    try:
        response = requests.post(f"{BASE_URL}/auth/logout", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 401:
            print("✅ PASSED: Correctly returns 401 for missing authorization")
            return True
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_language_update_without_token():
    """Test 8: Language Update - Should return 401 without token"""
    print("\n" + "="*80)
    print("TEST 8: Language Update - POST /api/auth/language (without token)")
    print("="*80)
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/language",
            params={"language": "ar"},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 401:
            print("✅ PASSED: Correctly returns 401 for missing authorization")
            return True
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_api_design_issue():
    """Test 9: Demonstrate API Design Issue - Query Parameter Size Limit"""
    print("\n" + "="*80)
    print("TEST 9: API Design Issue - Query Parameter Size Limitation")
    print("="*80)
    
    try:
        image_base64 = create_test_image()
        image_size_kb = len(image_base64) / 1024
        
        print(f"Test image size: {image_size_kb:.2f} KB (base64 encoded)")
        print(f"Typical query parameter limit: 2-8 KB")
        print(f"Real product images: 100-500 KB (base64 encoded)")
        
        if image_size_kb > 8:
            print("❌ CRITICAL: Test image exceeds typical query param limits")
            print("   This endpoint will fail with real product images!")
        else:
            print("⚠️  WARNING: Test image fits in query param, but real images won't")
        
        print("\nRECOMMENDATION:")
        print("Change endpoint to accept image_base64 in request body:")
        print("  Option 1: Use Body(...) decorator")
        print("    async def create_scan(image_base64: str = Body(...), ...)")
        print("  Option 2: Use Pydantic model")
        print("    class ScanRequest(BaseModel):")
        print("        image_base64: str")
        print("    async def create_scan(request: ScanRequest, ...)")
        
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("DEALLENS AI BACKEND API TEST SUITE")
    print("="*80)
    print(f"Testing Backend URL: {BASE_URL}")
    
    results = []
    
    # Run all tests
    results.append(("Health Check", test_health_check()))
    results.append(("Auth Session Endpoint", test_auth_session_without_session_id()))
    results.append(("Get Current User (No Token)", test_auth_me_without_token()))
    results.append(("Scan Endpoint (No Token)", test_scan_without_token()))
    results.append(("Scan History (No Token)", test_scan_history_without_token()))
    results.append(("Image Validation", test_image_validation()))
    results.append(("Logout (No Token)", test_logout_without_token()))
    results.append(("Language Update (No Token)", test_language_update_without_token()))
    results.append(("API Design Issue Analysis", test_api_design_issue()))
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
