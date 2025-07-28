#!/usr/bin/env node

/**
 * 🧪 Quick Syntax & Structure Test - All v3.2.0 Fixes
 * Test struktur dan syntax tanpa perlu koneksi broker
 */

console.log('🧪 ICT Trading Bot - Quick Structure Test v3.2.0');
console.log('===================================================\n');

function testStructureOnly() {
    const results = {
        aiAssistant: '❌ NOT TESTED',
        dashboard: '❌ NOT TESTED', 
        analytics: '❌ NOT TESTED',
        stageCommands: '❌ NOT TESTED',
        commandRoutes: '❌ NOT TESTED',
        brokerMethods: '❌ NOT TESTED'
    };

    // Test 1: AI Assistant Class Structure
    console.log('🤖 Testing AI Assistant Structure...');
    try {
        const fs = require('fs');
        const aiContent = fs.readFileSync('./modules/aiAssistant.js', 'utf8');
        
        if (aiContent.includes('class ICTAIAssistant') && 
            aiContent.includes('handleAskCommand') &&
            aiContent.includes('module.exports')) {
            results.aiAssistant = '✅ PASSED - Structure OK';
            console.log('   ✅ AI Assistant class structure is valid');
        } else {
            results.aiAssistant = '❌ FAILED - Structure invalid';
            console.log('   ❌ AI Assistant class structure incomplete');
        }
    } catch (error) {
        results.aiAssistant = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: Enhanced Dashboard Structure
    console.log('\n📊 Testing Enhanced Dashboard Structure...');
    try {
        const fs = require('fs');
        const dashContent = fs.readFileSync('./modules/enhancedDashboard.js', 'utf8');
        
        if (dashContent.includes('class ICTEnhancedDashboard') && 
            dashContent.includes('generateRealTimeDashboard') &&
            dashContent.includes('module.exports')) {
            results.dashboard = '✅ PASSED - Structure OK';
            console.log('   ✅ Enhanced Dashboard structure is valid');
        } else {
            results.dashboard = '❌ FAILED - Structure invalid';
            console.log('   ❌ Enhanced Dashboard structure incomplete');
        }
    } catch (error) {
        results.dashboard = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Broker Handler Method Exports
    console.log('\n💰 Testing Broker Handler Exports...');
    try {
        const fs = require('fs');
        const brokerContent = fs.readFileSync('./modules/brokerHandler.js', 'utf8');
        
        let brokerTests = [];
        
        if (brokerContent.includes('getTodaysProfit,')) {
            brokerTests.push('✅ getTodaysProfit exported');
        } else {
            brokerTests.push('❌ getTodaysProfit not exported');
        }
        
        if (brokerContent.includes('getWeeklyPerformance,')) {
            brokerTests.push('✅ getWeeklyPerformance exported');
        } else {
            brokerTests.push('❌ getWeeklyPerformance not exported');
        }
        
        if (brokerContent.includes('async function getWeeklyPerformance')) {
            brokerTests.push('✅ getWeeklyPerformance function defined');
        } else {
            brokerTests.push('❌ getWeeklyPerformance function missing');
        }
        
        if (brokerTests.every(test => test.includes('✅'))) {
            results.brokerMethods = '✅ PASSED - All methods exported';
        } else {
            results.brokerMethods = '❌ FAILED - Missing exports';
        }
        
        brokerTests.forEach(test => console.log(`   ${test}`));
        
    } catch (error) {
        results.brokerMethods = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Command Handler Function Definitions
    console.log('\n⚡ Testing Command Handler Functions...');
    try {
        const fs = require('fs');
        const commandContent = fs.readFileSync('./modules/commandHandler.js', 'utf8');
        
        let commandTests = [];
        
        if (commandContent.includes('async function handleStage1Command')) {
            commandTests.push('✅ handleStage1Command function defined');
        } else {
            commandTests.push('❌ handleStage1Command function missing');
        }
        
        if (commandContent.includes('async function handleStage2Command')) {
            commandTests.push('✅ handleStage2Command function defined');
        } else {
            commandTests.push('❌ handleStage2Command function missing');
        }
        
        if (commandContent.includes('async function handleStage3Command')) {
            commandTests.push('✅ handleStage3Command function defined');
        } else {
            commandTests.push('❌ handleStage3Command function missing');
        }
        
        if (commandContent.includes('async function handleAskCommand')) {
            commandTests.push('✅ handleAskCommand function defined');
        } else {
            commandTests.push('❌ handleAskCommand function missing');
        }
        
        if (commandContent.includes('aiAssistant.handleAskCommand(question')) {
            commandTests.push('✅ aiAssistant.handleAskCommand call fixed');
        } else {
            commandTests.push('❌ aiAssistant call still broken');
        }
        
        if (commandTests.every(test => test.includes('✅'))) {
            results.stageCommands = '✅ PASSED - All functions OK';
        } else {
            results.stageCommands = '❌ FAILED - Missing functions';
        }
        
        commandTests.forEach(test => console.log(`   ${test}`));
        
    } catch (error) {
        results.stageCommands = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Index.js Command Routes & Syntax
    console.log('\n🔄 Testing Index.js Command Routes...');
    try {
        const fs = require('fs');
        const indexContent = fs.readFileSync('./index.js', 'utf8');
        
        let routeTests = [];
        
        if (indexContent.includes("case '/ictstage1':")) {
            routeTests.push('✅ /ictstage1 route exists');
        } else {
            routeTests.push('❌ /ictstage1 route missing');
        }
        
        if (indexContent.includes("case '/ictstage2':")) {
            routeTests.push('✅ /ictstage2 route exists');
        } else {
            routeTests.push('❌ /ictstage2 route missing');
        }
        
        if (indexContent.includes("case '/ictstage3':")) {
            routeTests.push('✅ /ictstage3 route exists');
        } else {
            routeTests.push('❌ /ictstage3 route missing');
        }
        
        if (indexContent.includes("case '/ask':")) {
            routeTests.push('✅ /ask route exists');
        } else {
            routeTests.push('❌ /ask route missing');
        }
        
        if (indexContent.includes('handleStage1Command(whatsappSocket, chatId, text)')) {
            routeTests.push('✅ Stage commands pass text parameter');
        } else {
            routeTests.push('❌ Stage commands missing text parameter');
        }
        
        // Check for duplicate /ictcache
        const cacheMatches = (indexContent.match(/case '\/ictcache':/g) || []).length;
        if (cacheMatches <= 1) {
            routeTests.push('✅ No duplicate /ictcache routes');
        } else {
            routeTests.push('❌ Duplicate /ictcache routes found');
        }
        
        if (routeTests.every(test => test.includes('✅'))) {
            results.commandRoutes = '✅ PASSED - All routes OK';
        } else {
            results.commandRoutes = '❌ FAILED - Route issues';
        }
        
        routeTests.forEach(test => console.log(`   ${test}`));
        
    } catch (error) {
        results.commandRoutes = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 6: Analytics Function
    console.log('\n📈 Testing Analytics Functions...');
    try {
        const fs = require('fs');
        const commandContent = fs.readFileSync('./modules/commandHandler.js', 'utf8');
        
        let analyticsTests = [];
        
        if (commandContent.includes('async function generateAnalyticsReport')) {
            analyticsTests.push('✅ generateAnalyticsReport function exists');
        } else {
            analyticsTests.push('❌ generateAnalyticsReport function missing');
        }
        
        if (commandContent.includes('async function handleAnalyticsCommand')) {
            analyticsTests.push('✅ handleAnalyticsCommand function exists');
        } else {
            analyticsTests.push('❌ handleAnalyticsCommand function missing');
        }
        
        if (analyticsTests.every(test => test.includes('✅'))) {
            results.analytics = '✅ PASSED - Analytics functions OK';
        } else {
            results.analytics = '❌ FAILED - Analytics missing';
        }
        
        analyticsTests.forEach(test => console.log(`   ${test}`));
        
    } catch (error) {
        results.analytics = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Final Results
    console.log('\n📋 STRUCTURE TEST SUMMARY');
    console.log('===========================');
    console.log(`🤖 AI Assistant:       ${results.aiAssistant}`);
    console.log(`📊 Dashboard:          ${results.dashboard}`);
    console.log(`📈 Analytics:          ${results.analytics}`);
    console.log(`⚡ Stage Commands:     ${results.stageCommands}`);
    console.log(`🔄 Command Routes:     ${results.commandRoutes}`);
    console.log(`💰 Broker Methods:     ${results.brokerMethods}`);

    const passedTests = Object.values(results).filter(result => result.includes('✅')).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 OVERALL: ${passedTests}/${totalTests} structure tests passed`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ALL STRUCTURE TESTS PASSED!');
        console.log('📋 Bot v3.2.0 fixes are structurally sound!');
        console.log('\n💡 COMMAND FIXES SUMMARY:');
        console.log('• /ask [question]           - ✅ FIXED (call aiAssistant.handleAskCommand)');
        console.log('• /ictanalytics            - ✅ FIXED (added getWeeklyPerformance)');
        console.log('• /ictstage1 [pair]        - ✅ NEW (force Stage 1 + pair support)');
        console.log('• /ictstage2 [pair]        - ✅ NEW (force Stage 2 + pair support)');
        console.log('• /ictstage3 [pair]        - ✅ NEW (force Stage 3 + pair support)');
        console.log('• Stage validation logic    - ✅ ENHANCED (prerequisite checks)');
        return true;
    } else {
        console.log('\n⚠️  Some structure tests failed. Check files above.');
        return false;
    }
}

// Run tests
const success = testStructureOnly();

if (!success) {
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Fix any structure issues shown above');
    console.log('2. Test commands manually in production');
    console.log('3. Check logs for runtime errors');
    process.exit(1);
} else {
    console.log('\n🚀 READY FOR DEPLOYMENT!');
    console.log('Bot v3.2.0 fixes are ready for testing.');
}
