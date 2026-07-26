import os
import uuid
import base64
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get('BACKEND_TEST_URL', 'http://localhost:8001').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


@pytest.fixture(scope='session')
def base_url():
    return BASE_URL


@pytest.fixture(scope='session')
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope='session')
def api_client():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    return session


@pytest.fixture(scope='session')
def test_context(mongo_db):
    """Create a test user + session in Mongo. Cleanup all test data after tests."""
    user_id = f"user_test_{uuid.uuid4().hex[:8]}"
    email = f"TEST_{user_id}@test.com"
    mongo_db.users.insert_one({
        'user_id': user_id,
        'email': email,
        'name': 'TEST User',
        'picture': 'https://example.com/pic.jpg',
        'language': 'en',
        'created_at': datetime.now(timezone.utc),
    })
    token = f"tok_{uuid.uuid4().hex}"
    mongo_db.user_sessions.insert_one({
        'session_token': token,
        'user_id': user_id,
        'expires_at': datetime.now(timezone.utc) + timedelta(days=7),
        'created_at': datetime.now(timezone.utc),
    })

    ctx = {'user_id': user_id, 'email': email, 'token': token}
    yield ctx

    # Cleanup
    mongo_db.scans.delete_many({'user_id': user_id})
    mongo_db.analytics_events.delete_many({'user_id': user_id})
    mongo_db.user_sessions.delete_many({'user_id': user_id})
    mongo_db.users.delete_many({'user_id': user_id})


@pytest.fixture(scope='session')
def auth_headers(test_context):
    return {'Authorization': f"Bearer {test_context['token']}", 'Content-Type': 'application/json'}


@pytest.fixture(scope='session')
def product_image_b64():
    path = '/tmp/product.jpg'
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')
