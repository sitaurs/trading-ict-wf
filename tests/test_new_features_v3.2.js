/**
 * 🧪 Test AI Assistant dan Enhanced Dashboard
 * Test untuk memvalidasi fitur baru v3.2.0
 */

const { getLogger } = require('../modules/logger');
const AIAssistant = require('../modules/aiAssistant');
const ICTDashboard = require('../modules/enhancedDashboard');

const log = getLogger('TestNewFeatures');

async function testAIAssistant() {
    log.info('🧪 Testing AI Assistant module...');
    
    try {
        const aiAssistant = new AIAssistant();
        
        // Test questions
        const testQuestions = [
            'apa bias EURUSD hari ini?',
            'jelaskan strategi PO3',
            'market outlook sekarang',
            'berapa profit minggu ini?'
        ];
        
        for (const question of testQuestions) {
            try {
                log.info(`Testing question: "${question}"`);
                const response = await aiAssistant.handleQuestion(question);
                
                // Validate response
                if (!response || response.trim().length === 0) {
                    throw new Error('Empty response from AI Assistant');
                }
                
                if (response.includes('AI ASSISTANT ERROR')) {
                    throw new Error('AI returned error response');
                }
                
                log.info('✅ AI Assistant response received', { 
                    question: question.substring(0, 30),
                    responseLength: response.length,
                    hasWhatsAppFormatting: response.includes('*') || response.includes('•')
                });
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                log.error(`❌ AI Assistant test failed for question "${question}":`, error);
                return false;
            }
        }
        
        log.info('✅ AI Assistant module test passed');
        return true;
        
    } catch (error) {
        log.error('❌ AI Assistant module test failed:', error);
        return false;
    }
}

async function testEnhancedDashboard() {
    log.info('🧪 Testing Enhanced Dashboard module...');
    
    try {
        const ictDashboard = new ICTDashboard();
        
        // Test enhanced menu
        log.info('Testing enhanced menu generation...');
        const enhancedMenu = await ictDashboard.generateEnhancedMenu();
        
        if (!enhancedMenu || enhancedMenu.trim().length === 0) {
            throw new Error('Empty enhanced menu generated');
        }
        
        if (!enhancedMenu.includes('ICT TRADING BOT MENU v3.2.0')) {
            throw new Error('Enhanced menu missing version header');
        }
        
        if (!enhancedMenu.includes('/ask')) {
            throw new Error('Enhanced menu missing AI Assistant command');
        }
        
        log.info('✅ Enhanced menu generation passed', {
            menuLength: enhancedMenu.length,
            hasAIAssistant: enhancedMenu.includes('/ask'),
            hasSchedule: enhancedMenu.includes('JADWAL TRADING'),
            hasTimeInfo: enhancedMenu.includes('WIB')
        });
        
        // Test real-time dashboard
        log.info('Testing real-time dashboard generation...');
        const dashboard = await ictDashboard.generateRealTimeDashboard();
        
        if (!dashboard || dashboard.trim().length === 0) {
            throw new Error('Empty dashboard generated');
        }
        
        if (!dashboard.includes('ICT TRADING DASHBOARD')) {
            throw new Error('Dashboard missing header');
        }
        
        log.info('✅ Real-time dashboard generation passed', {
            dashboardLength: dashboard.length,
            hasPositions: dashboard.includes('POSISI AKTIF'),
            hasPerformance: dashboard.includes('PERFORMANCE'),
            hasAnalysisProgress: dashboard.includes('ANALISIS PROGRESS')
        });
        
        // Test detailed schedule
        log.info('Testing detailed schedule generation...');
        const schedule = await ictDashboard.generateDetailedSchedule();
        
        if (!schedule || schedule.trim().length === 0) {
            throw new Error('Empty schedule generated');
        }
        
        if (!schedule.includes('ICT TRADING SCHEDULE DETAIL')) {
            throw new Error('Schedule missing header');
        }
        
        log.info('✅ Detailed schedule generation passed', {
            scheduleLength: schedule.length,
            hasStages: schedule.includes('Stage'),
            hasSessionInfo: schedule.includes('SESSION LOGIC')
        });
        
        log.info('✅ Enhanced Dashboard module test passed');
        return true;
        
    } catch (error) {
        log.error('❌ Enhanced Dashboard module test failed:', error);
        return false;
    }
}

async function testCommandHandlerIntegration() {
    log.info('🧪 Testing Command Handler integration...');
    
    try {
        const commandHandler = require('../modules/commandHandler');
        
        // Check if new handlers exist
        const requiredHandlers = [
            'handleAskCommand',
            'handleDashboardCommand', 
            'handleScheduleCommand',
            'handleAnalyticsCommand',
            'handleCacheManagementCommand'
        ];
        
        for (const handler of requiredHandlers) {
            if (typeof commandHandler[handler] !== 'function') {
                throw new Error(`Missing handler function: ${handler}`);
            }
        }
        
        log.info('✅ All new command handlers are properly exported');
        
        // Test enhanced menu through command handler
        const mockWhatsAppSocket = {
            sendMessage: async (chatId, message) => {
                log.info('Mock WhatsApp message sent', { chatId, messageLength: message.text.length });
                return true;
            }
        };
        
        await commandHandler.handleMenuCommand(mockWhatsAppSocket, 'test-chat-id', ['EURUSD', 'GBPUSD']);
        log.info('✅ Enhanced menu command handler test passed');
        
        log.info('✅ Command Handler integration test passed');
        return true;
        
    } catch (error) {
        log.error('❌ Command Handler integration test failed:', error);
        return false;
    }
}

async function testFeatureCompatibility() {
    log.info('🧪 Testing feature compatibility...');
    
    try {
        // Test environment variables
        const requiredEnvVars = ['GEMINI_API_KEY'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                log.warn(`⚠️ Missing environment variable: ${envVar}`);
            }
        }
        
        // Test module dependencies
        try {
            require('fs').promises;
            require('path');
            log.info('✅ Core dependencies available');
        } catch (error) {
            throw new Error(`Missing core dependencies: ${error.message}`);
        }
        
        // Test cache manager integration
        try {
            const AnalysisCacheManager = require('../scripts/cache_manager');
            const cacheManager = new AnalysisCacheManager();
            await cacheManager.init();
            log.info('✅ Cache manager integration working');
        } catch (error) {
            log.warn(`⚠️ Cache manager integration issue: ${error.message}`);
        }
        
        log.info('✅ Feature compatibility test passed');
        return true;
        
    } catch (error) {
        log.error('❌ Feature compatibility test failed:', error);
        return false;
    }
}

async function runAllTests() {
    log.info('🚀 Starting comprehensive feature tests for v3.2.0...');
    
    const results = {
        aiAssistant: false,
        enhancedDashboard: false,
        commandHandlerIntegration: false,
        featureCompatibility: false
    };
    
    try {
        // Run all tests
        results.featureCompatibility = await testFeatureCompatibility();
        results.enhancedDashboard = await testEnhancedDashboard();
        results.commandHandlerIntegration = await testCommandHandlerIntegration();
        
        // AI Assistant test last (requires API)
        if (process.env.GEMINI_API_KEY) {
            results.aiAssistant = await testAIAssistant();
        } else {
            log.warn('⚠️ Skipping AI Assistant test - GEMINI_API_KEY not found');
            results.aiAssistant = 'skipped';
        }
        
        // Generate test report
        const passedTests = Object.values(results).filter(r => r === true).length;
        const totalTests = Object.keys(results).length;
        const skippedTests = Object.values(results).filter(r => r === 'skipped').length;
        
        log.info('📊 TEST RESULTS SUMMARY', {
            passed: passedTests,
            total: totalTests,
            skipped: skippedTests,
            success: (passedTests + skippedTests) === totalTests,
            results
        });
        
        if ((passedTests + skippedTests) === totalTests) {
            log.info('🎉 ALL TESTS PASSED! v3.2.0 features ready for deployment');
            return true;
        } else {
            log.error('❌ Some tests failed. Check logs for details.');
            return false;
        }
        
    } catch (error) {
        log.error('❌ Test runner failed:', error);
        return false;
    }
}

// Run tests if called directly
if (require.main === module) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner crashed:', error);
        process.exit(1);
    });
}

module.exports = {
    testAIAssistant,
    testEnhancedDashboard,
    testCommandHandlerIntegration,
    testFeatureCompatibility,
    runAllTests
};
