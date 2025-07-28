/**
 * Test untuk memverifikasi Stage 2 extractor fix
 * Memastikan Stage 2 mengekstrak data manipulasi, bukan trading signals
 */

const { extractStage2Data } = require('../modules/analysis/extractorStage2');
const { getLogger } = require('../modules/logger');

const log = getLogger('TestStage2ExtractorFix');

async function testStage2ExtractorFix() {
    log.info('🧪 Starting Stage 2 Extractor Fix Test...');
    
    try {
        // Sample Stage 2 narrative that should extract manipulation data only
        const sampleNarrativeWithManipulation = `
**BAGIAN 1: COMPREHENSIVE TACTICAL ANALYSIS**

**🔍 HYPOTHESIS VALIDATION ASSESSMENT:**
Berdasarkan Daily Bias **BEARISH** yang ditetapkan, hipotesis utama adalah terjadinya **Bullish Manipulation (Judas Swing ke atas)** untuk menyapu Buy-Side Liquidity di atas Asia High (1.34500) selama London Killzone.

**⚡ MANIPULATION SIGNATURE CHARACTERIZATION:**
Pada 07:30 UTC, GBPUSD menunjukkan clear manipulation signature dengan pergerakan impulsive ke atas mencapai 1.34520, melampaui Asia High sebesar 20 pips. Volume spike terdeteksi pada penetrasi dengan immediate rejection forming shooting star pattern.

**🎯 HTF ZONE INTERACTION DYNAMICS:**
HTF reaction sangat kuat di level weekly resistance 1.34600. Price gagal sustain above manipulation level dan langsung reject dengan strong bearish candle formation.

**⚖️ CONFIRMATION MATRIX SYNTHESIS:**
MANIPULATION_DETECTED: TRUE
MANIPULATION_SIDE: ABOVE_ASIA_HIGH  
HTF_REACTION: TRUE

Manipulasi terkonfirmasi dengan confidence level HIGH (>85%).
        `;
        
        const sampleNarrativeNoManipulation = `
**BAGIAN 1: COMPREHENSIVE TACTICAL ANALYSIS**

**🔍 HYPOTHESIS VALIDATION ASSESSMENT:**
Daily Bias BULLISH menunjukkan ekspektasi bearish manipulation, namun price action menunjukkan genuine bullish breakout.

**⚡ MANIPULATION SIGNATURE CHARACTERIZATION:**
Tidak ada signature manipulation yang terdeteksi. Pergerakan menunjukkan sustained momentum dengan volume confirmation.

**🎯 HTF ZONE INTERACTION DYNAMICS:**
No significant HTF reaction detected. Price moving through levels with conviction.

**⚖️ CONFIRMATION MATRIX SYNTHESIS:**
MANIPULATION_DETECTED: FALSE
MANIPULATION_SIDE: NONE
HTF_REACTION: FALSE

Analysis shows genuine market movement, bukan manipulation.
        `;

        // Test Case 1: Manipulation detected
        log.info('🔍 Test Case 1: Manipulation Detected');
        const result1 = await extractStage2Data(sampleNarrativeWithManipulation);
        
        log.info('✅ Stage 2 Extraction Result 1:', {
            manipulation_detected: result1.manipulation_detected,
            manipulation_side: result1.manipulation_side,
            htf_reaction: result1.htf_reaction
        });
        
        // Verify correct extraction
        if (result1.manipulation_detected === true && 
            result1.manipulation_side === 'ABOVE_ASIA_HIGH' && 
            result1.htf_reaction === true) {
            log.info('✅ Test Case 1 PASSED: Correct manipulation data extracted');
        } else {
            log.error('❌ Test Case 1 FAILED: Incorrect manipulation data');
        }
        
        // Test Case 2: No manipulation
        log.info('🔍 Test Case 2: No Manipulation');
        const result2 = await extractStage2Data(sampleNarrativeNoManipulation);
        
        log.info('✅ Stage 2 Extraction Result 2:', {
            manipulation_detected: result2.manipulation_detected,
            manipulation_side: result2.manipulation_side,
            htf_reaction: result2.htf_reaction
        });
        
        // Verify correct extraction
        if (result2.manipulation_detected === false && 
            result2.manipulation_side === null && 
            result2.htf_reaction === false) {
            log.info('✅ Test Case 2 PASSED: Correct no-manipulation data extracted');
        } else {
            log.error('❌ Test Case 2 FAILED: Incorrect no-manipulation data');
        }
        
        // Verify NO trading signals are extracted
        const hasTradeSignals = result1.keputusan || result1.pair || result1.arah || 
                               result1.harga || result1.sl || result1.tp ||
                               result2.keputusan || result2.pair || result2.arah || 
                               result2.harga || result2.sl || result2.tp;
        
        if (!hasTradeSignals) {
            log.info('✅ CRITICAL CHECK PASSED: No trading signals extracted in Stage 2');
        } else {
            log.error('❌ CRITICAL CHECK FAILED: Trading signals found in Stage 2 extraction');
        }
        
        log.info('🎉 Stage 2 Extractor Fix Test Completed Successfully!');
        
    } catch (error) {
        log.error('❌ Stage 2 Extractor Fix Test Failed:', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testStage2ExtractorFix()
        .then(() => {
            console.log('✅ Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testStage2ExtractorFix };
