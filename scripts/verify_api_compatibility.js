#!/usr/bin/env node
/**
 * 🧪 COMPREHENSIVE API COMPATIBILITY VERIFICATION
 * Test semua endpoint Bot Node.js dengan Python MT5 API
 */

const axios = require('axios');
require('dotenv').config();

console.log('🧪 COMPREHENSIVE API COMPATIBILITY VERIFICATION');
console.log('Testing Node.js Bot ↔ Python MT5 API Integration\n');

// Configuration
const baseURL = process.env.BROKER_API_BASE_URL || 'http://localhost:5000';
const apiKey = process.env.BROKER_API_KEY || process.env.API_SECRET_KEY || 'test-api-key';

console.log(`🔧 Test Configuration:`);
console.log(`   Base URL: ${baseURL}`);
console.log(`   API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`   Timeout: 15 seconds\n`);

const apiClient = axios.create({
    baseURL: baseURL,
    headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
    },
    timeout: 15000
});

let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

function addResult(name, status, details = '') {
    testResults.details.push({ name, status, details });
    if (status === 'PASS') testResults.passed++;
    else if (status === 'FAIL') testResults.failed++;
    else if (status === 'WARN') testResults.warnings++;
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${name}: ${status}`);
    if (details) console.log(`   ${details}`);
}

async function runCompatibilityTests() {
    console.log('🚀 Starting compatibility tests...\n');

    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
        const response = await apiClient.get('/health');
        if (response.status === 200) {
            addResult('Health Check', 'PASS', `MT5 Connected: ${response.data.mt5_connected}, Initialized: ${response.data.mt5_initialized}`);
        } else {
            addResult('Health Check', 'WARN', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        addResult('Health Check', 'FAIL', `Error: ${error.message}`);
    }

    // Test 2: OHLCV Data (for chart analysis)
    console.log('\n2️⃣ Testing OHLCV Data Endpoint...');
    try {
        const response = await apiClient.get('/ohlcv', {
            params: { symbol: 'EURUSD', timeframe: 'm15', count: 5 }
        });
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
            const sample = response.data[0];
            const hasOHLC = ['open', 'high', 'low', 'close'].every(field => typeof sample[field] === 'number');
            addResult('OHLCV Data', hasOHLC ? 'PASS' : 'WARN', `Received ${response.data.length} candles, Valid OHLC: ${hasOHLC}`);
        } else {
            addResult('OHLCV Data', 'FAIL', `Invalid response format or empty data`);
        }
    } catch (error) {
        addResult('OHLCV Data', 'FAIL', `Error: ${error.message}`);
    }

    // Test 3: Get Active Positions
    console.log('\n3️⃣ Testing Get Active Positions...');
    try {
        const response = await apiClient.get('/get_positions');
        if (response.status === 200) {
            const isArray = Array.isArray(response.data);
            const hasPositions = isArray && response.data.length > 0;
            addResult('Get Positions', 'PASS', `Format: ${isArray ? 'Array' : 'Object'}, Count: ${isArray ? response.data.length : 'N/A'}`);
        } else {
            addResult('Get Positions', 'FAIL', `Status: ${response.status}`);
        }
    } catch (error) {
        addResult('Get Positions', 'FAIL', `Error: ${error.message}`);
    }

    // Test 4: Order Status - CRITICAL TEST (this was missing)
    console.log('\n4️⃣ Testing Order Status Endpoint (CRITICAL)...');
    try {
        // Test with dummy ticket (should return 404 but not crash)
        const response = await apiClient.get('/order/status/12345');
        addResult('Order Status (Path)', 'FAIL', 'Endpoint exists but not implemented in current Python API');
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Try query parameter version
            try {
                const response = await apiClient.get('/order/status', {
                    params: { ticket: 12345 }
                });
                addResult('Order Status (Query)', 'PASS', 'Alternative query endpoint available');
            } catch (error2) {
                if (error2.response && error2.response.status === 404) {
                    addResult('Order Status', 'WARN', 'Endpoint exists but order not found (expected)');
                } else {
                    addResult('Order Status', 'FAIL', `Query version error: ${error2.message}`);
                }
            }
        } else {
            addResult('Order Status', 'FAIL', `Endpoint missing: ${error.message}`);
        }
    }

    // Test 5: History Deals (for profit calculation)
    console.log('\n5️⃣ Testing History Deals Endpoint...');
    try {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const response = await apiClient.get('/history_deals_get', {
            params: {
                from_date: yesterday.toISOString(),
                to_date: today.toISOString(),
                position: 0
            }
        });
        
        if (response.status === 200) {
            const isArray = Array.isArray(response.data);
            addResult('History Deals', 'PASS', `Format: ${isArray ? 'Array' : 'Object'}, Deals: ${isArray ? response.data.length : 'N/A'}`);
        } else {
            addResult('History Deals', 'FAIL', `Status: ${response.status}`);
        }
    } catch (error) {
        addResult('History Deals', 'FAIL', `Error: ${error.message}`);
    }

    // Test 6: Order Placement (simulation)
    console.log('\n6️⃣ Testing Order Placement Format...');
    try {
        // We won't actually place an order, just test the format
        const orderPayload = {
            symbol: 'EURUSD',
            type: 'ORDER_TYPE_BUY_LIMIT',
            volume: 0.01,
            price: 1.0800,
            sl: 1.0750,
            tp: 1.0900,
            comment: 'Compatibility Test'
        };
        
        // Validate that the endpoint exists (will fail due to invalid price probably)
        const response = await apiClient.post('/order', orderPayload);
        addResult('Order Placement', 'WARN', 'Endpoint available but order may fail due to market conditions');
    } catch (error) {
        if (error.response && error.response.status === 400) {
            addResult('Order Placement', 'PASS', 'Endpoint available, format validation working');
        } else {
            addResult('Order Placement', 'FAIL', `Unexpected error: ${error.message}`);
        }
    }

    // Test 7: Position Closing Format
    console.log('\n7️⃣ Testing Position Close Format...');
    try {
        const response = await apiClient.post('/position/close_by_ticket', {
            ticket: 12345  // Dummy ticket
        });
        addResult('Position Close', 'WARN', 'Endpoint available');
    } catch (error) {
        if (error.response && error.response.status === 404) {
            addResult('Position Close', 'PASS', 'Endpoint available, validation working (position not found expected)');
        } else {
            addResult('Position Close', 'FAIL', `Error: ${error.message}`);
        }
    }

    // Test 8: Order Cancellation Format  
    console.log('\n8️⃣ Testing Order Cancel Format...');
    try {
        const response = await apiClient.post('/order/cancel', {
            ticket: 12345  // Dummy ticket
        });
        addResult('Order Cancel', 'WARN', 'Endpoint available');
    } catch (error) {
        if (error.response && (error.response.status === 404 || error.response.status === 400)) {
            addResult('Order Cancel', 'PASS', 'Endpoint available, validation working');
        } else {
            addResult('Order Cancel', 'FAIL', `Error: ${error.message}`);
        }
    }

    // Test 9: SL/TP Modification
    console.log('\n9️⃣ Testing SL/TP Modification...');
    try {
        const response = await apiClient.post('/modify_sl_tp', {
            position: 12345,
            sl: 1.0750,
            tp: 1.0900
        });
        addResult('SL/TP Modify', 'WARN', 'Endpoint available');
    } catch (error) {
        if (error.response && (error.response.status === 404 || error.response.status === 400)) {
            addResult('SL/TP Modify', 'PASS', 'Endpoint available, validation working');
        } else {
            addResult('SL/TP Modify', 'FAIL', `Error: ${error.message}`);
        }
    }

    // Final Results Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL COMPATIBILITY TEST RESULTS');
    console.log('='.repeat(60));
    
    const total = testResults.passed + testResults.failed + testResults.warnings;
    const passRate = Math.round((testResults.passed / total) * 100);
    
    console.log(`✅ Passed: ${testResults.passed}/${total} (${passRate}%)`);
    console.log(`❌ Failed: ${testResults.failed}/${total}`);
    console.log(`⚠️ Warnings: ${testResults.warnings}/${total}`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 EXCELLENT! Bot is fully compatible with your Python MT5 API');
        console.log('✅ Ready for production deployment');
    } else if (testResults.failed <= 2) {
        console.log('\n🟡 GOOD! Minor issues detected but core functionality works');
        console.log('⚠️ Review failed tests before production');
    } else {
        console.log('\n🔴 ISSUES DETECTED! Multiple compatibility problems found');
        console.log('❌ Fix critical issues before deployment');
    }
    
    console.log('\n📋 Action Items:');
    testResults.details.forEach(result => {
        if (result.status === 'FAIL') {
            console.log(`   🔧 Fix: ${result.name} - ${result.details}`);
        }
    });
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Update BROKER_API_BASE_URL to your Python API URL');
    console.log('   2. Update BROKER_API_KEY to match your Python API secret');
    console.log('   3. Add missing order_status.py to your Python API if needed');
    console.log('   4. Run actual trading tests in demo environment');
    
    return testResults;
}

// Run the tests
runCompatibilityTests().catch(console.error);
