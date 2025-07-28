# ⚙️ Configuration Guide

## 🔧 Environment Variables (.env)

### Core Settings
```env
# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# MetaTrader 5 API Configuration  
MT5_API_BASE_URL=http://localhost:5000
MT5_API_USERNAME=your_mt5_login
MT5_API_PASSWORD=your_mt5_password
MT5_API_SERVER=your_mt5_server

# Supported Trading Pairs (comma-separated)
SUPPORTED_PAIRS=USDJPY,USDCHF,GBPUSD

# News Analysis (optional)
ENABLE_NEWS_SEARCH=true

# Monitoring Settings
MONITORING_INTERVAL_MINUTES=30
```

### Stage 3 Schedule Configuration
```env
# Stage 3 Entry Confirmation Settings
STAGE3_INTERVAL_MINUTES=30      # Check every 30 minutes
STAGE3_START_HOUR=7             # Start at 07:00 UTC
STAGE3_END_HOUR=12              # End at 12:00 UTC
```

---

## 📁 Configuration Files

### 1. Bot Status (`config/bot_status.json`)
```json
{
  "isPaused": false,
  "lastUpdate": "2025-07-28T10:00:00Z",
  "activeAnalysis": true
}
```

### 2. Recipients List (`config/recipients.json`)
```json
[
  "6281234567890@s.whatsapp.net",
  "6289876543210@s.whatsapp.net"
]
```

### 3. API Key Status (`config/api_key_status.json`)
```json
{
  "google_ai": {
    "status": "active",
    "lastChecked": "2025-07-28T10:00:00Z",
    "requestsToday": 150,
    "dailyLimit": 1000
  },
  "mt5_api": {
    "status": "connected",
    "lastPing": "2025-07-28T10:00:00Z"
  }
}
```

### 4. Google Credentials (`config/google-credentials.json`)
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## 🎯 Trading Pairs Configuration

### Supported Pairs
- **USDJPY**: US Dollar / Japanese Yen
- **USDCHF**: US Dollar / Swiss Franc  
- **GBPUSD**: British Pound / US Dollar

### Adding New Pairs
1. Add pair to `SUPPORTED_PAIRS` in `.env`
2. Create context file in `daily_context/NEWPAIR.json`
3. Update prompts if needed

---

## ⏰ Schedule Configuration

### Default Schedule (UTC)
- **Stage 1**: 05:00 (Daily Bias)
- **Stage 2**: 06:30, 09:00 (Manipulation)
- **Stage 3**: 07:00-12:00 every 30min (Entry)
- **EOD**: 15:00 (Force Close)

### Custom Schedule
Modify cron expressions in `index.js`:
```javascript
// Example: Run Stage 1 at 04:00 UTC instead
cron.schedule('0 4 * * 1-5', async () => {
  // Stage 1 logic
});
```

---

## 🔒 Security Settings

### WhatsApp Security
- Hanya nomor terdaftar di `recipients.json` yang bisa menggunakan command
- QR Code regeneration setiap restart
- Automatic session validation

### API Security
- MT5 API dengan basic authentication
- Google API dengan service account
- Rate limiting pada API calls

---

## 📊 Monitoring Configuration

### Health Checks
- MT5 connection status
- Google AI API availability
- WhatsApp connection status
- Disk space monitoring

### Logging Levels
```env
# Available: error, warn, info, debug
LOG_LEVEL=info
```

---

## 🚨 Troubleshooting

### Common Issues
1. **MT5 Connection Failed**
   - Check MT5 terminal is running
   - Verify login credentials
   - Check firewall settings

2. **Google AI API Errors**
   - Verify API key is valid
   - Check daily quota usage
   - Ensure billing is enabled

3. **WhatsApp Connection Issues**
   - Clear browser cache
   - Regenerate QR code
   - Check phone internet connection

---

**[⬅️ Installation](./INSTALLATION.md)** | **[➡️ Commands](./COMMANDS.md)**
