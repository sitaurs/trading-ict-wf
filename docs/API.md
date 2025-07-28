# 🔌 API Reference

## 🐍 MetaTrader 5 Python API

### Base URL
```
Production: https://api.mt5.flx.web.id
Local: http://localhost:5000
```

### Authentication
```http
Headers:
X-API-Key: your_api_secret_key
Content-Type: application/json
```

---

## 📊 Trading Endpoints

### 1. Place Order
```http
POST /order
```

**Request Body:**
```json
{
  "symbol": "USDJPY",
  "order_type": "ORDER_TYPE_BUY",
  "volume": 0.01,
  "price": 150.50,
  "sl": 150.00,
  "tp": 151.00,
  "deviation": 10,
  "magic": 12345,
  "comment": "ICT Bot Stage3 Entry"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": 123456789,
  "order_type": "ORDER_TYPE_BUY",
  "volume": 0.01,
  "price": 150.50,
  "message": "Order placed successfully"
}
```

### 2. Get Active Positions
```http
GET /get_positions
```

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "ticket": 123456789,
      "symbol": "USDJPY",
      "type": "POSITION_TYPE_BUY",
      "volume": 0.01,
      "price_open": 150.50,
      "price_current": 150.75,
      "profit": 2.50,
      "sl": 150.00,
      "tp": 151.00,
      "time": "2025-07-28 10:30:00"
    }
  ]
}
```

### 3. Close Position
```http
POST /position/close_by_ticket
```

**Request Body:**
```json
{
  "ticket": 123456789,
  "deviation": 10,
  "comment": "ICT Bot EOD Close"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": 123456789,
  "close_price": 150.75,
  "profit": 2.50,
  "message": "Position closed successfully"
}
```

### 4. Cancel Pending Order
```http
POST /order/cancel
```

**Request Body:**
```json
{
  "ticket": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "ticket": 123456789,
  "message": "Order cancelled successfully"
}
```

### 5. Get Trading History
```http
GET /history_deals_get?from_date=2025-07-28&to_date=2025-07-28
```

**Response:**
```json
{
  "success": true,
  "deals": [
    {
      "ticket": 123456789,
      "symbol": "USDJPY",
      "type": "DEAL_TYPE_BUY",
      "volume": 0.01,
      "price": 150.50,
      "profit": 2.50,
      "time": "2025-07-28 10:30:00",
      "comment": "ICT Bot Stage3 Entry"
    }
  ],
  "total_profit": 2.50
}
```

### 6. Modify SL/TP
```http
POST /modify_sl_tp
```

**Request Body:**
```json
{
  "ticket": 123456789,
  "sl": 150.25,
  "tp": 151.50
}
```

**Response:**
```json
{
  "success": true,
  "ticket": 123456789,
  "new_sl": 150.25,
  "new_tp": 151.50,
  "message": "SL/TP modified successfully"
}
```

---

## 📈 Market Data Endpoints

### 1. Get OHLCV Data
```http
GET /ohlcv?symbol=USDJPY&timeframe=H1&count=100
```

**Response:**
```json
{
  "success": true,
  "symbol": "USDJPY",
  "timeframe": "H1",
  "data": [
    {
      "time": "2025-07-28 10:00:00",
      "open": 150.50,
      "high": 150.75,
      "low": 150.25,
      "close": 150.60,
      "volume": 1000
    }
  ]
}
```

### 2. Get Symbol Information
```http
GET /symbols
```

**Response:**
```json
{
  "success": true,
  "symbols": [
    {
      "name": "USDJPY",
      "description": "US Dollar vs Japanese Yen",
      "digits": 3,
      "spread": 1.2,
      "point": 0.001,
      "trade_allowed": true,
      "min_lot": 0.01,
      "max_lot": 100.0
    }
  ]
}
```

---

## 🤖 Google AI API

### Model Configuration
```javascript
const models = {
  analysis: "gemini-2.5-pro",      // For narrative analysis
  extraction: "gemini-2.0-flash-exp" // For data extraction
};
```

### Analysis Request
```javascript
const request = {
  model: "gemini-2.5-pro",
  contents: [{
    parts: [{
      text: prompt_content
    }]
  }],
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 4096,
    topP: 0.8
  }
};
```

### Multi-Modal Request (with chart image)
```javascript
const request = {
  model: "gemini-2.5-pro",
  contents: [{
    parts: [
      { text: prompt_content },
      { 
        inline_data: {
          mime_type: "image/png",
          data: base64_chart_image
        }
      }
    ]
  }]
};
```

---

## 📱 WhatsApp Bot Integration

### Message Format
```javascript
const message = {
  text: "🤖 *ICT Trading Bot*\n\n📊 Analysis completed...",
  mentions: [], // Optional mentions
  quotedMessage: null // Optional reply
};
```

### Button Response (future enhancement)
```javascript
const buttons = {
  text: "Choose action:",
  buttons: [
    { buttonId: "stage1", buttonText: { displayText: "🌅 Stage 1" } },
    { buttonId: "stage2", buttonText: { displayText: "⚡ Stage 2" } },
    { buttonId: "stage3", buttonText: { displayText: "🚀 Stage 3" } }
  ]
};
```

---

## 🔧 Internal APIs

### Context Manager API
```javascript
// Get daily context
const context = await contextManager.getDailyContext('USDJPY');

// Update context
await contextManager.updateDailyContext('USDJPY', {
  stage1_bias: 'BULLISH',
  stage2_manipulation: 'DETECTED',
  stage3_entry: 'PENDING'
});

// Reset context
await contextManager.resetDailyContext('USDJPY');
```

### Analysis Handler API
```javascript
// Run individual stages
await analysisHandler.runStage1Analysis(['USDJPY']);
await analysisHandler.runStage2Analysis(['USDJPY']);
await analysisHandler.runStage3Analysis(['USDJPY']);

// Full cycle analysis
await analysisHandler.runFullCycleAnalysis(['USDJPY']);
```

### Broker Handler API
```javascript
// Place trade
const result = await brokerHandler.openOrder({
  symbol: 'USDJPY',
  orderType: 'BUY',
  volume: 0.01,
  sl: 150.00,
  tp: 151.00
});

// Monitor positions
const positions = await brokerHandler.getActivePositions();

// Close position
await brokerHandler.closePosition(ticket);
```

---

## 📊 Chart-Img API

### Get Chart Image
```http
GET https://chart-img.com/chart?symbol=USDJPY&timeframe=H1&width=800&height=600
```

### Supported Parameters
- **symbol**: Trading pair (USDJPY, USDCHF, GBPUSD)
- **timeframe**: M15, M30, H1, H4, D1
- **width**: Chart width (default: 800)
- **height**: Chart height (default: 600)
- **style**: Chart style (candlestick, line, bar)

---

## 🚨 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes
- **AUTH_FAILED**: Invalid API key
- **INVALID_SYMBOL**: Symbol not supported
- **MARKET_CLOSED**: Trading not allowed
- **INSUFFICIENT_MARGIN**: Not enough balance
- **INVALID_VOLUME**: Volume outside limits
- **ORDER_NOT_FOUND**: Order ticket not found
- **CONNECTION_ERROR**: MT5 connection failed

---

## 🔄 Rate Limiting

### Google AI API
- **Free Tier**: 15 requests per minute
- **Paid Tier**: 60 requests per minute
- **Daily Limit**: Check quota in Google AI Studio

### MT5 API
- **No specific limits**: Depends on broker
- **Recommended**: Max 10 requests per second
- **Best Practice**: Batch requests when possible

### Chart-Img API
- **Free Tier**: 100 requests per day
- **Paid Tier**: 1000+ requests per day
- **Rate Limit**: 5 requests per minute

---

## 📋 API Testing

### Test Scripts Available
```bash
# Test MT5 API connectivity
node test_mt5_api.js

# Test Chart-Img API
node test_chart_api.js

# Test all broker API endpoints
node test_all_broker_api.js

# Verify API compatibility
node verify_api_compatibility.js
```

### Manual Testing
```bash
# Test MT5 health
curl -H "X-API-Key: your_key" http://localhost:5000/api/health

# Test Google AI
curl -H "Authorization: Bearer $GOOGLE_AI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models

# Test WhatsApp
/health  # Send via WhatsApp
```

---

**[⬅️ Architecture](./ARCHITECTURE.md)** | **[➡️ Troubleshooting](./TROUBLESHOOTING.md)**
