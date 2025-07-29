/**
 * Test script untuk memeriksa apakah command /ictstage1 berfungsi
 */

const { getContext, saveContext } = require('./modules/contextManager');

async function testForceStage1() {
    console.log('🧪 Testing force Stage 1 analysis...');
    
    const pairs = ['AUDUSD'];
    
    for (const pair of pairs) {
        const context = await getContext(pair);
        console.log(`📊 Current context for ${pair}:`, {
            status: context.status,
            lock: context.lock,
            bias: context.daily_bias
        });
        
        // Reset status untuk test force
        context.status = 'PENDING_MANIPULATION'; // Simulasi sudah selesai Stage 1
        context.lock = false;
        await saveContext(context);
        
        console.log(`✅ Reset ${pair} context for force test`);
    }
    
    console.log('🎯 Sekarang coba jalankan /ictstage1 - seharusnya tetap melakukan analisis meskipun status bukan PENDING_BIAS');
}

testForceStage1().catch(console.error);
