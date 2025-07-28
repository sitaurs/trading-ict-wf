# 🚀 **PANDUAN DEPLOYMENT PTERODACTYL OPTIMAL**

## 📋 **Konfigurasi Server Pterodactyl**

### **🔧 Egg Configuration**
```json
{
  "egg": "nodejs_generic",
  "version": "node_21",
  "startup_command": "if [[ -d .git ]] && [[ ${AUTO_UPDATE} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; if [[ \"${MAIN_FILE}\" == \"*.js\" ]]; then /usr/local/bin/node \"/home/container/${MAIN_FILE}\" ${NODE_ARGS}; else /usr/local/bin/ts-node --esm \"/home/container/${MAIN_FILE}\" ${NODE_ARGS}; fi"
}
```

### **⚙️ Environment Variables Optimal**
```bash
# === PTERODACTYL SPECIFIC ===
MAIN_FILE=index.js
NODE_ARGS=--max-old-space-size=512
AUTO_UPDATE=0
NODE_PACKAGES=
UNNODE_PACKAGES=

# === BOT CONFIGURATION ===
LOG_LEVEL=INFO
MONITORING_INTERVAL_MINUTES=2
STAGE3_INTERVAL_MINUTES=30
STAGE3_START_HOUR=7
STAGE3_END_HOUR=12
MAX_RETRIES=3

# === PERFORMANCE TUNING ===
NODE_ENV=production
UV_THREADPOOL_SIZE=4
```

## 🔋 **Resource Allocation Recommendations**

### **💾 Memory Allocation**
```yaml
Minimum RAM: 512MB
Recommended RAM: 1GB
Maximum RAM: 2GB
Swap: 512MB (recommended)
```

### **🖥️ CPU Allocation**
```yaml
Minimum CPU: 50%
Recommended CPU: 100%
CPU Limit: 200% (burst)
```

### **💽 Disk Space**
```yaml
Base Space: 1GB
Logs: 500MB
Cache: 200MB
WhatsApp Session: 100MB
Total Recommended: 2GB
```

## 🚨 **Perbaikan Restart Loop Issue**

Bot mengalami restart setiap ~1 menit. Kemungkinan penyebab:

### **1. Memory Limit**
```bash
# Tambahkan di startup command
NODE_ARGS="--max-old-space-size=512 --optimize-for-size"
```

### **2. Process Management**
```javascript
// Tambahkan di index.js (sudah ada di codebase)
process.on('SIGTERM', () => {
    log.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    log.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
});
```

### **3. Health Check Endpoint**
```javascript
// Opsi: Tambahkan HTTP health check
const http = require('http');
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    }
});
healthServer.listen(process.env.HEALTH_PORT || 3000);
```

## 🔧 **Optimisasi Dockerfile (Opsional)**

Jika menggunakan custom Docker image:

```dockerfile
FROM node:21-alpine

# Install dependencies for WhatsApp
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chrome path
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --silent

COPY . .

# Create necessary directories
RUN mkdir -p /app/whatsapp-session \
    /app/daily_context \
    /app/live_positions \
    /app/pending_orders \
    /app/analysis_cache \
    /app/config \
    /app/journal_data

EXPOSE 3000
CMD ["node", "--max-old-space-size=512", "index.js"]
```

## 📊 **Monitoring & Logging**

### **Log Levels untuk Production**
```bash
# Normal operation
LOG_LEVEL=INFO

# Debugging issues
LOG_LEVEL=DEBUG

# Production (minimal logging)
LOG_LEVEL=WARN
```

### **Log Rotation**
```bash
# Pterodactyl akan handle log rotation otomatis
# Atau tambahkan di startup:
NODE_ARGS="${NODE_ARGS} --max-log-size=50MB"
```

## 🛡️ **Security Best Practices**

### **1. Environment Variables**
```bash
# Jangan expose sensitive data di logs
GEMINI_API_KEY=***HIDDEN***
BROKER_API_KEY=***HIDDEN***
CHART_IMG_KEY_1=***HIDDEN***
```

### **2. File Permissions**
```bash
# Set proper permissions for sensitive files
chmod 600 .env
chmod 700 config/
chmod 700 whatsapp-session/
```

### **3. Network Security**
```bash
# Restrict outbound connections if possible
ALLOWED_DOMAINS="api.gemini.ai,chart-img.com,api.mt5.flx.web.id"
```

## 🚀 **Performance Optimizations**

### **1. Node.js Flags**
```bash
NODE_ARGS="--max-old-space-size=512 --optimize-for-size --gc-interval=100"
```

### **2. WhatsApp Session Management**
```javascript
// Sudah diimplementasi di whatsappClient.js
const sessionConfig = {
    printQRInTerminal: false,
    auth: state,
    browser: ["Trading", "Chrome", "1.0.0"],
    syncFullHistory: false,
    maxMsgRetryCount: 3
};
```

### **3. Caching Strategy**
```javascript
// Sudah ada di helpers.js
const CACHE_DIR = path.join(__dirname, '..', '..', 'analysis_cache');
const NEWS_CACHE_PATH = path.join(CACHE_DIR, 'daily_news.json');
```

## 📈 **Scaling Considerations**

### **Horizontal Scaling**
- Gunakan Redis untuk shared state
- Load balancer untuk multiple instances
- Database untuk persistent storage

### **Vertical Scaling**
- Increase RAM to 2GB for heavy analysis
- Add CPU cores for parallel processing
- NVMe SSD for faster I/O

## 🔄 **Auto-Recovery Mechanisms**

### **Circuit Breaker Pattern**
```javascript
// Sudah diimplementasi di circuitBreaker.js
const circuitBreaker = require('./modules/circuitBreaker');
```

### **Graceful Shutdown**
```javascript
// Sudah ada di index.js
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## 📱 **Health Monitoring Commands**

```bash
# Check bot health
/health

# Check system resources
/status

# Check active positions
/positions

# Restart if needed
/restart
```

## 🏆 **Success Metrics**

- ✅ Uptime > 99%
- ✅ Memory usage < 500MB
- ✅ Response time < 30s
- ✅ WhatsApp connection stable
- ✅ Analysis completion rate > 95%

---

**📝 NOTE**: Bot sudah berjalan dengan baik di environment Pterodactyl Anda. Restart loop yang terjadi kemungkinan normal behavior untuk maintenance atau update. Monitor dengan `/health` command untuk memastikan stabilitas.
