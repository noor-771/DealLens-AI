# DealLens AI - Product Requirements Document

## Overview
DealLens AI is an intelligent shopping decision assistant mobile app that helps users make smarter buying decisions by analyzing products, offers, and deals using AI.

## Target Users
Global users with full Arabic (RTL) and English support

## Technology Stack
- **Frontend**: Expo/React Native (iOS + Android)
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o Vision + GPT-4o Text
- **Auth**: Emergent Google Social Login
- **API Key**: Emergent Universal LLM Key (modular for future replacement)

## Phase 1 MVP Features (Current)

### 1. Product Scanning
- Camera capture for product photos
- Photo upload from gallery
- Support for products, price tags, screenshots, offers

### 2. AI Image Analysis
- Extract product information using GPT-4o Vision
- OCR for text extraction
- Structured data extraction:
  - Product name
  - Brand
  - Price and currency
  - Specifications
  - Seller information

### 3. Deal Score (0-100)
- AI-generated deal quality score
- Analysis breakdown:
  - ✅ Positive aspects
  - ⚠️ Warnings
  - ❌ Issues/risks
- Recommendations and insights

### 3b. Multi-input Analysis
- Take Photo (camera)
- Upload Image (gallery)
- Paste Product Link (URL/text analysis via GPT-4o)

### 4. Bilingual Support
- Arabic RTL interface
- English interface
- Language toggle
- Natural Arabic AI responses (not translated)

### 5. User Authentication
- Google Social Login
- User profile
- Session management

### 6. Scan History
- Save all user scans
- View past analyses
- Quick access to previous deal scores

### 7. Premium UI/UX
- Apple-inspired design language
- Dark mode support
- Smooth animations
- Clean, modern interface
- Tab-based navigation

## Phase 2 Features (Future)
- Product alternatives suggestions
- Price comparison with mock data
- Wishlist functionality
- Price drop alerts
- More product categories

## Phase 3 Features (Future)
- Premium subscriptions (Stripe)
- Advanced AI shopping assistant
- Contract analyzer
- Community reviews
- Scam detection

## Database Schema

### users
```
{
  user_id: string (custom ID)
  email: string
  name: string
  picture: string (profile photo URL)
  language: string (ar/en)
  created_at: datetime
}
```

### user_sessions
```
{
  session_token: string
  user_id: string
  expires_at: datetime
  created_at: datetime
}
```

### scans
```
{
  scan_id: string (custom ID)
  user_id: string
  image_base64: string
  product_info: {
    name: string
    brand: string
    price: number
    currency: string
    specifications: array
  }
  analysis: {
    deal_score: number (0-100)
    positive_aspects: array
    warnings: array
    issues: array
    recommendations: string
    summary: string
  }
  created_at: datetime
}
```

## API Endpoints

### Authentication
- POST /api/auth/session - Create session from Emergent auth
- GET /api/auth/me - Get current user
- POST /api/auth/logout - Logout user

### Scans
- POST /api/scan - Upload and analyze image
- GET /api/scans - Get user's scan history
- GET /api/scan/{scan_id} - Get specific scan details

## Success Metrics
- Fast scan analysis (<5 seconds)
- Accurate product extraction (>90%)
- Smooth bilingual experience
- High-quality UI matching premium standards
- Production-ready architecture for scaling
