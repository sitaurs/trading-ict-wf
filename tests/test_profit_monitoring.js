/**
 * Test script untuk memverifikasi fungsi profit monitoring dan circuit breaker
 */

require('dotenv').config();
const broker = require('./modules/brokerHandler');
const circuitBreaker = require('./modules/circuitBreaker');
const { getLogger } = require('./modules/logger');

const log = getLogger('ProfitTest');

async function testProfitMonitoring() {
    console.log('🧪 Testing Profit Monitoring & Circuit Breaker...\n');
    
    try {
        // Test 1: Get Today's Profit
        console.log('📊 Test 1: Getting today\'s profit...');
        const profit = await broker.getTodaysProfit();
        console.log(`✅ Today's profit: ${profit}`);
        console.log(`   Type: ${typeof profit}`);
        console.log(`   Valid number: ${!isNaN(profit) && isFinite(profit)}`);
        
        // Test 2: Check Circuit Breaker Status
        console.log('\n🚨 Test 2: Checking circuit breaker status...');
        const isTripped = await circuitBreaker.isTripped();
        console.log(`✅ Circuit breaker status: ${isTripped ? 'TRIPPED' : 'NORMAL'}`);
        
        // Test 3: Circuit Breaker Data File
        console.log('\n📁 Test 3: Checking circuit breaker data file...');
        const fs = require('fs').promises;
        const path = require('path');
        const statsPath = path.join(__dirname, 'config', 'circuit_breaker_stats.json');
        
        try {
            const statsData = await fs.readFile(statsPath, 'utf8');
            const stats = JSON.parse(statsData);
            console.log(`✅ Circuit breaker data file exists`);
            console.log(`   Consecutive losses: ${stats.consecutiveLosses}`);
            console.log(`   Last reset date: ${stats.lastResetDate}`);
        } catch (error) {
            console.log(`⚠️ Circuit breaker data file not found - will be created on first use`);
            // Create initial file
            const initialStats = {
                consecutiveLosses: 0,
                lastResetDate: new Date().toISOString().split('T')[0]
            };
            await fs.writeFile(statsPath, JSON.stringify(initialStats, null, 2));
            console.log(`✅ Created initial circuit breaker data file`);
        }
        
        // Test 4: Test Circuit Breaker Functions
        console.log('\n🧪 Test 4: Testing circuit breaker functions...');
        
        // Test recordWin function
        console.log('   Testing recordWin()...');
        await circuitBreaker.recordWin();
        console.log('   ✅ recordWin() executed successfully');
        
        // Check status after win
        const statusAfterWin = await circuitBreaker.isTripped();
        console.log(`   Circuit breaker after win: ${statusAfterWin ? 'TRIPPED' : 'NORMAL'}`);
        
        // Test 5: Verify Broker API Connection
        console.log('\n🌐 Test 5: Verifying broker API connection...');
        try {
            const positions = await broker.getActivePositions();
            console.log(`✅ Active positions API working: ${Array.isArray(positions) ? positions.length : 0} positions`);
        } catch (error) {
            console.log(`❌ Active positions API error: ${error.message}`);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run tests
testProfitMonitoring().then(() => {
    console.log('\n✅ Test suite finished');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
});
