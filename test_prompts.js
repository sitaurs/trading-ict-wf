const { prepareStage1Prompt } = require('./modules/analysis/promptBuilders');

async function testPrompts() {
    try {
        console.log('=== TESTING ENHANCED PROMPTS ===');
        
        // Test Stage 1 Enhanced Prompt
        const mockOhlcv = [{open: 1.0500, high: 1.0520, low: 1.0480, close: 1.0510, volume: 1000}];
        const stage1Prompt = await prepareStage1Prompt('EURUSD', mockOhlcv);
        
        console.log('\n✅ Stage 1 Enhanced Prompt Test:');
        console.log('Length:', stage1Prompt.length);
        console.log('Contains EURUSD:', stage1Prompt.includes('EURUSD') ? '✅' : '❌');
        console.log('Contains OHLCV data:', stage1Prompt.includes('1.0500') ? '✅' : '❌');
        console.log('Contains Asia sessions:', stage1Prompt.includes('ASIA_SESSION') ? '❌ (placeholder not replaced)' : '✅');
        
        // Check for key enhanced features
        console.log('\n🔍 Enhanced Features Check:');
        console.log('Power of Three:', stage1Prompt.includes('POWER OF THREE') ? '✅' : '❌');
        console.log('Smart Money Concepts:', stage1Prompt.includes('Smart Money') ? '✅' : '❌');
        console.log('Chain-of-Thought:', stage1Prompt.includes('CHAIN-OF-THOUGHT') ? '✅' : '❌');
        console.log('Market Structure:', stage1Prompt.includes('Market Structure') ? '✅' : '❌');
        
        // Show first 200 chars to verify content
        console.log('\n📄 Prompt Preview:');
        console.log(stage1Prompt.substring(0, 200) + '...');
        
    } catch (error) {
        console.error('❌ Prompt test failed:', error.message);
    }
}

testPrompts();
