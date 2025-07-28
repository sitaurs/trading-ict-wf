#!/bin/bash
# Quick deployment validation script for Pterodactyl

echo "🔍 ICT Bot v3.2.0 - Deployment Validation"
echo "=========================================="

# Test 1: Check if all critical files exist
echo "1. Checking critical files..."

FILES=(
    "index.js"
    "package.json"
    "modules/commandHandler.js"
    "modules/aiAssistant.js" 
    "modules/enhancedDashboard.js"
    "scripts/restart-handler.js"
    "config/recipients.json"
    "config/bot_status.json"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING!"
    fi
done

echo ""

# Test 2: Check if Node modules are available
echo "2. Checking key Node modules..."
node -e "
try {
    require('./modules/commandHandler');
    console.log('✅ commandHandler.js loads successfully');
} catch(e) {
    console.log('❌ commandHandler.js error:', e.message);
}

try {
    require('./modules/aiAssistant');
    console.log('✅ aiAssistant.js loads successfully');
} catch(e) {
    console.log('❌ aiAssistant.js error:', e.message);
}

try {
    require('./modules/enhancedDashboard');
    console.log('✅ enhancedDashboard.js loads successfully');
} catch(e) {
    console.log('❌ enhancedDashboard.js error:', e.message);
}

try {
    require('./scripts/restart-handler');
    console.log('✅ restart-handler.js loads successfully');
} catch(e) {
    console.log('❌ restart-handler.js error:', e.message);
}
"

echo ""

# Test 3: Check package.json validity
echo "3. Checking package.json..."
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    echo "✅ package.json is valid JSON"
else
    echo "❌ package.json is invalid JSON"
fi

echo ""

# Test 4: Environment check
echo "4. Environment variables check..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

if [ -f ".env" ]; then
    echo "✅ .env file exists"
    if grep -q "GEMINI_API_KEY" .env; then
        echo "✅ GEMINI_API_KEY found in .env"
    else
        echo "⚠️ GEMINI_API_KEY not found in .env"
    fi
else
    echo "⚠️ .env file not found"
fi

echo ""
echo "=========================================="
echo "🎯 Deployment validation complete!"
echo ""
echo "💡 If all critical files show ✅, the bot should start successfully"
echo "🚀 To start bot: npm start or node index.js"
echo "🆘 If errors persist, check the full error log"
