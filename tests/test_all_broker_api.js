require('dotenv').config();
const axios = require('axios');

async function testAllBrokerAPI() {
    console.log('🧪 Testing ALL MT5 Broker API endpoints...\n');
    
    const baseURL = process.env.BROKER_API_BASE_URL || 'https://api.mt5.flx.web.id';
    const apiKey = process.env.BROKER_API_KEY || 'zamani-zamani-nandac-nandac';
    
    console.log(`🔧 Configuration:`);
    console.log(`Base URL: ${baseURL}`);
    console.log(`API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`Header Method: X-API-Key\n`);

    const apiClient = axios.create({
        baseURL: baseURL,
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });

    // Test 1: OHLCV data
    console.log('📊 1. Testing OHLCV endpoint...');
    try {
        const response = await apiClient.get('/ohlcv', {
            params: { symbol: 'EURUSD', timeframe: 'm15', count: 5 }
        });
        console.log(`✅ OHLCV OK - Status: ${response.status}`);
        console.log(`📈 Data count: ${response.data.length}`);
        if (response.data.length > 0) {
            console.log(`📋 Sample candle:`, JSON.stringify(response.data[0], null, 2));
        }
    } catch (error) {
        console.log(`❌ OHLCV FAILED: ${error.message}`);
        if (error.response) {
            console.log(`📄 Status: ${error.response.status}`);
            console.log(`📄 Response:`, error.response.data);
        }
    }

    // Test 2: Get positions
    console.log('\n👥 2. Testing get_positions endpoint...');
    try {
        const response = await apiClient.get('/get_positions');
        console.log(`✅ Positions OK - Status: ${response.status}`);
        console.log(`📊 Response type: ${typeof response.data}, Is Array: ${Array.isArray(response.data)}`);
        console.log(`📊 Positions:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Positions FAILED: ${error.message}`);
        if (error.response) {
            console.log(`📄 Status: ${error.response.status}`);
            console.log(`📄 Response:`, error.response.data);
        }
    }

    // Test 3: Get pending orders
    console.log('\n📋 3. Testing get_orders endpoint...');
    try {
        const response = await apiClient.get('/get_orders');
        console.log(`✅ Orders OK - Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Orders FAILED: ${error.message}`);
        if (error.response) {
            console.log(`📄 Status: ${error.response.status}`);
            console.log(`📄 Response:`, error.response.data);
        }
    }

    // Test 4: Get today's deals/profit
    console.log('\n💰 4. Testing history_deals_get for today...');
    try {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const response = await apiClient.get('/history_deals_get', {
            params: { 
                from_date: yesterday.toISOString(),
                to_date: today.toISOString(),
                position: 0  // Add required position parameter
            }
        });
        console.log(`✅ History deals OK - Status: ${response.status}`);
        console.log(`📊 Response type: ${typeof response.data}, Is Array: ${Array.isArray(response.data)}`);
        console.log(`📊 Deals count: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
            console.log(`📋 Sample deal:`, JSON.stringify(response.data[0], null, 2));
        }
    } catch (error) {
        console.log(`❌ History deals FAILED: ${error.message}`);
        if (error.response) {
            console.log(`📄 Status: ${error.response.status}`);
            console.log(`📄 Response:`, error.response.data);
        }
    }

    // Test 5: Account info
    console.log('\n👤 5. Testing account info endpoint...');
    try {
        const response = await apiClient.get('/account_info');
        console.log(`✅ Account info OK - Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Account info FAILED: ${error.message}`);
        if (error.response) {
            console.log(`📄 Status: ${error.response.status}`);
            console.log(`📄 Response:`, error.response.data);
        }
    }

    // Test 6: Symbol info
    console.log('\n🔍 6. Testing symbol info endpoint...');
    try {
        const response = await apiClient.get('/symbol_info', {
            params: { symbol: 'EURUSD' }
        });
        console.log(`✅ Symbol info OK - Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Symbol info FAILED: ${error.message}`);
        if (error.response) {
            console.log(`📄 Status: ${error.response.status}`);
            console.log(`📄 Response:`, error.response.data);
        }
    }

    // Test 7: Order status (we need a real ticket for this)
    console.log('\n📋 7. Testing order status endpoint (with dummy ticket)...');
    try {
        const response = await apiClient.get('/order/status', {
            params: { ticket: 12345 }
        });
        console.log(`✅ Order status OK - Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Order status FAILED: ${error.message}`);
        if (error.response) {
            console.log(`📄 Status: ${error.response.status}`);
            console.log(`📄 Response:`, error.response.data);
        }
    }

    console.log('\n🎯 Test summary completed! Check the results above for any API issues.');
}

testAllBrokerAPI().catch(console.error);
