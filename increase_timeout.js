/**
 * 🕐 TIMEOUT FIX - Untuk Gemini 2.5 Pro
 * Hanya tingkatkan timeout, TIDAK ganti model
 */

const fs = require('fs').promises;
const path = require('path');

async function increaseGeminiTimeout() {
    console.log('🕐 Increasing Gemini 2.5 Pro timeout (keeping the model)...\n');
    
    const analysisHandlerPath = path.join(__dirname, 'modules', 'analysisHandler.js');
    
    try {
        let content = await fs.readFile(analysisHandlerPath, 'utf8');
        
        // Ganti timeout dari 60000ms (1 menit) ke 240000ms (4 menit)
        content = content.replace(
            /timeout:\s*60000/g,
            'timeout: 240000'
        );
        
        // Update retry delay agar tidak terlalu sering
        content = content.replace(
            /delay = Math\.floor\(Math\.random\(\) \* 2000\) \+ 1000;/g,
            'delay = Math.floor(Math.random() * 3000) + 2000;'
        );
        
        await fs.writeFile(analysisHandlerPath, content);
        
        console.log('✅ TIMEOUT UPDATED:');
        console.log('   📊 Gemini 2.5 Pro timeout: 60s → 240s (4 menit)');
        console.log('   🔄 Retry delay: 1-3s → 2-5s');
        console.log('   🤖 Model tetap: gemini-2.5-pro (tidak diubah)');
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Restart bot (jika diperlukan)');
        console.log('2. Gemini 2.5 Pro sekarang punya waktu 4 menit per analisis');
        console.log('3. Bot akan tunggu sampai analisis selesai');
        
        console.log('\n⏱️ EXPECTED BEHAVIOR:');
        console.log('- Normal response time: 1-3 menit');
        console.log('- Complex analysis: bisa sampai 4 menit');
        console.log('- Bot akan sabar tunggu Gemini selesai');
        
    } catch (error) {
        console.error('❌ Error updating timeout:', error.message);
    }
}

// Auto-run
increaseGeminiTimeout().then(() => {
    console.log('\n✅ Timeout fix completed! Model tetap Gemini 2.5 Pro.');
}).catch(error => {
    console.error('💥 Fix failed:', error);
});
