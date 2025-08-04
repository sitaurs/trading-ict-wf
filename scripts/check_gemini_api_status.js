/**
 * 📊 Script untuk melihat status Gemini API Keys
 * Usage: node scripts/check_gemini_api_status.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const envPath = path.join(__dirname, '..', '.env');
const statusPath = path.join(__dirname, '..', 'config', 'api_key_status.json');

function checkGeminiApiStatus() {
    console.log('📊 GEMINI API KEYS STATUS');
    console.log('='.repeat(50));
    
    try {
        // Detect all Gemini API keys
        const geminiKeys = [];
        let idx = 1;
        
        while (process.env[`GEMINI_API_KEY_${idx}`]) {
            geminiKeys.push({
                index: idx,
                key: process.env[`GEMINI_API_KEY_${idx}`],
                masked: process.env[`GEMINI_API_KEY_${idx}`].substring(0, 10) + '...' + 
                       process.env[`GEMINI_API_KEY_${idx}`].substring(process.env[`GEMINI_API_KEY_${idx}`].length - 4)
            });
            idx++;
        }
        
        // Check legacy single key
        const legacyKey = process.env.GEMINI_API_KEY;
        
        console.log(`🔑 Total Multiple API Keys: ${geminiKeys.length}`);
        console.log(`🔄 Legacy Single Key: ${legacyKey ? 'Available' : 'Not Set'}`);
        console.log('');
        
        if (geminiKeys.length > 0) {
            console.log('📝 MULTIPLE API KEYS:');
            geminiKeys.forEach(item => {
                console.log(`   GEMINI_API_KEY_${item.index}: ${item.masked}`);
            });
        } else {
            console.log('⚠️  No multiple API keys found (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)');
        }
        
        console.log('');
        
        if (legacyKey) {
            const maskedLegacy = legacyKey.substring(0, 10) + '...' + legacyKey.substring(legacyKey.length - 4);
            console.log(`🔑 LEGACY KEY: ${maskedLegacy}`);
        }
        
        // Check current rotation status
        try {
            if (fs.existsSync(statusPath)) {
                const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
                console.log('');
                console.log('🔄 ROTATION STATUS:');
                console.log(`   Current Gemini Index: ${status.geminiKeyIndex || 0}`);
                console.log(`   Current Chart Index: ${status.chartImgKeyIndex || 0}`);
                
                if (geminiKeys.length > 0) {
                    const currentGeminiKey = geminiKeys.find(k => k.index === (status.geminiKeyIndex || 0) + 1);
                    if (currentGeminiKey) {
                        console.log(`   Next Gemini Key: GEMINI_API_KEY_${currentGeminiKey.index}`);
                    }
                }
            } else {
                console.log('');
                console.log('🔄 ROTATION STATUS: Not initialized (will start from index 0)');
            }
        } catch (error) {
            console.log('');
            console.log('⚠️  Cannot read rotation status:', error.message);
        }
        
        console.log('');
        console.log('💡 IMPLEMENTATION STATUS:');
        
        if (geminiKeys.length > 1) {
            console.log('✅ Multiple API keys configured and ready for rotation');
            console.log('✅ Bot will automatically rotate between keys');
            console.log('✅ Reduces rate limiting and improves reliability');
        } else if (geminiKeys.length === 1) {
            console.log('⚠️  Only one API key configured');
            console.log('💡 Add more keys with: node scripts/add_gemini_api_key.js "YOUR_KEY"');
        } else if (legacyKey) {
            console.log('⚠️  Using legacy single key mode');
            console.log('💡 Migrate to multiple keys by adding GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.');
        } else {
            console.log('❌ No Gemini API keys configured!');
            console.log('💡 Add keys with: node scripts/add_gemini_api_key.js "YOUR_KEY"');
        }
        
        console.log('');
        console.log('🚀 USAGE TIPS:');
        console.log('• Bot automatically rotates keys on each request');
        console.log('• All analysis modules use the rotation system');
        console.log('• Keys are saved in config/api_key_status.json');
        console.log('• Add more keys anytime without restart');
        
    } catch (error) {
        console.error('❌ Error checking API status:', error.message);
        process.exit(1);
    }
}

function testKeyRotation() {
    console.log('🧪 TESTING KEY ROTATION');
    console.log('='.repeat(30));
    
    try {
        const { getAllGeminiKeys, getNextGeminiKey } = require('../modules/analysis/helpers');
        
        const allKeys = getAllGeminiKeys();
        console.log(`📊 Total keys available: ${allKeys.length}`);
        
        console.log('\n🔄 Testing rotation:');
        for (let i = 0; i < Math.min(5, allKeys.length * 2); i++) {
            const key = getNextGeminiKey();
            const masked = key.substring(0, 10) + '...' + key.substring(key.length - 4);
            console.log(`   Request ${i + 1}: ${masked}`);
        }
        
        console.log('\n✅ Key rotation test completed');
        
    } catch (error) {
        console.error('❌ Key rotation test failed:', error.message);
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--test') || args.includes('-t')) {
        checkGeminiApiStatus();
        console.log('');
        testKeyRotation();
    } else {
        checkGeminiApiStatus();
        
        console.log('');
        console.log('🔧 ADDITIONAL COMMANDS:');
        console.log('  node scripts/check_gemini_api_status.js --test    # Test key rotation');
        console.log('  node scripts/add_gemini_api_key.js "KEY"         # Add new key');
    }
}

module.exports = { checkGeminiApiStatus, testKeyRotation };
