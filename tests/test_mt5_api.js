const axios = require('axios');

async function testMT5API() {
    console.log('Testing MT5 OHLCV API...');
    
    const baseURL = process.env.BROKER_API_BASE_URL || 'https://api.mt5.flx.web.id';
    const apiKey = process.env.BROKER_API_KEY || 'zamani-zamani-nandac-nandac';
    
    const symbols = ['USDCHF', 'USDJPY', 'AUDUSD'];
    
    console.log(`\n🔧 Configuration:`);
    console.log(`Base URL: ${baseURL}`);
    console.log(`API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`Header Method: X-API-Key (consistent with production)`);
    
    for (const symbol of symbols) {
        console.log(`\n📊 Testing OHLCV for ${symbol}...`);
        try {
            const response = await axios.get(`${baseURL}/ohlcv`, {
                params: {
                    symbol: symbol,
                    timeframe: 'm15',
                    count: 10
                },
                headers: {
                    'X-API-Key': apiKey,  // ✅ Changed to match production
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log(`✅ ${symbol} OK - Got ${response.data.length} candles`);
            console.log(`📈 Status: ${response.status} ${response.statusText}`);
            
            if (response.data.length > 0) {
                console.log('📋 Sample data:', JSON.stringify(response.data[0], null, 2));
                
                // Validate data structure
                const firstCandle = response.data[0];
                const hasRequiredFields = ['open', 'high', 'low', 'close'].every(field => 
                    typeof firstCandle[field] === 'number'
                );
                const hasTimeField = firstCandle.time || firstCandle.timestamp;
                
                console.log(`🔍 Data Validation:`);
                console.log(`   - Required OHLC fields: ${hasRequiredFields ? '✅' : '❌'}`);
                console.log(`   - Time field present: ${hasTimeField ? '✅' : '❌'}`);
                console.log(`   - Data type: ${typeof response.data}`);
                console.log(`   - Is Array: ${Array.isArray(response.data)}`);
            }
            
        } catch (error) {
            console.log(`❌ ${symbol} FAILED`);
            console.log('🚨 Error:', error.message);
            if (error.response) {
                console.log('📄 Status:', error.response.status);
                console.log('📄 Response:', JSON.stringify(error.response.data, null, 2));
                console.log('📄 Headers:', error.response.headers);
            }
            if (error.request) {
                console.log('📡 Request config:', {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                    params: error.config?.params
                });
            }
        }
    }
    
    console.log(`\n🧪 Testing Broker Position API...`);
    try {
        const response = await axios.get(`${baseURL}/get_positions`, {
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log(`✅ Positions API OK - Status: ${response.status}`);
        console.log(`📊 Data type: ${typeof response.data}, Is Array: ${Array.isArray(response.data)}`);
        console.log(`📊 Positions count: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
        
        if (response.data && Object.keys(response.data).length > 0) {
            console.log('📋 Sample response:', JSON.stringify(response.data, null, 2));
        }
        
    } catch (error) {
        console.log(`❌ Positions API FAILED: ${error.message}`);
        if (error.response) {
            console.log('📄 Status:', error.response.status);
            console.log('📄 Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testMT5API();
