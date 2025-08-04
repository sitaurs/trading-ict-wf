# 🔄 Multiple Gemini API Keys - Setup & Usage Guide

## 📋 **Overview**

Bot ICT sudah mendukung **multiple Gemini API keys** yang akan digunakan secara **berurutan (round-robin)** untuk:
- ✅ Menghindari rate limiting
- ✅ Meningkatkan reliability 
- ✅ Distribusi beban API requests
- ✅ Backup otomatis jika satu key bermasalah

## 🚀 **Quick Setup**

### 1. **Format di .env**
```env
# === GOOGLE GEMINI (AI ANALISIS) ===
# Multiple API Keys untuk rotasi otomatis
GEMINI_API_KEY_1="AIzaSyBnxBIPvM5MNZuMiuqhQ5ZfhIVKkLUm_3Y"
GEMINI_API_KEY_2="AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GEMINI_API_KEY_3="AIzaSyByyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
GEMINI_API_KEY_4="AIzaSyBzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
# Tambahkan sampai GEMINI_API_KEY_N sesuai kebutuhan

# Legacy single key (fallback jika tidak ada GEMINI_API_KEY_1)
GEMINI_API_KEY="AIzaSyBnxBIPvM5MNZuMiuqhQ5ZfhIVKkLUm_3Y"
```

### 2. **Tambah API Key Baru (Otomatis)**
```bash
# Tambah key ke-2
node scripts/add_gemini_api_key.js "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Tambah key ke-3  
node scripts/add_gemini_api_key.js "AIzaSyByyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"

# Dan seterusnya...
```

### 3. **Cek Status API Keys**
```bash
# Lihat semua keys yang tersedia
node scripts/check_gemini_api_status.js

# Test rotasi keys
node scripts/check_gemini_api_status.js --test
```

## 🔧 **How It Works**

### **Automatic Rotation System**
```javascript
// Bot otomatis menggunakan keys secara berurutan:
Request 1: GEMINI_API_KEY_1
Request 2: GEMINI_API_KEY_2  
Request 3: GEMINI_API_KEY_3
Request 4: GEMINI_API_KEY_1  // Kembali ke awal
Request 5: GEMINI_API_KEY_2
// dst...
```

### **Fallback Logic**
```javascript
// Prioritas penggunaan:
1. GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... (multiple keys)
2. GEMINI_API_KEY (single legacy key)
3. Error jika tidak ada keys
```

### **Persistent State**
- Index rotasi disimpan di: `config/api_key_status.json`
- Bot mengingat key terakhir yang digunakan
- Restart bot tidak reset rotasi

## 📊 **Implementation Details**

### **Modules yang Menggunakan Rotation**
- ✅ `analysisHandler.js` - Main Gemini Pro analysis
- ✅ `extractorStage1.js` - Stage 1 data extraction  
- ✅ `extractorStage2.js` - Stage 2 data extraction
- ✅ `extractorStage3.js` - Stage 3 data extraction
- ✅ `aiAssistant.js` - AI Assistant chat

### **API Usage Distribution**
```javascript
// Tipikal usage per hari:
Stage 1 Analysis: ~3-5 requests   (Gemini Pro 2.5)
Stage 2 Analysis: ~2-3 requests   (Gemini Pro 2.5)
Stage 3 Analysis: ~8-12 requests  (Gemini Pro 2.5)
Data Extraction: ~15-20 requests  (Gemini Flash)
AI Assistant: ~5-15 requests      (Gemini Pro 2.5)

Total: ~35-55 requests/day per key
```

## 🛠️ **Management Commands**

### **Add New API Key**
```bash
# Menambahkan API key baru secara otomatis
node scripts/add_gemini_api_key.js "YOUR_NEW_API_KEY"

# Output:
# ✅ Berhasil menambahkan Gemini API Key baru!
# 📝 GEMINI_API_KEY_4 telah ditambahkan ke .env
# 🔄 Total API Keys sekarang: 4
```

### **Check API Status**
```bash
# Melihat status semua API keys
node scripts/check_gemini_api_status.js

# Output:
# 📊 GEMINI API KEYS STATUS
# 🔑 Total Multiple API Keys: 3
# 🔄 Legacy Single Key: Available
# 
# 📝 MULTIPLE API KEYS:
#    GEMINI_API_KEY_1: AIzaSyBnxB...m_3Y
#    GEMINI_API_KEY_2: AIzaSyBxxx...xxxx
#    GEMINI_API_KEY_3: AIzaSyByyy...yyyy
```

### **Test Key Rotation**
```bash
# Test rotasi untuk memastikan berfungsi
node scripts/check_gemini_api_status.js --test

# Output:
# 🧪 TESTING KEY ROTATION
# 📊 Total keys available: 3
# 🔄 Testing rotation:
#    Request 1: AIzaSyBnxB...m_3Y
#    Request 2: AIzaSyBxxx...xxxx  
#    Request 3: AIzaSyByyy...yyyy
#    Request 4: AIzaSyBnxB...m_3Y
```

## ⚡ **Best Practices**

### **Recommended Setup**
- 🎯 **3-5 API keys** optimal untuk trading bot
- 🔄 **Different Google accounts** untuk setiap key
- 📊 **Monitor quota usage** via Google AI Studio
- 🚀 **Add keys gradually** sesuai kebutuhan

### **Key Management**
```bash
# Setup workflow:
1. Buat Google AI Studio account baru
2. Generate API key baru
3. Add ke bot: node scripts/add_gemini_api_key.js "KEY"
4. Verify: node scripts/check_gemini_api_status.js
5. Restart bot untuk apply changes
```

### **Monitoring & Troubleshooting**
```bash
# Check log untuk rotasi:
grep "Menggunakan Gemini API Key index" logs/bot.log

# Monitor API usage:
# - Google AI Studio → Usage & billing
# - Lihat distribusi requests per key
# - Set alerts untuk quota limits
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Issue: Only using first key**
```
Symptom: Log shows same key index repeatedly
Solution: 
1. Check file permissions pada config/api_key_status.json
2. Restart bot completely
3. Verify .env format sesuai contoh di atas
```

#### **Issue: Fallback to legacy key**
```
Symptom: Log shows "Menggunakan GEMINI_API_KEY tunggal (fallback mode)"
Solution:
1. Ensure GEMINI_API_KEY_1 exists di .env
2. Check key format (no extra spaces/quotes)
3. Restart bot after .env changes
```

#### **Issue: API key rotation not saved**
```
Symptom: Rotation resets after restart
Solution:
1. Check config/ directory exists dan writable
2. Verify config/api_key_status.json permissions
3. Check disk space
```

## 📈 **Performance Benefits**

### **Rate Limiting Mitigation**
- ✅ **3x capacity** dengan 3 keys vs 1 key
- ✅ **Distributed load** mengurangi 429 errors
- ✅ **Better uptime** jika satu key bermasalah

### **Cost Distribution**
- ✅ **Spread costs** across multiple accounts
- ✅ **Better quota management** per key
- ✅ **Easier scaling** saat volume meningkat

### **Reliability Improvements**
- ✅ **Automatic failover** ke key berikutnya
- ✅ **No single point of failure**
- ✅ **Graceful degradation** jika ada masalah

## 🔗 **Related Documentation**

- [API Configuration](docs/API.md#google-ai-api)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md#google-ai-api-issues)
- [Architecture Overview](docs/ARCHITECTURE.md#ai-integration)

---

**💡 Need Help?**
- 📧 Check logs untuk error details
- 🔧 Run status check scripts
- 📖 Refer ke troubleshooting section
- 🚀 Contact support untuk advanced issues
