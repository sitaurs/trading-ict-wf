/**
 * @fileoverview Module untuk menangani semua interaksi dengan API Broker MT5 kustom.
 * @version 2.1.0 (Perbaikan Final dengan Inklusi modifyPosition)
 */

const axios = require('axios');
const { getLogger } = require('./logger');
const log = getLogger('BrokerHandler');

// Mengambil konfigurasi dari environment variables
const API_BASE_URL = process.env.BROKER_API_BASE_URL;
const API_KEY = process.env.BROKER_API_KEY;

// Validasi awal saat bot dijalankan
if (!API_BASE_URL || !API_KEY) {
  log.error('KESALAHAN FATAL: BROKER_API_BASE_URL dan BROKER_API_KEY harus ada di file .env');
  process.exit(1);
}

// Membuat instance Axios yang akan digunakan untuk semua permintaan
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Fungsi internal untuk memvalidasi respons dari API broker.
 * @param {object} responseData - Objek `response.data` dari Axios.
 * @returns {object|null} Objek result jika valid, atau null jika tidak.
 */
function validateApiResponse(responseData) {
    log.debug('🔍 Validating API response', { 
        responseData,
        hasMessage: !!responseData?.message,
        hasResult: !!responseData?.result,
        timestamp: new Date().toISOString()
    });
    
    if (responseData && typeof responseData === 'object' && responseData.message && responseData.result) {
        log.info(`✅ API Response sukses: "${responseData.message}"`, { 
            result: responseData.result,
            timestamp: new Date().toISOString()
        });
        return responseData.result;
    }
    
    log.error('❌ Respons dari API tidak valid atau kosong', { 
        responseData,
        expectedStructure: { message: 'string', result: 'object' },
        timestamp: new Date().toISOString()
    });
    return null;
}

/**
 * [POST /order] Membuka posisi pasar atau memasang pending order.
 */
async function openOrder(orderData) {
  try {
    log.info('📤 Mengirim permintaan Open Order ke API Broker', { 
        orderData,
        endpoint: '/order',
        method: 'POST',
        timestamp: new Date().toISOString()
    });
    
    const response = await apiClient.post('/order', orderData);
    
    log.debug('📥 Raw response dari API Broker', { 
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        timestamp: new Date().toISOString()
    });
    
    const result = validateApiResponse(response.data);
    if (!result) {
        const errorMsg = 'Respons dari API broker (openOrder) tidak memiliki format yang diharapkan';
        log.error(`❌ ${errorMsg}`, { 
            responseData: response.data,
            expectedFormat: { message: 'string', result: 'object' },
            timestamp: new Date().toISOString()
        });
        throw new Error(errorMsg);
    }
    
    log.info('✅ Order berhasil dibuka', { 
        result,
        orderData,
        timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error('❌ Gagal membuka order', { 
      error: errorMessage, 
      statusCode: error.response?.status,
      responseData: error.response?.data,
      requestData: orderData,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Gagal membuka order: ${errorMessage}`);
  }
}

/**
 * [GET /get_positions] Mengambil semua posisi yang sedang aktif.
 */
async function getActivePositions() {
  try {
    log.info('[BROKER HANDLER] Mengambil daftar posisi aktif', { 
        endpoint: '/get_positions',
        method: 'GET',
        timestamp: new Date().toISOString()
    });
    
    const response = await apiClient.get('/get_positions');
    
    log.debug('📥 Raw response dari /get_positions', { 
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        data: response.data,
        timestamp: new Date().toISOString()
    });
    
    // Enhanced validation for positions endpoint
    if (Array.isArray(response.data)) {
        log.info(`✅ Berhasil mengambil ${response.data.length} posisi aktif`, { 
            positionsCount: response.data.length,
            positions: response.data.map(pos => ({ ticket: pos.ticket, symbol: pos.symbol, type: pos.type })),
            timestamp: new Date().toISOString()
        });
        return response.data;
    } else if (response.data && typeof response.data === 'object' && response.data.message && response.data.result) {
        // Handle standard broker response format
        const result = validateApiResponse(response.data);
        if (result && Array.isArray(result)) {
            log.info(`✅ Berhasil mengambil ${result.length} posisi aktif (via validateApiResponse)`, { 
                positionsCount: result.length,
                timestamp: new Date().toISOString()
            });
            return result;
        }
    }
    
    log.warn('[BROKER HANDLER] /get_positions response format tidak standar, mengasumsikan tidak ada posisi aktif', {
        responseData: response.data,
        expectedFormats: ['Array', '{ message: string, result: Array }'],
        timestamp: new Date().toISOString()
    });
    return [];
    
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error(`[BROKER HANDLER] Gagal mengambil posisi aktif:`, { 
      error: errorMessage, 
      statusCode: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack,
      endpoint: '/get_positions',
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * [POST /order/cancel] Membatalkan pending order.
 */
async function cancelPendingOrder(ticket) {
  try {
    log.info(`[BROKER HANDLER] Mengirim permintaan Batalkan Order untuk tiket #${ticket}`);
    const response = await apiClient.post('/order/cancel', { ticket });
    const result = validateApiResponse(response.data);
    if (!result) {
        throw new Error('Respons dari API broker (cancelPendingOrder) tidak memiliki format yang diharapkan.');
    }
    return result;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error(`[BROKER HANDLER] Gagal membatalkan order #${ticket}:`, { 
      error: errorMessage, 
      ticket,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack
    });
    throw new Error(`Gagal membatalkan order #${ticket}: ${errorMessage}`);
  }
}

/**
 * [POST /position/close_by_ticket] Menutup posisi yang aktif.
 */
async function closePosition(ticket) {
  try {
    log.info(`[BROKER HANDLER] Mengirim permintaan Tutup Posisi untuk tiket #${ticket}`);
    const response = await apiClient.post('/position/close_by_ticket', { ticket });
    const result = validateApiResponse(response.data);
    if (!result) {
        throw new Error('Respons dari API broker (closePosition) tidak memiliki format yang diharapkan.');
    }
    return result;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error(`[BROKER HANDLER] Gagal menutup posisi #${ticket}:`, { 
      error: errorMessage, 
      ticket,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack
    });
    throw new Error(`Gagal menutup posisi #${ticket}: ${errorMessage}`);
  }
}

/**
 * [GET /order/status] Mengambil status order berdasarkan ticket ID.
 * @param {number|string} ticket - Ticket ID dari order yang ingin dicek statusnya
 * @returns {object|null} Status object atau null jika tidak ditemukan
 */
async function getOrderStatus(ticket) {
  try {
    log.info(`[BROKER HANDLER] Mengambil status order untuk tiket #${ticket}`, { 
        ticket,
        endpoint: '/order/status',
        method: 'GET',
        timestamp: new Date().toISOString()
    });
    
    const response = await apiClient.get(`/order/status/${ticket}`);
    
    log.debug('📥 Raw response dari /order/status', { 
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        ticket,
        timestamp: new Date().toISOString()
    });
    
    // Try standard validation first
    const result = validateApiResponse(response.data);
    if (result) {
        log.info(`✅ Status order #${ticket} berhasil diambil`, { 
            ticket,
            orderStatus: result.status || result.state || 'unknown',
            result,
            timestamp: new Date().toISOString()
        });
        return result;
    }
    
    // Fallback for direct response
    if (response.data && typeof response.data === 'object') {
        log.info(`✅ Status order #${ticket} berhasil diambil (direct response)`, { 
            ticket,
            orderStatus: response.data.status || response.data.state || 'unknown',
            data: response.data,
            timestamp: new Date().toISOString()
        });
        return response.data;
    }
    
    log.warn(`[BROKER HANDLER] Status order #${ticket} tidak ditemukan atau format tidak valid`, {
        ticket,
        responseData: response.data,
        timestamp: new Date().toISOString()
    });
    return null;
    
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error(`[BROKER HANDLER] Gagal mengambil status order #${ticket}:`, { 
      error: errorMessage, 
      ticket,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack,
      endpoint: '/order/status',
      timestamp: new Date().toISOString()
    });
    
    // Return null instead of throwing to allow graceful handling
    return null;
  }
}

// ===================================================================================
// == INI FUNGSI YANG HILANG DAN SEKARANG SUDAH DIKEMBALIKAN ==
// ===================================================================================
/**
 * [POST /modify_sl_tp] Mengubah Stop Loss dan/atau Take Profit.
 */
async function modifyPosition(ticket, sl = 0.0, tp = 0.0) {
  try {
    const payload = { position: ticket, sl, tp };
    log.info(`[BROKER HANDLER] Mengirim permintaan Modifikasi Posisi untuk tiket #${ticket}:`, payload);
    const response = await apiClient.post('/modify_sl_tp', payload);

    const result = validateApiResponse(response.data);
    if (!result) {
        throw new Error('Respons dari API broker (modifyPosition) tidak memiliki format yang diharapkan.');
    }
    return result;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error(`[BROKER HANDLER] Gagal memodifikasi posisi #${ticket}:`, { 
      error: errorMessage, 
      ticket,
      sl,
      tp,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack
    });
    throw new Error(`Gagal memodifikasi posisi #${ticket}: ${errorMessage}`);
  }
}
// ===================================================================================

/**
 * [FUNGSI DIPERBAIKI] Mengambil detail deal penutupan dari histori dengan lebih teliti.
 * @param {number} positionId - ID Posisi (biasanya sama dengan tiket order pembuka) yang ingin dicari.
 * @returns {object|null} Objek deal penutupan jika ditemukan, atau null jika tidak.
 */
async function getClosingDealInfo(positionId) {
  if (!positionId) {
      log.error('❌ [getClosingDealInfo] Tidak bisa mencari info deal, positionId tidak disediakan.', {
          timestamp: new Date().toISOString()
      });
      return null;
  }

  log.info(`📤 [getClosingDealInfo] Mencari history deals untuk Position ID: ${positionId}`, {
      positionId,
      timestamp: new Date().toISOString()
  });

  try {
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - 48 * 60 * 60 * 1000); // 48 jam yang lalu

      const url = `/history_deals_get?from_date=${fromDate.toISOString()}&to_date=${toDate.toISOString()}&position=${positionId}`;
      const response = await apiClient.get(url);
      
      log.debug('📥 Raw response dari API history_deals_get', { 
          status: response.status,
          statusText: response.statusText,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
          positionId,
          timestamp: new Date().toISOString()
      });

      // Validate response structure
      if (!response.data) {
          const errorMsg = 'Response data dari history_deals_get kosong atau undefined';
          log.error(`❌ [getClosingDealInfo] ${errorMsg}`, { 
              responseData: response.data,
              positionId,
              timestamp: new Date().toISOString()
          });
          return null;
      }

      if (!Array.isArray(response.data)) {
          const errorMsg = 'Response data dari history_deals_get bukan array';
          log.error(`❌ [getClosingDealInfo] ${errorMsg}`, { 
              responseData: response.data,
              dataType: typeof response.data,
              positionId,
              timestamp: new Date().toISOString()
          });
          return null;
      }

      const deals = response.data;

      if (deals.length === 0) {
          log.info(`ℹ️ [getClosingDealInfo] Tidak ada history deals untuk posisi ${positionId}.`, {
              positionId,
              timestamp: new Date().toISOString()
          });
          return null;
      }

      // Find closing deal (entry === 1) for this position
      const closingDeal = deals
          .filter(deal => {
              const isClosingDeal = deal.entry === 1;
              const matchesPosition = deal.position_id === positionId;
              return isClosingDeal && matchesPosition;
          })
          .sort((a, b) => (b.time_msc || b.time || 0) - (a.time_msc || a.time || 0))[0];

      if (closingDeal) {
          log.info(`✅ [getClosingDealInfo] Closing deal ditemukan untuk position ${positionId}`, {
              closingDeal,
              positionId,
              timestamp: new Date().toISOString()
          });
          return closingDeal;
      } else {
          log.warn(`⚠️ [getClosingDealInfo] Tidak ada closing deal yang cocok untuk Position ID ${positionId}`, {
              totalDeals: deals.length,
              positionId,
              timestamp: new Date().toISOString()
          });
          return null;
      }

  } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      log.error('❌ [getClosingDealInfo] Gagal mengambil history deals', { 
        error: errorMessage, 
        positionId,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return null;
  }
}

// 💰 CACHE FOR DAILY PROFIT - Efficiency optimization
let dailyProfitCache = {
    date: null,
    profit: null,
    lastCalculated: null
};

/**
* [GET /history_deals_get] Mengambil semua deal hari ini dan menghitung total profit.
* ✅ WITH CACHING OPTIMIZATION - Prevents excessive API calls
*/
async function getTodaysProfit() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // 🚀 CHECK CACHE FIRST - Same day? Return cached value
  if (dailyProfitCache.date === today && dailyProfitCache.profit !== null) {
      const timeSinceCache = Date.now() - dailyProfitCache.lastCalculated;
      const cacheValidMinutes = 5; // Cache valid for 5 minutes
      
      if (timeSinceCache < cacheValidMinutes * 60 * 1000) {
          log.info(`💾 [CACHE HIT] Using cached daily profit: ${dailyProfitCache.profit}`, {
              cachedDate: dailyProfitCache.date,
              timeSinceCache: Math.round(timeSinceCache / 1000) + 's',
              profit: dailyProfitCache.profit
          });
          return dailyProfitCache.profit;
      }
  }
  
  log.info(`[BROKER HANDLER] Menghitung profit hari ini (cache miss/expired)...`);
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);

  try {
      log.debug('[BROKER HANDLER] Mengambil history deals', { 
          endpoint: '/history_deals_get',
          dateRange: { 
              fromDate: fromDate.toISOString(), 
              toDate: toDate.toISOString() 
          },
          timestamp: new Date().toISOString()
      });
      
      const response = await apiClient.get(`/history_deals_get?from_date=${fromDate.toISOString()}&to_date=${toDate.toISOString()}`);
      
      log.debug('📥 Raw response dari /history_deals_get', { 
          status: response.status,
          statusText: response.statusText,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
          sampleData: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null,
          timestamp: new Date().toISOString()
      });
      
      let deals = null;
      
      // Enhanced validation for history deals endpoint
      if (Array.isArray(response.data)) {
          deals = response.data;
      } else if (response.data && typeof response.data === 'object' && response.data.message && response.data.result) {
          // Handle standard broker response format
          const result = validateApiResponse(response.data);
          if (result && Array.isArray(result)) {
              deals = result;
          }
      }
      
      if (!deals || deals.length === 0) {
          log.info('[BROKER HANDLER] Tidak ada deals hari ini, profit = 0', { 
              dealsCount: 0,
              totalProfit: 0,
              timestamp: new Date().toISOString()
          });
          return 0;
      }

      const totalProfit = deals.reduce((sum, deal) => {
          const dealProfit = parseFloat(deal.profit) || 0;
          return sum + dealProfit;
      }, 0);
      
      log.info(`[BROKER HANDLER] ✅ Profit hari ini berhasil dihitung`, { 
          dealsCount: deals.length,
          totalProfit: totalProfit,
          dealsDetail: deals.map(deal => ({ 
              ticket: deal.ticket, 
              symbol: deal.symbol, 
              profit: deal.profit,
              time: deal.time 
          })),
          timestamp: new Date().toISOString()
      });
      
      // 💾 UPDATE CACHE with fresh calculation
      dailyProfitCache = {
          date: today,
          profit: totalProfit,
          lastCalculated: Date.now()
      };
      
      log.debug(`💾 [CACHE UPDATE] Daily profit cached`, {
          cachedDate: today,
          cachedProfit: totalProfit,
          cacheTime: new Date().toISOString()
      });
      
      return totalProfit;
      
  } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      log.error(`[BROKER HANDLER] Gagal mengambil profit hari ini:`, { 
        error: errorMessage, 
        statusCode: error.response?.status,
        responseData: error.response?.data,
        stack: error.stack,
        dateRange: { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() },
        timestamp: new Date().toISOString()
      });
      return 0;
  }
}

/**
 * [GET /weekly_performance] Mengambil performa mingguan (mock implementation)
 * ✅ Temporary implementation until broker API supports weekly stats
 */
async function getWeeklyPerformance() {
    try {
        const todayProfit = await getTodaysProfit();
        
        // Mock weekly data based on today's performance
        // TODO: Implement proper weekly calculation when broker API supports it
        return {
            weeklyProfit: todayProfit * 5, // Rough estimate
            totalTrades: 15, // Mock value
            winRate: 75, // Mock value
            todayTrades: 4 // Mock value
        };
    } catch (error) {
        log.error('Failed to get weekly performance:', error.message);
        return {
            weeklyProfit: 0,
            totalTrades: 0,
            winRate: 0,
            todayTrades: 0
        };
    }
}

// Ekspor semua fungsi yang akan digunakan oleh modul lain.
// Sekarang semuanya sudah didefinisikan dengan benar.
module.exports = {
  openOrder,
  closePosition,
  cancelPendingOrder,
  getActivePositions,
  getOrderStatus,
  getClosingDealInfo,
  getTodaysProfit,
  getWeeklyPerformance,
  modifyPosition
};
