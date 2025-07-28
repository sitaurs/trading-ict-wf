/**
 * 📊 GEMINI 2.5 PRO PROGRESS MONITOR
 * Monitor real-time untuk tracking analisis Gemini
 */

function createProgressMonitor() {
    console.log('📊 Gemini 2.5 Pro Progress Monitor Active\n');
    console.log('⏱️  Normal response time: 60-180 detik');
    console.log('🔥 Complex analysis: 180-240 detik');
    console.log('🤖 Model: gemini-2.5-pro (unchanged)\n');
    
    let startTime = null;
    let currentPair = null;
    let timer = null;
    
    function showProgress() {
        if (startTime && currentPair) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            let status = '🟡 Processing';
            let progress = '▓▓▓░░░░░░░';
            
            if (elapsed < 60) {
                status = '🟢 Starting';
                progress = '▓░░░░░░░░░';
            } else if (elapsed < 120) {
                status = '🟡 Analyzing';
                progress = '▓▓▓▓░░░░░░';
            } else if (elapsed < 180) {
                status = '🟠 Deep Analysis';
                progress = '▓▓▓▓▓▓░░░░';
            } else if (elapsed < 240) {
                status = '🔴 Complex Processing';
                progress = '▓▓▓▓▓▓▓▓░░';
            } else {
                status = '⚠️ Extended Processing';
                progress = '▓▓▓▓▓▓▓▓▓▓';
            }
            
            process.stdout.write(`\r${status} ${currentPair}: ${minutes}:${seconds.toString().padStart(2, '0')} ${progress}`);
        }
    }
    
    return {
        start(pair) {
            currentPair = pair;
            startTime = Date.now();
            console.log(`\n🚀 Gemini 2.5 Pro started processing ${pair}...`);
            
            if (timer) clearInterval(timer);
            timer = setInterval(showProgress, 1000);
        },
        
        complete(pair, duration) {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            console.log(`\n✅ ${pair} completed in ${minutes}:${seconds.toString().padStart(2, '0')}`);
            
            currentPair = null;
            startTime = null;
        },
        
        failed(pair, duration) {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            console.log(`\n❌ ${pair} timed out after ${minutes}:${seconds.toString().padStart(2, '0')}`);
            
            currentPair = null;
            startTime = null;
        },
        
        status() {
            if (currentPair && startTime) {
                const elapsed = Date.now() - startTime;
                return {
                    pair: currentPair,
                    elapsed: elapsed,
                    status: elapsed < 240000 ? 'PROCESSING' : 'TIMEOUT_RISK'
                };
            }
            return { status: 'IDLE' };
        }
    };
}

// Export untuk digunakan di analysisHandler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createProgressMonitor };
} else {
    // Standalone usage
    const monitor = createProgressMonitor();
    
    // Demo
    console.log('🔍 Demo Progress Monitor...\n');
    monitor.start('USDJPY');
    
    setTimeout(() => {
        monitor.complete('USDJPY', 125000); // 2 min 5 sec
    }, 3000);
}
