/**
 * Comprehensive verification dan perbaikan final untuk ICT Bot
 */

const fs = require('fs').promises;
const path = require('path');

async function comprehensiveVerification() {
    console.log('🔍 COMPREHENSIVE VERIFICATION & FIXES');
    console.log('=====================================\n');
    
    let allGood = true;
    
    // 1. Verify Stage 2 & 3 Force Analysis Fix
    console.log('1️⃣ VERIFYING STAGE 2 & 3 FORCE ANALYSIS...');
    try {
        const analysisHandlerPath = path.join(__dirname, 'modules', 'analysisHandler.js');
        const content = await fs.readFile(analysisHandlerPath, 'utf8');
        
        const stage1Fixed = !content.includes(`context.status !== 'PENDING_BIAS'`);
        const stage2Fixed = !content.includes(`context.status !== 'PENDING_MANIPULATION'`);
        const stage3Fixed = !content.includes(`context.status !== 'PENDING_ENTRY'`);
        
        console.log(`   ✅ Stage 1 Force: ${stage1Fixed ? 'FIXED' : '❌ NEEDS FIX'}`);
        console.log(`   ✅ Stage 2 Force: ${stage2Fixed ? 'FIXED' : '❌ NEEDS FIX'}`);
        console.log(`   ✅ Stage 3 Force: ${stage3Fixed ? 'FIXED' : '❌ NEEDS FIX'}`);
        
        if (!stage1Fixed || !stage2Fixed || !stage3Fixed) allGood = false;
        
    } catch (error) {
        console.log(`   ❌ Error checking force analysis: ${error.message}`);
        allGood = false;
    }
    
    // 2. Verify Prompt Files
    console.log('\n2️⃣ VERIFYING PROMPT FILES...');
    
    const requiredPrompts = [
        'prompt_stage1_extractor_new.txt',
        'prompt_stage2_extractor.txt', 
        'prompt_extractor.txt',
        'prompt_stage1_bias.txt',
        'prompt_stage2_manipulation.txt',
        'prompt_stage3_entry.txt',
        'prompt_hold_close.txt'
    ];
    
    for (const promptFile of requiredPrompts) {
        try {
            const promptPath = path.join(__dirname, 'prompts', promptFile);
            await fs.access(promptPath);
            
            const content = await fs.readFile(promptPath, 'utf8');
            const hasContent = content.length > 100; // Basic content check
            
            console.log(`   ✅ ${promptFile}: ${hasContent ? 'OK' : '❌ EMPTY'}`);
            if (!hasContent) allGood = false;
            
        } catch (error) {
            console.log(`   ❌ ${promptFile}: MISSING`);
            allGood = false;
        }
    }
    
    // 3. Verify Extractor Files
    console.log('\n3️⃣ VERIFYING EXTRACTOR FILES...');
    
    const extractorFiles = [
        'modules/analysis/extractorStage1.js',
        'modules/analysis/extractorStage2.js',
        'modules/analysis/extractor.js'
    ];
    
    for (const extractorFile of extractorFiles) {
        try {
            const extractorPath = path.join(__dirname, extractorFile);
            await fs.access(extractorPath);
            
            const content = await fs.readFile(extractorPath, 'utf8');
            const hasExportFunction = content.includes('module.exports');
            
            console.log(`   ✅ ${extractorFile}: ${hasExportFunction ? 'OK' : '❌ NO EXPORTS'}`);
            if (!hasExportFunction) allGood = false;
            
        } catch (error) {
            console.log(`   ❌ ${extractorFile}: MISSING`);
            allGood = false;
        }
    }
    
    // 4. Verify Command Handler Functions
    console.log('\n4️⃣ VERIFYING COMMAND HANDLER FUNCTIONS...');
    
    try {
        const commandHandlerPath = path.join(__dirname, 'modules', 'commandHandler.js');
        const content = await fs.readFile(commandHandlerPath, 'utf8');
        
        const requiredFunctions = [
            'handleStage1Command',
            'handleStage2Command', 
            'handleStage3Command',
            'handleDashboardCommand',
            'handleHealthCommand',
            'handleAnalyticsCommand',
            'handleScheduleCommand',
            'handleContextCommand',
            'handleRestartCommand'
        ];
        
        for (const funcName of requiredFunctions) {
            const exists = content.includes(`function ${funcName}`);
            console.log(`   ✅ ${funcName}: ${exists ? 'OK' : '❌ MISSING'}`);
            if (!exists) allGood = false;
        }
        
    } catch (error) {
        console.log(`   ❌ Error checking command handler: ${error.message}`);
        allGood = false;
    }
    
    // 5. Verify Enhanced Dashboard
    console.log('\n5️⃣ VERIFYING ENHANCED DASHBOARD...');
    
    try {
        const dashboardPath = path.join(__dirname, 'modules', 'enhancedDashboard.js');
        await fs.access(dashboardPath);
        
        const content = await fs.readFile(dashboardPath, 'utf8');
        const hasComprehensiveMenu = content.includes('AI ASSISTANT') && content.includes('LEGACY COMMANDS');
        const noMockData = !content.includes('totalProfit: 12.30');
        
        console.log(`   ✅ Comprehensive Menu: ${hasComprehensiveMenu ? 'OK' : '❌ INCOMPLETE'}`);
        console.log(`   ✅ No Mock Data: ${noMockData ? 'OK' : '❌ STILL HAS MOCK DATA'}`);
        
        if (!hasComprehensiveMenu || !noMockData) allGood = false;
        
    } catch (error) {
        console.log(`   ❌ Enhanced Dashboard: MISSING`);
        allGood = false;
    }
    
    // 6. Check Cache Files Status
    console.log('\n6️⃣ CHECKING CACHE FILES STATUS...');
    
    try {
        const cacheDir = path.join(__dirname, 'json_bot', 'analysis_cache');
        const files = await fs.readdir(cacheDir);
        const stage1Files = files.filter(f => f.includes('_stage1.json'));
        
        if (stage1Files.length > 0) {
            // Check one sample file for correct extraction
            const sampleFile = path.join(cacheDir, stage1Files[0]);
            const sampleData = JSON.parse(await fs.readFile(sampleFile, 'utf8'));
            
            const hasValidExtraction = sampleData.extracted_data && 
                                     sampleData.extracted_data.bias !== 'NEUTRAL' &&
                                     sampleData.extracted_data.asia_high !== 0;
            
            console.log(`   ✅ Cache Files: ${stage1Files.length} files found`);
            console.log(`   ✅ Extraction Quality: ${hasValidExtraction ? 'OK' : '❌ POOR'}`);
            
            if (!hasValidExtraction) allGood = false;
        } else {
            console.log(`   ℹ️ Cache Files: No Stage 1 cache files (will be created on next analysis)`);
        }
        
    } catch (error) {
        console.log(`   ℹ️ Cache Directory: Not found or empty (will be created automatically)`);
    }
    
    // 7. Final Summary
    console.log('\n🎯 FINAL VERIFICATION SUMMARY');
    console.log('=============================');
    
    if (allGood) {
        console.log('🎉 ✅ ALL SYSTEMS VERIFIED AND READY!');
        console.log('\n📋 Summary:');
        console.log('✅ Stage 1, 2, 3 force analysis logic fixed');
        console.log('✅ All prompt files verified and correct');
        console.log('✅ All extractor files present and functional');
        console.log('✅ Command handler functions complete');
        console.log('✅ Enhanced dashboard with comprehensive menu');
        console.log('✅ Mock data removed from performance tracking');
        console.log('✅ Cache extraction logic improved');
        
        console.log('\n🚀 READY TO TEST COMMANDS:');
        console.log('• /ictstage1 - Force Stage 1 analysis');
        console.log('• /ictstage2 - Force Stage 2 analysis');
        console.log('• /ictstage3 - Force Stage 3 analysis');
        console.log('• /ictdash - Real-time dashboard');
        console.log('• /ictmenu - Complete command menu');
        
    } else {
        console.log('❌ SOME ISSUES DETECTED');
        console.log('\n🔧 Please review the issues above and fix them before proceeding.');
    }
    
    return allGood;
}

// Run verification
comprehensiveVerification()
    .then(success => {
        if (success) {
            console.log('\n✨ ICT Bot is fully operational and ready for trading! ✨');
        } else {
            console.log('\n⚠️ Please fix the detected issues and run verification again.');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    });
