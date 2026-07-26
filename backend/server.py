from fastapi import FastAPI, APIRouter, Header, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64
import io
from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create indexes
async def create_indexes():
    await db.users.create_index('email', unique=True)
    await db.users.create_index('user_id', unique=True)
    await db.user_sessions.create_index('session_token', unique=True)
    await db.user_sessions.create_index('user_id')
    await db.user_sessions.create_index('expires_at', expireAfterSeconds=0)
    await db.scans.create_index('user_id')
    await db.scans.create_index('scan_id', unique=True)
    await db.scans.create_index([('user_id', 1), ('created_at', -1)])
    await db.analytics_events.create_index([('user_id', 1), ('created_at', -1)])
    await db.analytics_events.create_index('event_type')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class SessionData(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    session_token: str

class CreateSessionRequest(BaseModel):
    session_id: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str
    language: str

class ProductInfo(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    specifications: Optional[List[str]] = None
    category: Optional[str] = None

class Alternative(BaseModel):
    name: str
    brand: Optional[str] = None
    estimated_price: Optional[float] = None
    currency: Optional[str] = None
    reason: str

class Analysis(BaseModel):
    deal_score: int
    positive_aspects: List[str]
    warnings: List[str]
    issues: List[str]
    recommendations: str
    summary: str
    alternatives: Optional[List[Alternative]] = []

class ScanResponse(BaseModel):
    scan_id: str
    product_info: ProductInfo
    analysis: Analysis
    image_base64: str
    created_at: datetime

class ScanHistoryItem(BaseModel):
    scan_id: str
    product_info: ProductInfo
    deal_score: int
    image_base64: str
    created_at: datetime

# Helper functions
async def get_user_from_token(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing or invalid authorization header')
    
    token = authorization.replace('Bearer ', '')
    session = await db.user_sessions.find_one({'session_token': token}, {'_id': 0})
    
    if not session:
        raise HTTPException(status_code=401, detail='Invalid session token')
    
    # Normalize expires_at to timezone-aware
    expires_at = session['expires_at']
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail='Session expired')
    
    user = await db.users.find_one({'user_id': session['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    
    return user

def validate_image(image_base64: str) -> str:
    """Validate and ensure image is in correct format"""
    try:
        # Remove data URL prefix if present
        if 'base64,' in image_base64:
            image_base64 = image_base64.split('base64,')[1]
        
        # Decode and validate
        image_data = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(image_data))
        
        # Ensure format is supported
        if img.format not in ['JPEG', 'PNG', 'WEBP']:
            # Convert to PNG
            buffer = io.BytesIO()
            img.convert('RGB').save(buffer, format='PNG')
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Resize if too large (max 2048px on longest side)
        max_size = 2048
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            img.save(buffer, format=img.format or 'PNG')
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return image_base64
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid image format: {str(e)}')

async def analyze_product_with_ai(image_base64: str, language: str = 'en') -> Dict[str, Any]:
    """Analyze product image using GPT-4o Vision"""
    try:
        # Validate image
        image_base64 = validate_image(image_base64)
        
        # Create prompt based on language
        if language == 'ar':
            prompt = """أنت خبير تسوق ذكي. قم بتحليل هذه الصورة واستخرج المعلومات التالية:

1. **معلومات المنتج**:
   - اسم المنتج
   - العلامة التجارية
   - السعر والعملة (إذا كان مرئياً)
   - المواصفات الرئيسية
   - الفئة

2. **تحليل الصفقة** (نقاط من 0-100):
   - أعط تقييماً رقمياً لجودة الصفقة
   - اذكر 2-3 جوانب إيجابية
   - اذكر 1-2 تحذيرات (إن وجدت)
   - اذكر أي مشاكل أو مخاطر

3. **التوصيات والملخص**

قدم الإجابة بصيغة JSON التالية:
{
  "product_info": {
    "name": "اسم المنتج",
    "brand": "العلامة التجارية",
    "price": السعر_كرقم_أو_null,
    "currency": "العملة",
    "specifications": ["مواصفة 1", "مواصفة 2"],
    "category": "الفئة"
  },
  "analysis": {
    "deal_score": نقاط_من_0_الى_100,
    "positive_aspects": ["ميزة 1", "ميزة 2"],
    "warnings": ["تحذير 1"],
    "issues": ["مشكلة 1"],
    "recommendations": "توصياتك هنا",
    "summary": "ملخص التحليل",
    "alternatives": [
      {"name": "اسم البديل", "brand": "العلامة التجارية", "estimated_price": السعر_التقديري, "currency": "USD", "reason": "سبب اختيار هذا البديل"},
      {"name": "بديل آخر", "brand": "علامة", "estimated_price": السعر, "currency": "USD", "reason": "لماذا هو أفضل"}
    ]
  }
}

اذكر 2-3 بدائل حقيقية ومعروفة في السوق مع أسعار تقديرية معقولة.
اجعل التحليل مفيداً وطبيعياً بالعربية."""
        else:
            prompt = """You are a smart shopping expert. Analyze this image and extract the following information:

1. **Product Information**:
   - Product name
   - Brand
   - Price and currency (if visible)
   - Key specifications
   - Category

2. **Deal Analysis** (Score 0-100):
   - Give a numerical rating for deal quality
   - List 2-3 positive aspects
   - List 1-2 warnings (if any)
   - List any issues or risks

3. **Recommendations and Summary**

Provide the response in the following JSON format:
{
  "product_info": {
    "name": "Product name",
    "brand": "Brand name",
    "price": price_as_number_or_null,
    "currency": "Currency code",
    "specifications": ["spec 1", "spec 2"],
    "category": "Category"
  },
  "analysis": {
    "deal_score": score_0_to_100,
    "positive_aspects": ["positive 1", "positive 2"],
    "warnings": ["warning 1"],
    "issues": ["issue 1"],
    "recommendations": "Your recommendations here",
    "summary": "Analysis summary",
    "alternatives": [
      {"name": "Alternative name", "brand": "Brand", "estimated_price": price_number, "currency": "USD", "reason": "Why this alternative"},
      {"name": "Another alternative", "brand": "Brand", "estimated_price": price_number, "currency": "USD", "reason": "Why it's better"}
    ]
  }
}

Provide 2-3 real, well-known market alternatives with reasonable estimated prices.
Make the analysis helpful and natural."""
        
        # Create chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"scan_{uuid.uuid4().hex[:12]}",
            system_message="You are a helpful shopping assistant expert. Always respond with valid JSON only."
        ).with_model("openai", "gpt-5.4")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Get response (non-streaming for structured data)
        response_text = ""
        async for event in chat.stream_message(UserMessage(
            text=prompt,
            file_contents=[image_content]
        )):
            if isinstance(event, TextDelta):
                response_text += event.content
            elif isinstance(event, StreamDone):
                break
        
        # Parse JSON response
        import json
        # Extract JSON from markdown code blocks if present
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        result = json.loads(response_text)
        return result
        
    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse AI response: {e}")
        # Return fallback response
        return {
            "product_info": {
                "name": "Product detected" if language == 'en' else "تم اكتشاف منتج",
                "brand": None,
                "price": None,
                "currency": None,
                "specifications": [],
                "category": "General" if language == 'en' else "عام"
            },
            "analysis": {
                "deal_score": 50,
                "positive_aspects": ["Product image uploaded successfully" if language == 'en' else "تم تحميل صورة المنتج بنجاح"],
                "warnings": ["Could not fully analyze the image" if language == 'en' else "لم يتم تحليل الصورة بالكامل"],
                "issues": [],
                "recommendations": "Please try with a clearer image" if language == 'en' else "يرجى المحاولة بصورة أوضح",
                "summary": "Basic product scan completed" if language == 'en' else "تم إجراء فحص أساسي للمنتج",
                "alternatives": []
            }
        }
    except Exception as e:
        logging.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f'AI analysis failed: {str(e)}')

async def analyze_text_with_ai(text: str, language: str = 'en') -> Dict[str, Any]:
    """Analyze product from text/URL using GPT-4o"""
    try:
        if language == 'ar':
            prompt = f"""أنت خبير تسوق ذكي. قم بتحليل هذا المنتج/الرابط واستخرج المعلومات:

النص/الرابط: {text}

قدم الإجابة بصيغة JSON التالية بدون أي شرح إضافي:
{{
  "product_info": {{
    "name": "اسم المنتج",
    "brand": "العلامة التجارية أو null",
    "price": السعر_كرقم_أو_null,
    "currency": "العملة أو null",
    "specifications": ["مواصفة 1", "مواصفة 2"],
    "category": "الفئة"
  }},
  "analysis": {{
    "deal_score": نقاط_من_0_الى_100,
    "positive_aspects": ["ميزة 1", "ميزة 2"],
    "warnings": ["تحذير 1"],
    "issues": ["مشكلة 1"],
    "recommendations": "توصياتك هنا",
    "summary": "ملخص التحليل",
    "alternatives": [
      {{"name": "اسم البديل", "brand": "العلامة", "estimated_price": السعر, "currency": "USD", "reason": "سبب البديل"}}
    ]
  }}
}}

اذكر 2-3 بدائل حقيقية معروفة في السوق مع أسعار تقديرية.
اجعل التحليل مفيداً وطبيعياً بالعربية."""
        else:
            prompt = f"""You are a smart shopping expert. Analyze this product/URL and extract information:

Text/URL: {text}

Provide the response in the following JSON format only without any additional explanation:
{{
  "product_info": {{
    "name": "Product name",
    "brand": "Brand or null",
    "price": price_as_number_or_null,
    "currency": "Currency or null",
    "specifications": ["spec 1", "spec 2"],
    "category": "Category"
  }},
  "analysis": {{
    "deal_score": score_0_to_100,
    "positive_aspects": ["positive 1", "positive 2"],
    "warnings": ["warning 1"],
    "issues": ["issue 1"],
    "recommendations": "Your recommendations here",
    "summary": "Analysis summary",
    "alternatives": [
      {{"name": "Alternative name", "brand": "Brand", "estimated_price": price_number, "currency": "USD", "reason": "Why this alternative"}}
    ]
  }}
}}

Provide 2-3 real, well-known market alternatives with reasonable estimated prices.
Make the analysis helpful and natural."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"text_scan_{uuid.uuid4().hex[:12]}",
            system_message="You are a helpful shopping assistant expert. Always respond with valid JSON only."
        ).with_model("openai", "gpt-5.4")

        response_text = ""
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                response_text += event.content
            elif isinstance(event, StreamDone):
                break

        import json
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()

        result = json.loads(response_text)
        return result
    except Exception as e:
        logging.error(f"Text analysis error: {e}")
        raise HTTPException(status_code=500, detail=f'AI analysis failed: {str(e)}')

# Routes
@api_router.post("/auth/session", response_model=UserResponse)
async def create_session(request: CreateSessionRequest):
    """Create session from Emergent auth"""
    try:
        # Get session data from Emergent
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
                headers={'X-Session-ID': request.session_id},
                timeout=10.0
            )
            response.raise_for_status()
            session_data = SessionData(**response.json())
        
        # Check if user exists
        existing_user = await db.users.find_one({'email': session_data.email}, {'_id': 0})
        
        if existing_user:
            user_id = existing_user['user_id']
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                'user_id': user_id,
                'email': session_data.email,
                'name': session_data.name,
                'picture': session_data.picture,
                'language': 'en',  # Default language
                'created_at': datetime.now(timezone.utc)
            }
            await db.users.insert_one(user_doc)
        
        # Store session
        session_doc = {
            'session_token': session_data.session_token,
            'user_id': user_id,
            'expires_at': datetime.now(timezone.utc) + timedelta(days=7),
            'created_at': datetime.now(timezone.utc)
        }
        await db.user_sessions.insert_one(session_doc)
        
        # Get user data
        user = await db.users.find_one({'user_id': user_id}, {'_id': 0})
        return UserResponse(**user)
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f'Failed to verify session: {str(e)}')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Session creation failed: {str(e)}')

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current authenticated user"""
    user = await get_user_from_token(authorization)
    return UserResponse(**user)

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing authorization header')
    
    token = authorization.replace('Bearer ', '')
    await db.user_sessions.delete_one({'session_token': token})
    return {'message': 'Logged out successfully'}

@api_router.post("/auth/language")
async def update_language(language: str, authorization: Optional[str] = Header(None)):
    """Update user's preferred language"""
    user = await get_user_from_token(authorization)
    await db.users.update_one(
        {'user_id': user['user_id']},
        {'$set': {'language': language}}
    )
    return {'message': 'Language updated successfully'}

class ScanRequest(BaseModel):
    image_base64: str

class TextScanRequest(BaseModel):
    text: str  # URL or product name/description

@api_router.post("/scan", response_model=ScanResponse)
async def create_scan(request: ScanRequest, authorization: Optional[str] = Header(None)):
    """Upload and analyze product image"""
    user = await get_user_from_token(authorization)
    
    # Analyze image with AI
    result = await analyze_product_with_ai(request.image_base64, user.get('language', 'en'))
    
    # Create scan document
    scan_id = f"scan_{uuid.uuid4().hex[:12]}"
    scan_doc = {
        'scan_id': scan_id,
        'user_id': user['user_id'],
        'image_base64': request.image_base64,
        'product_info': result['product_info'],
        'analysis': result['analysis'],
        'created_at': datetime.now(timezone.utc)
    }
    await db.scans.insert_one(scan_doc)
    
    return ScanResponse(
        scan_id=scan_id,
        product_info=ProductInfo(**result['product_info']),
        analysis=Analysis(**result['analysis']),
        image_base64=request.image_base64,
        created_at=scan_doc['created_at']
    )

@api_router.post("/scan-text", response_model=ScanResponse)
async def create_text_scan(request: TextScanRequest, authorization: Optional[str] = Header(None)):
    """Analyze product from text or URL"""
    user = await get_user_from_token(authorization)

    result = await analyze_text_with_ai(request.text, user.get('language', 'en'))

    # Use a placeholder image (1x1 transparent PNG) for text scans
    placeholder_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

    scan_id = f"scan_{uuid.uuid4().hex[:12]}"
    scan_doc = {
        'scan_id': scan_id,
        'user_id': user['user_id'],
        'image_base64': placeholder_image,
        'product_info': result['product_info'],
        'analysis': result['analysis'],
        'source': 'text',
        'source_text': request.text[:500],  # Store first 500 chars
        'created_at': datetime.now(timezone.utc)
    }
    await db.scans.insert_one(scan_doc)

    return ScanResponse(
        scan_id=scan_id,
        product_info=ProductInfo(**result['product_info']),
        analysis=Analysis(**result['analysis']),
        image_base64=placeholder_image,
        created_at=scan_doc['created_at']
    )

@api_router.get("/scans", response_model=List[ScanHistoryItem])
async def get_scans(authorization: Optional[str] = Header(None)):
    """Get user's scan history"""
    user = await get_user_from_token(authorization)
    
    scans = await db.scans.find(
        {'user_id': user['user_id']},
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    history = []
    for scan in scans:
        history.append(ScanHistoryItem(
            scan_id=scan['scan_id'],
            product_info=ProductInfo(**scan['product_info']),
            deal_score=scan['analysis']['deal_score'],
            image_base64=scan['image_base64'],
            created_at=scan['created_at']
        ))
    
    return history

@api_router.get("/scan/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, authorization: Optional[str] = Header(None)):
    """Get specific scan details"""
    user = await get_user_from_token(authorization)
    
    scan = await db.scans.find_one(
        {'scan_id': scan_id, 'user_id': user['user_id']},
        {'_id': 0}
    )
    
    if not scan:
        raise HTTPException(status_code=404, detail='Scan not found')
    
    return ScanResponse(
        scan_id=scan['scan_id'],
        product_info=ProductInfo(**scan['product_info']),
        analysis=Analysis(**scan['analysis']),
        image_base64=scan['image_base64'],
        created_at=scan['created_at']
    )

# Analytics
class AnalyticsEvent(BaseModel):
    event_type: str  # e.g. scan_started, scan_completed, login, language_changed
    metadata: Optional[Dict[str, Any]] = {}

@api_router.post("/analytics/event")
async def track_event(event: AnalyticsEvent, authorization: Optional[str] = Header(None)):
    """Track a user analytics event"""
    user = await get_user_from_token(authorization)
    doc = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "user_id": user['user_id'],
        "event_type": event.event_type,
        "metadata": event.metadata or {},
        "created_at": datetime.now(timezone.utc),
    }
    await db.analytics_events.insert_one(doc)
    return {"status": "ok"}

@api_router.get("/analytics/stats")
async def get_user_stats(authorization: Optional[str] = Header(None)):
    """Return stats for the authenticated user"""
    user = await get_user_from_token(authorization)
    user_id = user['user_id']

    total_scans = await db.scans.count_documents({"user_id": user_id})

    # Aggregate for avg score, best score, top category
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$analysis.deal_score"},
            "best_score": {"$max": "$analysis.deal_score"},
        }}
    ]
    agg = await db.scans.aggregate(pipeline).to_list(1)
    avg_score = int(agg[0]["avg_score"]) if agg and agg[0].get("avg_score") is not None else 0
    best_score = int(agg[0]["best_score"]) if agg and agg[0].get("best_score") is not None else 0

    # Top category
    cat_pipeline = [
        {"$match": {"user_id": user_id, "product_info.category": {"$ne": None}}},
        {"$group": {"_id": "$product_info.category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1},
    ]
    cat_agg = await db.scans.aggregate(cat_pipeline).to_list(1)
    top_category = cat_agg[0]["_id"] if cat_agg else None

    return {
        "total_scans": total_scans,
        "avg_deal_score": avg_score,
        "best_deal_score": best_score,
        "top_category": top_category,
    }

@api_router.get("/")
async def root():
    return {"message": "DealLens AI API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await create_indexes()
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
