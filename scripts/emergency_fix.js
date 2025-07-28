/**
 * 🚨 Emergency Deployment Fix for Pterodactyl
 * Quick validation untuk memastikan bot dapat start
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 ICT Bot v3.2.0 - Emergency Deployment Fix');
console.log('===============================================');

// Test 1: Critical file existence
console.log('\n1. Checking critical files...');

const criticalFiles = [
    'index.js',
    'package.json', 
    'modules/commandHandler.js',
    'modules/aiAssistant.js',
    'modules/enhancedDashboard.js',
    'scripts/restart-handler.js'
];

let allFilesExist = true;

criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING!`);
        allFilesExist = false;
    }
});

// Test 2: Module loading
console.log('\n2. Testing module imports...');

try {
    require('../modules/commandHandler');
    console.log('✅ commandHandler loads successfully');
} catch(e) {
    console.log(`❌ commandHandler error: ${e.message}`);
    allFilesExist = false;
}

try {
    require('../modules/aiAssistant');
    console.log('✅ aiAssistant loads successfully');
} catch(e) {
    console.log(`❌ aiAssistant error: ${e.message}`);
    allFilesExist = false;
}

try {
    require('../modules/enhancedDashboard'); 
    console.log('✅ enhancedDashboard loads successfully');
} catch(e) {
    console.log(`❌ enhancedDashboard error: ${e.message}`);
    allFilesExist = false;
}

try {
    require('./restart-handler');
    console.log('✅ restart-handler loads successfully');
} catch(e) {
    console.log(`❌ restart-handler error: ${e.message}`);
    allFilesExist = false;
}

// Test 3: Package.json validation
console.log('\n3. Package.json validation...');
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Package.json valid - Version: ${pkg.version}`);
} catch(e) {
    console.log(`❌ Package.json error: ${e.message}`);
    allFilesExist = false;
}

// Test 4: Config directories
console.log('\n4. Config directory check...');
const configDirs = ['config', 'modules', 'scripts', 'tests', 'docs'];

configDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}/ directory exists`);
    } else {
        console.log(`❌ ${dir}/ directory missing`);
        allFilesExist = false;
    }
});

// Test 5: Essential config files
console.log('\n5. Essential config files...');
const configFiles = [
    'config/recipients.json',
    'config/bot_status.json'
];

configFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`⚠️ ${file} - Will be created automatically`);
        
        // Create missing config files
        if (file === 'config/recipients.json') {
            const recipients = [];
            fs.writeFileSync(file, JSON.stringify(recipients, null, 2));
            console.log(`📝 Created empty ${file}`);
        }
        
        if (file === 'config/bot_status.json') {
            const status = {
                isPaused: false,
                sessionEnabled: true,
                filterEnabled: true,
                isNewsEnabled: true,
                lastUpdate: new Date().toISOString()
            };
            fs.writeFileSync(file, JSON.stringify(status, null, 2));
            console.log(`📝 Created default ${file}`);
        }
    }
});

// Final result
console.log('\n===============================================');

if (allFilesExist) {
    console.log('🎉 SUCCESS! All critical components are ready');
    console.log('✅ Bot should start successfully now');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Ensure GEMINI_API_KEY is set in .env');
    console.log('2. Start bot with: node index.js');
    console.log('3. Test new commands: /ask, /ictdash, /ictmenu');
} else {
    console.log('❌ ERRORS DETECTED! Please fix the issues above');
    console.log('');
    console.log('🔧 Common fixes:');
    console.log('1. Run: git pull (to get latest files)');
    console.log('2. Run: npm install (to install dependencies)');
    console.log('3. Check file permissions');
}

console.log('===============================================');
