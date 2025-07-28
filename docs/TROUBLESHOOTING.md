# 🔧 Troubleshooting Guide

## 🚨 Common Issues & Solutions

### 1. WhatsApp Connection Issues

#### Problem: QR Code tidak muncul
**Solution:**
```bash
# Clear WhatsApp session
rm -rf .wwebjs_auth/
node index.js
```

#### Problem: WhatsApp disconnected frequently
**Solution:**
```bash
# Check internet connection
ping google.com

# Restart with fresh session
rm -rf .wwebjs_auth/
node index.js
```

---

### 2. MetaTrader 5 API Issues

#### Problem: MT5 API connection failed
**Solution:**
```bash
# Check MT5 terminal is running
ps aux | grep MetaTrader

# Test API connection
node test_mt5_api.js

# Check Python API status
cd "python api mt5"
python app.py --test
```

#### Problem: Order execution failed
**Solution:**
```bash
# Check account balance
curl -H "X-API-Key: your_key" http://localhost:5000/api/account_info

# Verify symbol availability
curl -H "X-API-Key: your_key" http://localhost:5000/api/symbols

# Check market status
curl -H "X-API-Key: your_key" http://localhost:5000/api/market_status
```

---

### 3. Google AI API Issues

#### Problem: API quota exceeded
**Solution:**
1. Check quota usage di Google AI Studio
2. Upgrade plan atau tunggu reset harian
3. Reduce analysis frequency in `.env`:
   ```env
   STAGE3_INTERVAL_MINUTES=60  # Increase from 30 to 60
   ```

#### Problem: Invalid API key
**Solution:**
```bash
# Verify API key format
echo $GOOGLE_AI_API_KEY

# Test API key
curl -H "Authorization: Bearer $GOOGLE_AI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
```

---

### 4. Configuration Issues

#### Problem: Environment variables not loaded
**Solution:**
```bash
# Check .env file exists
ls -la .env

# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env.GOOGLE_AI_API_KEY)"

# Copy from example if missing
cp .env.example .env
```

#### Problem: Config files not found
**Solution:**
```bash
# Check config directory
ls -la config/

# Create missing config files
mkdir -p config
echo '[]' > config/recipients.json
echo '{"isPaused": false}' > config/bot_status.json
```

---

### 5. Node.js & Dependencies Issues

#### Problem: Module not found errors
**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for version conflicts
npm audit
npm audit fix
```

#### Problem: Memory issues
**Solution:**
```bash
# Increase Node.js memory
node --max-old-space-size=2048 index.js

# Monitor memory usage
node -e "setInterval(() => console.log(process.memoryUsage()), 5000)"
```

---

## 🔍 Diagnostic Commands

### System Health Check
```bash
# Overall health status
/health

# Check individual components
node -e "
const { exec } = require('child_process');
exec('node test_mt5_api.js && echo MT5 OK', console.log);
exec('node test_chart_api.js && echo Chart OK', console.log);
"
```

### Log Analysis
```bash
# View recent logs
tail -f logs/app.log

# Search for errors
grep "ERROR" logs/app.log | tail -20

# Search for specific issues
grep -i "connection\|timeout\|failed" logs/app.log
```

### Performance Monitoring
```bash
# Check CPU usage
top -p $(pgrep node)

# Check disk usage
df -h

# Check network connections
netstat -tulpn | grep node
```

---

## 📊 Error Code Reference

### WhatsApp Errors
- **WA001**: QR Code generation failed
- **WA002**: Authentication failed
- **WA003**: Message sending failed
- **WA004**: Session expired

### MT5 API Errors
- **MT001**: Connection timeout
- **MT002**: Invalid credentials
- **MT003**: Order execution failed
- **MT004**: Insufficient margin
- **MT005**: Market closed

### Google AI Errors
- **AI001**: Quota exceeded
- **AI002**: Invalid request format
- **AI003**: Model not available
- **AI004**: Content filtering triggered

---

## 🛠️ Advanced Debugging

### Enable Debug Mode
```env
# Add to .env file
LOG_LEVEL=debug
DEBUG_MODE=true
VERBOSE_LOGGING=true
```

### Test Individual Components
```bash
# Test WhatsApp only
node -e "require('./modules/whatsappClient').startWhatsAppClient()"

# Test AI analysis only
node -e "require('./modules/analysisHandler').runStage1Analysis(['USDJPY'])"

# Test MT5 connection only
node test_mt5_api.js
```

### Manual Command Testing
```bash
# Test commands via WhatsApp
/health          # System health
/ictstatus       # Bot status
/positions       # Check positions
/clearcache     # Clear cache
```

---

## 🚨 Emergency Procedures

### Stop All Trading
```bash
# Emergency stop
/ictpause        # Pause all analysis
/forceeod       # Close all positions
/restart        # Restart system
```

### Reset Bot State
```bash
# Clear all cache and state
rm -rf analysis_cache/*
rm -rf daily_context/*
rm -rf pending_orders/*

# Reset configuration
echo '{"isPaused": false}' > config/bot_status.json

# Restart bot
node index.js
```

### Backup Important Data
```bash
# Create backup
tar -czf backup_$(date +%Y%m%d).tar.gz \
    config/ daily_context/ analysis_cache/ logs/

# Restore from backup
tar -xzf backup_20250128.tar.gz
```

---

## 📞 Getting Help

### Before Reporting Issues
1. ✅ Check this troubleshooting guide
2. ✅ Review logs for error messages
3. ✅ Test individual components
4. ✅ Verify configuration

### When Reporting Issues
Include the following information:
- **OS & Node.js version**: `node --version`
- **Error messages**: Copy exact error text
- **Log files**: Recent log entries
- **Configuration**: Sanitized .env values
- **Steps to reproduce**: Exact steps taken

### Support Channels
- **GitHub Issues**: [Create new issue](https://github.com/sitaurs/trading-ict-wf/issues/new)
- **GitHub Discussions**: [Ask questions](https://github.com/sitaurs/trading-ict-wf/discussions)
- **Wiki**: [Check documentation](https://github.com/sitaurs/trading-ict-wf/wiki)

---

**[⬅️ Architecture](./ARCHITECTURE.md)** | **[➡️ API Reference](./API.md)**
