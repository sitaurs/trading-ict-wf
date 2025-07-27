const { getContext, saveContext } = require('../modules/contextManager');
const { getLogger } = require('../modules/logger');
const log = getLogger('ContextManager.Test');

async function testContextManager() {
    try {
        log.info('Starting contextManager tests...');
        
        // Test 1: Create new context
        const testPair = 'TESTPAIR';
        const context1 = await getContext(testPair);
        
        if (context1.status !== 'PENDING_BIAS') {
            throw new Error('New context should have PENDING_BIAS status');
        }
        
        // Test 2: Update and save context
        context1.daily_bias = 'BULLISH';
        context1.status = 'PENDING_MANIPULATION';
        await saveContext(context1);
        
        // Test 3: Retrieve updated context
        const context2 = await getContext(testPair);
        if (context2.daily_bias !== 'BULLISH' || context2.status !== 'PENDING_MANIPULATION') {
            throw new Error('Context was not saved or retrieved correctly');
        }
        
        // Test 4: Date reset (simulate next day)
        const oldDate = context2.date;
        context2.date = '2023-01-01'; // Force old date
        await saveContext(context2);
        
        const context3 = await getContext(testPair);
        if (context3.date === '2023-01-01') {
            throw new Error('Context should reset with new date');
        }
        
        log.info('All contextManager tests passed!');
        return true;
        
    } catch (error) {
        log.error('ContextManager test failed:', error);
        return false;
    }
}

module.exports = { testContextManager };

// Run test if called directly
if (require.main === module) {
    testContextManager().then(result => {
        process.exit(result ? 0 : 1);
    });
}
