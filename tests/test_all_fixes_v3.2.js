#!/usr/bin/env node

/**
 * 🧪 Comprehensive Test - All v3.2.0 Fixes
 * Test semua perbaikan untuk fitur-fitur yang gagal
 */

console.log('🧪 ICT Trading Bot - Comprehensive Fixes Test v3.2.0');
console.log('======================================================\n');

async function testAllFixes() {
    const results = {
        aiAssistant: '❌ NOT TESTED',
        dashboard: '❌ NOT TESTED', 
        analytics: '❌ NOT TESTED',
        stageCommands: '❌ NOT TESTED',
        pairSpecific: '❌ NOT TESTED',
        brokerHandler: '❌ NOT TESTED'
    };

    // Test 1: AI Assistant Module
    console.log('🤖 Testing AI Assistant Module...');
    try {
        const AIAssistant = require('../modules/aiAssistant');
        const aiAssistant = new AIAssistant();
        
        if (typeof aiAssistant.handleAskCommand === 'function') {
            results.aiAssistant = '✅ PASSED - Method exists';
            console.log('   ✅ aiAssistant.handleAskCommand() method exists');
        } else {
            results.aiAssistant = '❌ FAILED - Method missing';
            console.log('   ❌ aiAssistant.handleAskCommand() method missing');
        }
    } catch (error) {
        results.aiAssistant = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: Enhanced Dashboard
    console.log('\n📊 Testing Enhanced Dashboard...');
    try {
        const ICTDashboard = require('../modules/enhancedDashboard');
        const dashboard = new ICTDashboard();
        
        if (typeof dashboard.generateDashboard === 'function') {
            results.dashboard = '✅ PASSED - Module loads';
            console.log('   ✅ Enhanced Dashboard module loads successfully');
        } else {
            results.dashboard = '❌ FAILED - Missing methods';
            console.log('   ❌ Enhanced Dashboard missing methods');
        }
    } catch (error) {
        results.dashboard = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Broker Handler Extensions
    console.log('\n💰 Testing Broker Handler Extensions...');
    try {
        const brokerHandler = require('../modules/brokerHandler');
        
        let brokerTests = [];
        
        if (typeof brokerHandler.getTodaysProfit === 'function') {
            brokerTests.push('✅ getTodaysProfit exists');
        } else {
            brokerTests.push('❌ getTodaysProfit missing');
        }
        
        if (typeof brokerHandler.getWeeklyPerformance === 'function') {
            brokerTests.push('✅ getWeeklyPerformance exists');
        } else {
            brokerTests.push('❌ getWeeklyPerformance missing');
        }
        
        if (brokerTests.every(test => test.includes('✅'))) {
            results.brokerHandler = '✅ PASSED - All methods exist';
        } else {
            results.brokerHandler = '❌ FAILED - Missing methods';
        }
        
        brokerTests.forEach(test => console.log(`   ${test}`));
        
    } catch (error) {
        results.brokerHandler = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Command Handler Methods
    console.log('\n⚡ Testing Stage Command Handlers...');
    try {
        const commandHandler = require('../modules/commandHandler');
        
        let commandTests = [];
        
        if (typeof commandHandler.handleStage1Command === 'function') {
            commandTests.push('✅ handleStage1Command exists');
        } else {
            commandTests.push('❌ handleStage1Command missing');
        }
        
        if (typeof commandHandler.handleStage2Command === 'function') {
            commandTests.push('✅ handleStage2Command exists');
        } else {
            commandTests.push('❌ handleStage2Command missing');
        }
        
        if (typeof commandHandler.handleStage3Command === 'function') {
            commandTests.push('✅ handleStage3Command exists');
        } else {
            commandTests.push('❌ handleStage3Command missing');
        }
        
        if (typeof commandHandler.handleAskCommand === 'function') {
            commandTests.push('✅ handleAskCommand exists');
        } else {
            commandTests.push('❌ handleAskCommand missing');
        }
        
        if (typeof commandHandler.handleAnalyticsCommand === 'function') {
            commandTests.push('✅ handleAnalyticsCommand exists');
        } else {
            commandTests.push('❌ handleAnalyticsCommand missing');
        }
        
        if (commandTests.every(test => test.includes('✅'))) {
            results.stageCommands = '✅ PASSED - All handlers exist';
        } else {
            results.stageCommands = '❌ FAILED - Missing handlers';
        }
        
        commandTests.forEach(test => console.log(`   ${test}`));
        
    } catch (error) {
        results.stageCommands = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Index.js Command Routes
    console.log('\n🔄 Testing Index.js Command Routes...');
    try {
        const fs = require('fs');
        const indexContent = fs.readFileSync('../index.js', 'utf8');
        
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
        
        if (routeTests.every(test => test.includes('✅'))) {
            results.pairSpecific = '✅ PASSED - All routes exist';
        } else {
            results.pairSpecific = '❌ FAILED - Missing routes';
        }
        
        routeTests.forEach(test => console.log(`   ${test}`));
        
    } catch (error) {
        results.pairSpecific = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 6: Analytics Generation
    console.log('\n📈 Testing Analytics Generation...');
    try {
        const commandHandler = require('../modules/commandHandler');
        
        // Check if analytics function exists (it's not exported but let's test the file)
        const fs = require('fs');
        const commandContent = fs.readFileSync('../modules/commandHandler.js', 'utf8');
        
        if (commandContent.includes('generateAnalyticsReport')) {
            results.analytics = '✅ PASSED - Analytics function exists';
            console.log('   ✅ generateAnalyticsReport function found');
        } else {
            results.analytics = '❌ FAILED - Analytics function missing';
            console.log('   ❌ generateAnalyticsReport function missing');
        }
        
    } catch (error) {
        results.analytics = `❌ FAILED - ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Final Results
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    console.log(`🤖 AI Assistant:       ${results.aiAssistant}`);
    console.log(`📊 Dashboard:          ${results.dashboard}`);
    console.log(`📈 Analytics:          ${results.analytics}`);
    console.log(`⚡ Stage Commands:     ${results.stageCommands}`);
    console.log(`🔄 Command Routes:     ${results.pairSpecific}`);
    console.log(`💰 Broker Handler:     ${results.brokerHandler}`);

    const passedTests = Object.values(results).filter(result => result.includes('✅')).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 OVERALL: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED! Bot v3.2.0 fixes are ready!');
        return true;
    } else {
        console.log('\n⚠️  Some tests failed. Check implementation above.');
        return false;
    }
}

// Run tests
testAllFixes().then(success => {
    if (!success) {
        process.exit(1);
    }
}).catch(error => {
    console.error('\n💥 Test runner error:', error);
    process.exit(1);
});

// Command examples untuk user
console.log('\n💡 FIXED COMMANDS TO TEST:');
console.log('==========================');
console.log('• /ask setup terbaik USDCHF?          - AI Assistant (FIXED)');
console.log('• /ictanalytics                       - Analytics (FIXED)');
console.log('• /ictdash                            - Dashboard (WORKING)');
console.log('• /ictstage1                          - Stage 1 all pairs (NEW)');
console.log('• /ictstage1 USDJPY                   - Stage 1 specific pair (NEW)');
console.log('• /ictstage2 EURUSD                   - Stage 2 specific pair (NEW)');
console.log('• /ictstage3 GBPUSD                   - Stage 3 specific pair (NEW)');
console.log('• /ictstatus                          - Context overview (ENHANCED)');
