/**
 * Test script untuk memverifikasi circuit breaker dalam scenario loss
 */

require('dotenv').config();
const circuitBreaker = require('./modules/circuitBreaker');
const fs = require('fs').promises;
const path = require('path');

async function testCircuitBreakerScenarios() {
    console.log('🧪 Testing Circuit Breaker Loss Scenarios...\n');
    
    const statsPath = path.join(__dirname, 'config', 'circuit_breaker_stats.json');
    
    try {
        // Backup current stats
        let originalStats = null;
        try {
            const data = await fs.readFile(statsPath, 'utf8');
            originalStats = JSON.parse(data);
            console.log('📁 Current stats backed up:', originalStats);
        } catch (error) {
            console.log('📁 No existing stats file found');
        }
        
        // Test Scenario 1: Record wins (should reset counter)
        console.log('\n🏆 Scenario 1: Testing win recording...');
        await circuitBreaker.recordWin();
        let status = await circuitBreaker.isTripped();
        console.log(`✅ After win - Circuit breaker status: ${status ? 'TRIPPED' : 'NORMAL'}`);
        
        // Test Scenario 2: Record progressive losses
        console.log('\n💥 Scenario 2: Testing progressive losses...');
        
        for (let i = 1; i <= 4; i++) {
            console.log(`\n   Loss ${i}:`);
            await circuitBreaker.recordLoss();
            
            const currentStatus = await circuitBreaker.isTripped();
            console.log(`   ├─ Circuit breaker status: ${currentStatus ? 'TRIPPED' : 'NORMAL'}`);
            
            // Read current stats
            const statsData = await fs.readFile(statsPath, 'utf8');
            const stats = JSON.parse(statsData);
            console.log(`   └─ Consecutive losses: ${stats.consecutiveLosses}`);
            
            if (i === 2) {
                console.log('   ⚠️ Should show warning notification');
            }
            if (i >= 3) {
                console.log('   🚨 Should be TRIPPED and show activation notification');
                break;
            }
        }
        
        // Test Scenario 3: Verify trip status
        console.log('\n🔍 Scenario 3: Verifying final trip status...');
        const finalStatus = await circuitBreaker.isTripped();
        console.log(`✅ Final circuit breaker status: ${finalStatus ? 'TRIPPED ✅' : 'NORMAL ❌'}`);
        
        // Test Scenario 4: Test daily reset
        console.log('\n🌅 Scenario 4: Testing daily reset mechanism...');
        
        // Modify the last reset date to yesterday
        const statsData = await fs.readFile(statsPath, 'utf8');
        const stats = JSON.parse(statsData);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        stats.lastResetDate = yesterday.toISOString().split('T')[0];
        await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
        console.log('   ├─ Modified last reset date to yesterday');
        
        // Check if it resets
        const resetStatus = await circuitBreaker.isTripped();
        console.log(`   └─ After date change: ${resetStatus ? 'STILL TRIPPED ❌' : 'RESET TO NORMAL ✅'}`);
        
        // Verify stats were reset
        const resetStatsData = await fs.readFile(statsPath, 'utf8');
        const resetStats = JSON.parse(resetStatsData);
        console.log(`   └─ Consecutive losses after reset: ${resetStats.consecutiveLosses}`);
        
        // Restore original stats if they existed
        if (originalStats) {
            console.log('\n🔄 Restoring original stats...');
            await fs.writeFile(statsPath, JSON.stringify(originalStats, null, 2));
            console.log('✅ Original stats restored');
        }
        
        console.log('\n🎉 All circuit breaker scenarios tested successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run tests
testCircuitBreakerScenarios().then(() => {
    console.log('\n✅ Circuit breaker scenario testing completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
});
