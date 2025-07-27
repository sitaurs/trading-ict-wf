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
    if (responseData && typeof responseData === 'object' && responseData.message && responseData.result) {
        log.info(`[BROKER HANDLER] Sukses! Pesan dari API: "${responseData.message}"`);
        return responseData.result;
    }
    log.error('[BROKER HANDLER] Respons dari API tidak valid atau kosong:', responseData);
    return null;
}

/**
 * [POST /order] Membuka posisi pasar atau memasang pending order.
 */
async function openOrder(orderData) {
  try {
    log.info('[BROKER HANDLER] Mengirim permintaan Buka Order ke API:', orderData);
    const response = await apiClient.post('/order', orderData);
    const result = validateApiResponse(response.data);
    if (!result) {
        throw new Error('Respons dari API broker (openOrder) tidak memiliki format yang diharapkan.');
    }
    return result;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error(`[BROKER HANDLER] Gagal saat membuka order:`, { 
      error: errorMessage, 
      statusCode: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack,
      requestData: { symbol, type, volume, price, sl, tp }
    });
    throw new Error(`Gagal membuka order: ${errorMessage}`);
  }
}

/**
 * [GET /get_positions] Mengambil semua posisi yang sedang aktif.
 */
async function getActivePositions() {
  try {
    const response = await apiClient.get('/get_positions');
    if (Array.isArray(response.data)) {
        return response.data;
    }
    log.warn('[BROKER HANDLER] /get_positions tidak mengembalikan array, mengasumsikan tidak ada posisi aktif.');
    return [];
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    log.error(`[BROKER HANDLER] Gagal mengambil posisi aktif:`, { 
      error: errorMessage, 
      statusCode: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack
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
      log.error('[BROKER HANDLER] Tidak bisa mencari info deal, positionId tidak disediakan.');
      return null;
  }

  log.info(`[BROKER HANDLER] Mencari history deals yang SESUAI untuk Position ID: ${positionId}`);

  try {
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - 48 * 60 * 60 * 1000); // 48 jam yang lalu

      const url = `/history_deals_get?from_date=${fromDate.toISOString()}&to_date=${toDate.toISOString()}&position=${positionId}`;
      const response = await apiClient.get(url);
      const deals = response.data;

      if (!deals || !Array.isArray(deals) || deals.length === 0) {
          log.info(`[BROKER HANDLER] Tidak ada history deals untuk posisi ${positionId}.`);
          return null;
      }

      const closingDeal = deals
          .filter(deal => deal.entry === 1 && deal.position_id === positionId)
          .sort((a, b) => (b.time_msc || b.time || 0) - (a.time_msc || a.time || 0))[0];

      if (closingDeal) {
          log.info(`[BROKER HANDLER] SUKSES! Closing deal yang valid ditemukan untuk position ${positionId}:`, closingDeal);
          return closingDeal;
      } else {
          log.warn(`[BROKER HANDLER] PERINGATAN: Tidak ada closing deal yang cocok untuk Position ID ${positionId}.`);
          return null;
      }

  } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      log.error(`[BROKER HANDLER] Gagal mengambil history deals untuk position ${positionId}:`, { 
        error: errorMessage, 
        positionId,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        stack: error.stack
      });
      return null;
  }
}

/**
* [GET /history_deals_get] Mengambil semua deal hari ini dan menghitung total profit.
*/
async function getTodaysProfit() {
  log.info(`[BROKER HANDLER] Menghitung profit hari ini...`);
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);

  try {
      const response = await apiClient.get(`/history_deals_get?from_date=${fromDate.toISOString()}&to_date=${toDate.toISOString()}`);
      const deals = response.data;
      if (!deals || !Array.isArray(deals) || deals.length === 0) return 0;

      const totalProfit = deals.reduce((sum, deal) => sum + deal.profit, 0);
      return totalProfit;
  } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      log.error(`[BROKER HANDLER] Gagal mengambil profit hari ini:`, { 
        error: errorMessage, 
        statusCode: error.response?.status,
        responseData: error.response?.data,
        stack: error.stack,
        dateRange: { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() }
      });
      return 0;
  }
}

// Ekspor semua fungsi yang akan digunakan oleh modul lain.
// Sekarang semuanya sudah didefinisikan dengan benar.
module.exports = {
  openOrder,
  closePosition,
  cancelPendingOrder,
  getActivePositions,
  getClosingDealInfo,
  getTodaysProfit,
  modifyPosition
};
