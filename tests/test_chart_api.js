const axios = require('axios');

async function testChartImgAPI() {
    console.log('Testing Chart-Img API...');
    
    const apiKey = '5JmnmEwQbZatXSLiMgewV9YS61Dgyvcm4O8ttJ7G';
    
    try {
        const response = await axios.post('https://api.chart-img.com/v2/tradingview/advanced-chart', {
            symbol: 'OANDA:USDCHF',
            interval: '4h',
            studies: [
                { name: 'Moving Average Exponential', input: { length: 50 } }
            ]
        }, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 30000
        });

        console.log('✅ Chart-Img API Success!');
        console.log('Status:', response.status);
        console.log('Content-Type:', response.headers['content-type']);
        console.log('Data size:', response.data.length, 'bytes');
        
        // Check if it's image data
        const isImage = response.headers['content-type'] && response.headers['content-type'].includes('image');
        console.log('Is Image:', isImage);
        
    } catch (error) {
        console.log('❌ Chart-Img API Failed!');
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Headers:', error.response.headers);
            try {
                const responseText = error.response.data.toString();
                console.log('Response:', responseText.substring(0, 500));
            } catch (e) {
                console.log('Could not parse response data');
            }
        }
    }
}

// Also test with different symbols
async function testMultipleSymbols() {
    const symbols = ['OANDA:USDCHF', 'OANDA:USDJPY', 'OANDA:AUDUSD'];
    const apiKey = '5JmnmEwQbZatXSLiMgewV9YS61Dgyvcm4O8ttJ7G';
    
    for (const symbol of symbols) {
        console.log(`\nTesting ${symbol}...`);
        try {
            const response = await axios.post('https://api.chart-img.com/v2/tradingview/advanced-chart', {
                symbol: symbol,
                interval: '4h',
                studies: []
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 10000
            });

            console.log(`✅ ${symbol} OK - Size: ${response.data.length} bytes`);
            
        } catch (error) {
            console.log(`❌ ${symbol} FAILED - ${error.response?.status || error.message}`);
        }
    }
}

testChartImgAPI().then(() => testMultipleSymbols());
