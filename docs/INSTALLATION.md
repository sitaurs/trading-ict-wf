# 📋 Installation Guide

## 🛠️ Prerequisites

### System Requirements
- **Node.js** >= 16.0.0
- **Python** >= 3.8
- **MetaTrader 5** terminal
- **WhatsApp** account
- **Google Account** (untuk API)

---

## 📦 Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/sitaurs/trading-ict-wf.git
cd trading-ict-wf/ICT
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Install Python Dependencies
```bash
cd "python api mt5"
pip install -r requirements.txt
```

### 4. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env file with your configuration
```

---

## 🔑 API Keys Setup

### Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Add to `.env`: `GOOGLE_AI_API_KEY=your_key_here`

### Google Sheets API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Sheets API
4. Create Service Account
5. Download JSON credentials
6. Save as `config/google-credentials.json`

### MetaTrader 5 Setup
1. Install MetaTrader 5
2. Enable Expert Advisors
3. Configure API access
4. Set MT5 credentials in `.env`

---

## ✅ Verification

### Test Installation
```bash
# Test Node.js setup
node -e "console.log('Node.js OK')"

# Test Python setup
cd "python api mt5"
python app.py --test

# Test MT5 connection
node test_mt5_api.js
```

---

## 🚀 First Run

1. **Start MT5 API Server**:
   ```bash
   cd "python api mt5"
   python app.py
   ```

2. **Start ICT Bot**:
   ```bash
   node index.js
   ```

3. **Scan QR Code** with WhatsApp

4. **Test Commands**:
   ```
   /icthelp - Show command menu
   /ictstatus - Check bot status
   ```

---

## 📱 Next Steps

- **[⚙️ Configuration](./CONFIGURATION.md)** - Configure bot settings
- **[📱 Commands](./COMMANDS.md)** - Learn WhatsApp commands
- **[📈 Strategy](./STRATEGY.md)** - Understand trading strategy

---

**[⬅️ Back to Main](../README.md)** | **[➡️ Configuration](./CONFIGURATION.md)**
