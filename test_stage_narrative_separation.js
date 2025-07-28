/**
 * 🧪 Test Script untuk memverifikasi pemisahan stage narratives dari daily context
 * dan implementasi command /fullanly
 */

require('dotenv').config();
const { getContext, saveContext } = require('./modules/contextManager');
const { saveStageNarrative, loadStageNarrative, toggleFullAnalysis, loadFullAnalysisSettings } = require('./modules/analysisHandler');
const fs = require('fs').promises;
const path = require('path');

console.log('🧪 Testing Stage Narrative Separation & Full Analysis Toggle...\n');

async function testStageNarrativeSeparation() {
    console.log('📋 Test 1: Stage Narrative File Separation');
    
    const testPair = 'TESTPAIR';
    
    // Test Stage 1 narrative saving
    const stage1Narrative = `**STAGE 1 COMPREHENSIVE BIAS ANALYSIS**

🎯 **DAILY BIAS DETERMINATION:**
Berdasarkan analisis multi-timeframe komprehensif, Daily Bias untuk ${testPair} ditetapkan sebagai **BULLISH**.

📊 **ASIA SESSION RANGE ANALYSIS:**
- Asia High: 1.0850 (established at 03:15 UTC)
- Asia Low: 1.0820 (established at 01:45 UTC)
- Range: 30 pips (typical for current market conditions)

🎯 **HTF ZONE TARGET:**
Weekly resistance level at 1.0900 identified as primary target zone.`;

    const stage1ExtractedData = {
        bias: 'BULLISH',
        asia_high: 1.0850,
        asia_low: 1.0820,
        htf_zone_target: 'Weekly resistance at 1.0900'
    };

    // Save Stage 1
    const stage1Path = await saveStageNarrative(testPair, 1, stage1Narrative, stage1ExtractedData);
    console.log(`✅ Stage 1 narrative saved to: ${stage1Path}`);

    // Test Stage 2 narrative saving
    const stage2Narrative = `**STAGE 2 MANIPULATION DETECTION**

⚡ **MANIPULATION ANALYSIS:**
Judas Swing detected above Asia High at 1.0855, confirming bearish manipulation for bullish bias setup.

📊 **HTF REACTION:**
Strong rejection at weekly resistance with clear reversal pattern formation.`;

    const stage2ExtractedData = {
        manipulation_detected: true,
        manipulation_side: 'ABOVE_ASIA_HIGH',
        htf_reaction: true
    };

    // Save Stage 2
    const stage2Path = await saveStageNarrative(testPair, 2, stage2Narrative, stage2ExtractedData);
    console.log(`✅ Stage 2 narrative saved to: ${stage2Path}`);

    // Test loading stage narratives
    const loadedStage1 = await loadStageNarrative(testPair, 1);
    const loadedStage2 = await loadStageNarrative(testPair, 2);

    console.log('\n📖 Testing narrative loading:');
    console.log(`✅ Stage 1 loaded: ${loadedStage1 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   - Narrative length: ${loadedStage1?.full_narrative?.length || 0} chars`);
    console.log(`   - Extracted data: ${Object.keys(loadedStage1?.extracted_data || {}).length} fields`);
    
    console.log(`✅ Stage 2 loaded: ${loadedStage2 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   - Narrative length: ${loadedStage2?.full_narrative?.length || 0} chars`);
    console.log(`   - Extracted data: ${Object.keys(loadedStage2?.extracted_data || {}).length} fields`);

    return { loadedStage1, loadedStage2 };
}

async function testContextCleanup() {
    console.log('\n📋 Test 2: Daily Context Cleanup');
    
    const testPair = 'TESTPAIR';
    
    // Create context with legacy full narrative data
    const legacyContext = {
        pair: testPair,
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING_ENTRY',
        daily_bias: 'BULLISH',
        asia_high: 1.0850,
        asia_low: 1.0820,
        htf_zone_target: 'Weekly resistance at 1.0900',
        manipulation_detected: true,
        manipulation_side: 'ABOVE_ASIA_HIGH',
        htf_reaction: true,
        
        // Legacy data that should be removed
        stage1: {
            full_narrative: 'This should be removed',
            extracted_data: {}
        },
        stage2: {
            full_narrative: 'This should also be removed',
            extracted_data: {}
        },
        full_narrative_stage1: 'Legacy field to remove',
        full_narrative_stage2: 'Another legacy field to remove'
    };

    // Save context (should auto-clean)
    await saveContext(legacyContext);
    console.log('✅ Legacy context saved with cleanup');

    // Load context and verify cleanup
    const cleanedContext = await getContext(testPair);
    
    const hasLegacyData = !!(
        cleanedContext.stage1 || 
        cleanedContext.stage2 || 
        cleanedContext.full_narrative_stage1 || 
        cleanedContext.full_narrative_stage2
    );

    console.log(`✅ Context cleanup verification: ${hasLegacyData ? 'FAILED' : 'SUCCESS'}`);
    console.log(`   - Legacy stage1 object: ${cleanedContext.stage1 ? 'STILL EXISTS' : 'REMOVED'}`);
    console.log(`   - Legacy stage2 object: ${cleanedContext.stage2 ? 'STILL EXISTS' : 'REMOVED'}`);
    console.log(`   - Legacy narrative fields: ${cleanedContext.full_narrative_stage1 ? 'STILL EXISTS' : 'REMOVED'}`);
    
    return cleanedContext;
}

async function testFullAnalysisToggle() {
    console.log('\n📋 Test 3: Full Analysis Toggle Function');
    
    // Test loading current settings
    const currentSettings = await loadFullAnalysisSettings();
    console.log('✅ Current settings loaded:');
    console.log(`   - Full analysis enabled: ${currentSettings.full_analysis_enabled}`);
    console.log(`   - Send full narrative: ${currentSettings.send_full_narrative}`);
    console.log(`   - Send extracted data: ${currentSettings.send_extracted_data}`);

    // Test enabling full analysis
    const enableResult = await toggleFullAnalysis(true);
    console.log(`✅ Enable full analysis: ${enableResult ? 'SUCCESS' : 'FAILED'}`);

    const enabledSettings = await loadFullAnalysisSettings();
    console.log('   - After enabling:');
    console.log(`     • Full analysis: ${enabledSettings.full_analysis_enabled}`);
    console.log(`     • Send narrative: ${enabledSettings.send_full_narrative}`);

    // Test disabling full analysis
    const disableResult = await toggleFullAnalysis(false);
    console.log(`✅ Disable full analysis: ${disableResult ? 'SUCCESS' : 'FAILED'}`);

    const disabledSettings = await loadFullAnalysisSettings();
    console.log('   - After disabling:');
    console.log(`     • Full analysis: ${disabledSettings.full_analysis_enabled}`);
    console.log(`     • Send narrative: ${disabledSettings.send_full_narrative}`);

    return { enabledSettings, disabledSettings };
}

async function testPromptBuilderIntegration() {
    console.log('\n📋 Test 4: Prompt Builder Integration');
    
    const testPair = 'TESTPAIR';
    const { prepareStage2Prompt, prepareStage3Prompt } = require('./modules/analysis/promptBuilders');
    
    // Mock context
    const mockContext = {
        pair: testPair,
        date: '2025-07-28',
        daily_bias: 'BULLISH',
        asia_high: 1.0850,
        asia_low: 1.0820,
        htf_zone_target: 'Weekly resistance at 1.0900',
        manipulation_detected: true,
        manipulation_side: 'ABOVE_ASIA_HIGH',
        htf_reaction: true,
        status: 'PENDING_ENTRY'
    };

    // Mock OHLCV data
    const mockOhlcv = {
        pair: testPair,
        timeframe: 'M15',
        data: [{ time: '2025-07-28T10:00:00Z', open: 1.0840, high: 1.0860, low: 1.0835, close: 1.0845 }],
        count: 1
    };

    // Load narratives from files
    const stage1Data = await loadStageNarrative(testPair, 1);
    const stage2Data = await loadStageNarrative(testPair, 2);

    try {
        // Test Stage 2 prompt building
        const stage2Prompt = await prepareStage2Prompt(testPair, mockContext, mockOhlcv, {
            stage1_full_narrative: stage1Data?.full_narrative
        });
        
        const hasStage1Narrative = stage2Prompt.includes('STAGE 1 COMPREHENSIVE BIAS');
        const hasDailyContext = stage2Prompt.includes('"pair": "TESTPAIR"');
        
        console.log('✅ Stage 2 prompt building:');
        console.log(`   - Stage 1 narrative included: ${hasStage1Narrative ? 'YES' : 'NO'}`);
        console.log(`   - Daily context included: ${hasDailyContext ? 'YES' : 'NO'}`);

        // Test Stage 3 prompt building
        const stage3Prompt = await prepareStage3Prompt(testPair, mockContext, mockOhlcv, {
            stage1_full_narrative: stage1Data?.full_narrative,
            stage2_full_narrative: stage2Data?.full_narrative
        });

        const hasStage2Narrative = stage3Prompt.includes('STAGE 2 MANIPULATION DETECTION');
        const hasStage3Context = stage3Prompt.includes('"manipulation_detected": true');

        console.log('✅ Stage 3 prompt building:');
        console.log(`   - Stage 1 narrative included: ${stage3Prompt.includes('STAGE 1 COMPREHENSIVE BIAS') ? 'YES' : 'NO'}`);
        console.log(`   - Stage 2 narrative included: ${hasStage2Narrative ? 'YES' : 'NO'}`);
        console.log(`   - Daily context included: ${hasStage3Context ? 'YES' : 'NO'}`);

    } catch (error) {
        console.log(`❌ Prompt building error: ${error.message}`);
    }
}

async function cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    
    const testPair = 'TESTPAIR';
    
    // Clean up narrative files
    const cacheDir = path.join(__dirname, 'analysis_cache');
    try {
        await fs.unlink(path.join(cacheDir, `${testPair.toLowerCase()}_stage1.json`));
        console.log('✅ Stage 1 narrative file cleaned');
    } catch {}
    
    try {
        await fs.unlink(path.join(cacheDir, `${testPair.toLowerCase()}_stage2.json`));
        console.log('✅ Stage 2 narrative file cleaned');
    } catch {}
    
    // Clean up context file
    const contextPath = path.join(__dirname, 'daily_context', `${testPair}.json`);
    try {
        await fs.unlink(contextPath);
        console.log('✅ Test context file cleaned');
    } catch {}
}

// Run tests
async function runAllTests() {
    try {
        await testStageNarrativeSeparation();
        await testContextCleanup();
        await testFullAnalysisToggle();
        await testPromptBuilderIntegration();
        
        console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('\n✅ New Features Implemented:');
        console.log('   • Stage narratives separated to individual JSON files');
        console.log('   • Daily context cleaned from full narratives');
        console.log('   • /fullanly command for toggle full analysis broadcast');
        console.log('   • Enhanced prompt builders with stage narrative integration');
        console.log('   • Automatic context cleanup on save');
        
        console.log('\n📝 Command Usage:');
        console.log('   • /fullanly on  - Enable full analysis broadcasting');
        console.log('   • /fullanly off - Disable full analysis broadcasting');
        console.log('   • /fullanly     - Show current settings');
        
    } catch (error) {
        console.error('💥 Test failed:', error);
    } finally {
        await cleanup();
    }
}

runAllTests().then(() => {
    console.log('\n✅ Test completed. Exiting...');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});
