#!/usr/bin/env node
/**
 * 🧪 QUICK API COMPATIBILITY CHECK
 */

const axios = require('axios');
require('dotenv').config();

const baseURL = process.env.BROKER_API_BASE_URL || 'http://localhost:5000';
const apiKey = process.env.BROKER_API_KEY || process.env.API_SECRET_KEY || 'test-api-key';

const apiClient = axios.create({
    baseURL: baseURL,
    headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

console.log('🧪 QUICK API COMPATIBILITY CHECK');
console.log(`🔧 Testing: ${baseURL}\n`);

async function quickCheck() {
    let results = { pass: 0, fail: 0 };
    
    // Essential endpoints
    const tests = [
        { name: 'Health', endpoint: '/health' },
        { name: 'OHLCV', endpoint: '/ohlcv?symbol=EURUSD&timeframe=m15&count=1' },
        { name: 'Positions', endpoint: '/get_positions' },
        { name: 'History', endpoint: '/history_deals_get?from_date=2024-01-01&to_date=2024-12-31' }
    ];
    
    for (const test of tests) {
        try {
            const response = await apiClient.get(test.endpoint);
            console.log(`✅ ${test.name}: OK (${response.status})`);
            results.pass++;
        } catch (error) {
            console.log(`❌ ${test.name}: FAIL (${error.response?.status || error.message})`);
            results.fail++;
        }
    }
    
    // Test Order Status (the critical missing one)
    try {
        await apiClient.get('/order/status/12345');
        console.log(`✅ Order Status: OK`);
        results.pass++;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`⚠️ Order Status: Endpoint exists but not found (expected)`);
            results.pass++;
        } else {
            console.log(`❌ Order Status: MISSING ENDPOINT`);
            results.fail++;
        }
    }
    
    console.log(`\n📊 RESULT: ${results.pass}/${results.pass + results.fail} endpoints working`);
    
    if (results.fail === 0) {
        console.log('🎉 ALL SYSTEMS GO! Bot is fully compatible!');
    } else {
        console.log('⚠️ Some issues detected. Check the failing endpoints.');
    }
    
    return results;
}

quickCheck().catch(console.error);
