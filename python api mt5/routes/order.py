from flask import Blueprint, jsonify, request
import MetaTrader5 as mt5
import logging
from flasgger import swag_from
from auth import api_key_required

order_bp = Blueprint('order', __name__)
logger = logging.getLogger(__name__)

ORDER_TYPE_MAPPING = {
    "ORDER_TYPE_BUY": mt5.ORDER_TYPE_BUY, "ORDER_TYPE_SELL": mt5.ORDER_TYPE_SELL,
    "ORDER_TYPE_BUY_LIMIT": mt5.ORDER_TYPE_BUY_LIMIT, "ORDER_TYPE_SELL_LIMIT": mt5.ORDER_TYPE_SELL_LIMIT,
    "ORDER_TYPE_BUY_STOP": mt5.ORDER_TYPE_BUY_STOP, "ORDER_TYPE_SELL_STOP": mt5.ORDER_TYPE_SELL_STOP,
    "ORDER_TYPE_BUY_STOP_LIMIT": mt5.ORDER_TYPE_BUY_STOP_LIMIT, "ORDER_TYPE_SELL_STOP_LIMIT": mt5.ORDER_TYPE_SELL_STOP_LIMIT,
}

@order_bp.route('/order', methods=['POST'])
@api_key_required
def trade_order_endpoint():
    try:
        if not mt5.initialize():
            logger.error("MT5 initialize failed on /order")
            return jsonify({"error": "MT5 initialize failed"}), 500
        data = request.get_json(force=True)
        if not data: return jsonify({"error": "Request body tidak boleh kosong"}), 400
        required_fields = ['symbol', 'volume', 'type']
        if not all(field in data for field in required_fields): return jsonify({"error": "Field 'symbol', 'volume', dan 'type' wajib diisi"}), 400
        order_type_str = data['type']
        if order_type_str not in ORDER_TYPE_MAPPING: return jsonify({"error": f"Tipe order '{order_type_str}' tidak valid."}), 400
        order_type = ORDER_TYPE_MAPPING[order_type_str]
        trade_action = mt5.TRADE_ACTION_DEAL if order_type in [mt5.ORDER_TYPE_BUY, mt5.ORDER_TYPE_SELL] else mt5.TRADE_ACTION_PENDING
        request_data = {"action": trade_action, "symbol": data['symbol'], "volume": float(data['volume']), "type": order_type, "deviation": data.get('deviation', 20), "magic": data.get('magic', 23400), "comment": data.get('comment', 'n8n_trade'), "type_time": mt5.ORDER_TIME_GTC, "type_filling": mt5.ORDER_FILLING_IOC}
        if trade_action == mt5.TRADE_ACTION_PENDING:
            if 'price' not in data or data['price'] <= 0: return jsonify({"error": "Parameter 'price' wajib untuk pending order"}), 400
            request_data["price"] = data['price']
        if 'sl' in data and data['sl'] > 0: request_data["sl"] = data['sl']
        if 'tp' in data and data['tp'] > 0: request_data["tp"] = data['tp']
        result = mt5.order_send(request_data)
        if result is None:
            logger.error(f"Gagal mengirim permintaan order. mt5.order_send() mengembalikan None.")
            last_error = mt5.last_error()
            return jsonify({"error": "Failed to send request. order_send() returned None.", "last_error": last_error}), 500
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Order send failed. Retcode: {result.retcode}, Comment: {result.comment}")
            return jsonify({"error": f"Order failed: {result.comment}", "result": result._asdict()}), 400
        return jsonify({"message": "Order sent successfully", "result": result._asdict()})
    except Exception:
        logger.exception("CRITICAL ERROR in /order endpoint")
        return jsonify({"error": "Internal server error"}), 500

@order_bp.route('/order/cancel', methods=['POST'])
@api_key_required
def cancel_pending_order():
    try:
        if not mt5.initialize():
            logger.error("MT5 initialize failed on /order/cancel")
            return jsonify({"error": "MT5 initialize failed"}), 500
        data = request.get_json(force=True)
        if not data or 'ticket' not in data: return jsonify({"error": "Nomor 'ticket' wajib diisi"}), 400
        ticket = data['ticket']
        cancel_request = {
            "action": mt5.TRADE_ACTION_REMOVE,
            "order": ticket
        }
        result = mt5.order_send(cancel_request)
        if result is None:
            logger.error(f"Gagal mengirim permintaan cancel untuk tiket #{ticket}. mt5.order_send() mengembalikan None.")
            last_error = mt5.last_error()
            return jsonify({"error": "Failed to send cancel request. order_send() returned None.", "last_error": last_error}), 500
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Gagal membatalkan order #{ticket}. Code: {result.retcode}")
            return jsonify({"error": f"Gagal membatalkan order: {result.comment}", "result": result._asdict()}), 500
        return jsonify({"message": f"Order #{ticket} berhasil dibatalkan.", "result": result._asdict()})
    except Exception:
        logger.exception(f"CRITICAL ERROR in /order/cancel endpoint")
        return jsonify({"error": "Internal server error"}), 500
