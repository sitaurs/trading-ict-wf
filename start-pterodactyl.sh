#!/bin/bash

# 🚀 **PTERODACTYL STARTUP SCRIPT OPTIMAL**
# Script khusus untuk deployment bot trading di Pterodactyl Panel

echo "🔧 Starting Trading Bot with Pterodactyl optimizations..."

# === ENVIRONMENT SETUP ===
export NODE_ENV=production
export UV_THREADPOOL_SIZE=4

# Memory optimization untuk Node.js 21
export NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size --gc-interval=100"

# === PTERODACTYL SPECIFIC ===
echo "📊 Environment Info:"
echo "  - Node.js Version: $(node --version)"
echo "  - Platform: $(uname -s)"
echo "  - Architecture: $(uname -m)"
echo "  - Available Memory: $(free -h | grep '^Mem:' | awk '{print $2}') (if available)"
echo "  - Container ID: ${P_SERVER_UUID:-'Unknown'}"

# === HEALTH CHECK SETUP ===
echo "🏥 Setting up health monitoring..."

# Create monitoring directories
mkdir -p logs
mkdir -p temp

# Health check endpoint (background process)
cat > health_server.js << 'EOF'
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        const health = {
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
            pid: process.pid
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
    } else if (req.url === '/metrics') {
        try {
            const metrics = fs.readFileSync('metrics.json', 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(metrics);
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({error: 'Metrics not available'}));
        }
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const port = process.env.HEALTH_PORT || 3000;
server.listen(port, () => {
    console.log(`🏥 Health server running on port ${port}`);
});
EOF

# Start health server in background
node health_server.js &
HEALTH_PID=$!
echo "🏥 Health server started (PID: $HEALTH_PID)"

# === DEPENDENCY CHECK ===
echo "📦 Checking dependencies..."

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found - using environment variables"
else
    echo "✅ .env file found"
fi

# === NPM DEPENDENCIES ===
echo "📦 Installing/updating dependencies..."
npm ci --only=production --silent --prefer-offline

if [ $? -ne 0 ]; then
    echo "❌ NPM install failed, trying npm install..."
    npm install --only=production --silent
fi

# === DIRECTORY SETUP ===
echo "📁 Setting up required directories..."
mkdir -p whatsapp-session
mkdir -p daily_context
mkdir -p live_positions
mkdir -p pending_orders
mkdir -p analysis_cache
mkdir -p journal_data
mkdir -p config
mkdir -p logs

# Set permissions
chmod 755 whatsapp-session daily_context live_positions pending_orders analysis_cache journal_data config logs
chmod 600 .env 2>/dev/null || echo "⚠️ No .env file to secure"

# === PERFORMANCE MONITORING ===
echo "📊 Starting performance monitoring..."

# Background monitoring script
cat > monitor_performance.sh << 'EOF'
#!/bin/bash
while true; do
    echo "$(date): Memory: $(ps -o pid,vsz,rss,comm -p $1 | tail -1)" >> logs/performance.log
    sleep 60
done
EOF

chmod +x monitor_performance.sh

# === GRACEFUL SHUTDOWN SETUP ===
cleanup() {
    echo "🛡️ Graceful shutdown initiated..."
    kill $HEALTH_PID 2>/dev/null
    kill $MONITOR_PID 2>/dev/null
    if [ ! -z "$BOT_PID" ]; then
        kill -TERM $BOT_PID
        wait $BOT_PID
    fi
    echo "✅ Shutdown complete"
    exit 0
}

trap cleanup SIGTERM SIGINT

# === PRE-FLIGHT CHECKS ===
echo "🔍 Running pre-flight checks..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "⚠️ Node.js version $NODE_VERSION detected, recommend 18+ for optimal performance"
fi

# Check available memory
if command -v free >/dev/null 2>&1; then
    AVAILABLE_MB=$(free -m | grep '^Mem:' | awk '{print $7}')
    if [ "$AVAILABLE_MB" -lt 256 ]; then
        echo "⚠️ Low available memory: ${AVAILABLE_MB}MB"
    fi
fi

# === RESTART PROTECTION ===
echo "🔄 Setting up restart protection..."
RESTART_COUNT_FILE=".restart_count"
MAX_RESTARTS=5
RESTART_WINDOW=300 # 5 minutes

if [ -f "$RESTART_COUNT_FILE" ]; then
    LAST_RESTART=$(stat -c %Y "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_RESTART))
    
    if [ $TIME_DIFF -lt $RESTART_WINDOW ]; then
        RESTART_COUNT=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)
        RESTART_COUNT=$((RESTART_COUNT + 1))
        echo "$RESTART_COUNT" > "$RESTART_COUNT_FILE"
        
        if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
            DELAY=$((RESTART_COUNT * 30))
            echo "🚨 Restart loop detected ($RESTART_COUNT restarts). Implementing ${DELAY}s delay..."
            sleep $DELAY
        fi
    else
        echo "1" > "$RESTART_COUNT_FILE"
    fi
else
    echo "1" > "$RESTART_COUNT_FILE"
fi

# === MAIN APPLICATION START ===
echo "🚀 Starting main application..."
echo "  - Memory limit: 512MB"
echo "  - GC optimization: enabled"
echo "  - Production mode: enabled"

# Start performance monitoring in background
./monitor_performance.sh $$ &
MONITOR_PID=$!

# Start the main application
node index.js &
BOT_PID=$!

echo "🤖 Bot started (PID: $BOT_PID)"
echo "🏥 Health endpoint: http://localhost:${HEALTH_PORT:-3000}/health"
echo "📊 Metrics endpoint: http://localhost:${HEALTH_PORT:-3000}/metrics"

# Wait for main process
wait $BOT_PID
BOT_EXIT_CODE=$?

# Cleanup
cleanup

exit $BOT_EXIT_CODE
