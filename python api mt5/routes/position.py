from flask import Blueprint, jsonify, request
import MetaTrader5 as mt5
import logging
from lib import close_position, close_all_positions, get_positions
from flasgger import swag_from
from auth import api_key_required

position_bp = Blueprint('position', __name__)
logger = logging.getLogger(__name__)

@position_bp.route('/close_position', methods=['POST'])
@api_key_required
@swag_from({
    'tags': ['Position'],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'position': {
                        'type': 'object',
                        'properties': {
                            'type': {'type': 'integer'},
                            'ticket': {'type': 'integer'},
                            'symbol': {'type': 'string'},
                            'volume': {'type': 'number'}
                        },
                        'required': ['type', 'ticket', 'symbol', 'volume']
                    }
                },
                'required': ['position']
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Position closed successfully.',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'result': {
                        'type': 'object',
                        'properties': {
                            'retcode': {'type': 'integer'},
                            'order': {'type': 'integer'},
                            'magic': {'type': 'integer'},
                            'price': {'type': 'number'},
                            'symbol': {'type': 'string'},
                            # Add other relevant fields as needed
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Bad request or failed to close position.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def close_position_endpoint():
    """
    Close a Specific Position
    ---
    description: Close a specific trading position based on the provided position data.
    """
    try:
        data = request.get_json()
        if not data or 'position' not in data:
            return jsonify({"error": "Position data is required"}), 400
        
        result = close_position(data['position'])
        if result is None:
            return jsonify({"error": "Failed to close position"}), 400
        
        return jsonify({"message": "Position closed successfully", "result": result._asdict()})
    
    except Exception as e:
        logger.error(f"Error in close_position: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@position_bp.route('/close_all_positions', methods=['POST'])
@api_key_required
@swag_from({
    'tags': ['Position'],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': False,
            'schema': {
                'type': 'object',
                'properties': {
                    'order_type': {'type': 'string', 'enum': ['BUY', 'SELL', 'all'], 'default': 'all'},
                    'magic': {'type': 'integer'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Closed positions successfully.',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'results': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'retcode': {'type': 'integer'},
                                'order': {'type': 'integer'},
                                'magic': {'type': 'integer'},
                                'price': {'type': 'number'},
                                'symbol': {'type': 'string'},
                                # Add other relevant fields as needed
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Bad request or no positions were closed.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def close_all_positions_endpoint():
    """
    Close All Positions
    ---
    description: Close all open trading positions based on optional filters like order type and magic number.
    """
    try:
        data = request.get_json() or {}
        order_type = data.get('order_type', 'all')
        magic = data.get('magic')
        
        results = close_all_positions(order_type, magic)
        if not results:
            return jsonify({"message": "No positions were closed"}), 200
        
        return jsonify({
            "message": f"Closed {len(results)} positions",
            "results": [result._asdict() for result in results]
        })
    
    except Exception as e:
        logger.error(f"Error in close_all_positions: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# TEMPELKAN KODE BARU INI
@position_bp.route('/modify_sl_tp', methods=['POST'])
@api_key_required
def modify_sl_tp_endpoint():
    """
    Memodifikasi Stop Loss (SL) dan Take Profit (TP) untuk posisi yang berjalan.
    """
    position_ticket = None
    try:
        if not mt5.initialize():
            logger.error("MT5 initialize failed on /modify_sl_tp")
            return jsonify({"error": "MT5 initialize failed"}), 500

        data = request.get_json(force=True)
        if not data or 'position' not in data:
            return jsonify({"error": "Nomor tiket 'position' wajib diisi"}), 400

        position_ticket = data['position']
        sl = data.get('sl', 0.0)  # Default ke 0.0 jika tidak ada
        tp = data.get('tp', 0.0)  # Default ke 0.0 jika tidak ada

        if sl == 0.0 and tp == 0.0:
            return jsonify({"error": "Anda harus menyediakan nilai 'sl' atau 'tp'"}), 400

        # Dapatkan info posisi untuk mengambil simbol (diperlukan oleh MT5)
        pos = mt5.positions_get(ticket=position_ticket)
        if not pos:
            return jsonify({"error": f"Posisi dengan tiket {position_ticket} tidak ditemukan."}), 404

        request_data = {
            "action": mt5.TRADE_ACTION_SLTP,
            "position": position_ticket,
            "symbol": pos[0].symbol, # Ambil simbol dari posisi yang ada
            "sl": sl,
            "tp": tp
        }

        result = mt5.order_send(request_data)

        if result is None:
            logger.error(f"Gagal mengirim permintaan SL/TP untuk tiket #{position_ticket}. mt5.order_send() mengembalikan None.")
            last_error = mt5.last_error()
            return jsonify({
                "error": "Failed to send SL/TP request to terminal. order_send() returned None.",
                "last_error": last_error
            }), 500

        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Gagal memodifikasi SL/TP untuk #{position_ticket}. Comment: {result.comment}")
            return jsonify({"error": f"Gagal memodifikasi SL/TP: {result.comment}", "result": result._asdict()}), 500
        
        return jsonify({"message": f"SL/TP untuk posisi #{position_ticket} berhasil dimodifikasi.", "result": result._asdict()})

    except Exception as e:
        logger.exception(f"CRITICAL ERROR in /modify_sl_tp endpoint for ticket #{position_ticket}")
        return jsonify({"error": "Internal server error"}), 500

@position_bp.route('/get_positions', methods=['GET'])
@api_key_required
@swag_from({
    'tags': ['Position'],
    'parameters': [
        {
            'name': 'magic',
            'in': 'query',
            'type': 'integer',
            'required': False,
            'description': 'Magic number to filter positions.'
        }
    ],
    'responses': {
        200: {
            'description': 'Positions retrieved successfully.',
            'schema': {
                'type': 'object',
                'properties': {
                    'positions': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'ticket': {'type': 'integer'},
                                'time': {'type': 'string', 'format': 'date-time'},
                                'type': {'type': 'integer'},
                                'magic': {'type': 'integer'},
                                'symbol': {'type': 'string'},
                                'volume': {'type': 'number'},
                                'price_open': {'type': 'number'},
                                'sl': {'type': 'number'},
                                'tp': {'type': 'number'},
                                'price_current': {'type': 'number'},
                                'swap': {'type': 'number'},
                                'profit': {'type': 'number'},
                                'comment': {'type': 'string'},
                                'external_id': {'type': 'string'}
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Bad request or failed to retrieve positions.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def get_positions_endpoint():
    """
    Get Open Positions
    ---
    description: Retrieve all open trading positions, optionally filtered by magic number.
    """
    try:
        magic = request.args.get('magic', type=int)

        positions_df = get_positions(magic)

        if positions_df is None:
            return jsonify({"error": "Failed to retrieve positions"}), 500
            
        if positions_df.empty:
            return jsonify({"positions": []}), 200
            
        return jsonify(positions_df.to_dict(orient='records')), 200
    
    except Exception as e:
        logger.error(f"Error in get_positions: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@position_bp.route('/positions_total', methods=['GET'])
@api_key_required
@swag_from({
    'tags': ['Position'],
    'responses': {
        200: {
            'description': 'Total number of open positions retrieved successfully.',
            'schema': {
                'type': 'object',
                'properties': {
                    'total': {'type': 'integer'}
                }
            }
        },
        400: {
            'description': 'Failed to get positions total.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def positions_total_endpoint():
    """
    Get Total Open Positions
    ---
    description: Retrieve the total number of open trading positions.
    """
    try:
        total = mt5.positions_total()
        if total is None:
            return jsonify({"error": "Failed to get positions total"}), 400
        
        return jsonify({"total": total})
    
    except Exception as e:
        logger.error(f"Error in positions_total: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500




# ======================================================================
# === TAMBAHKAN BLOK KODE BARU INI DI BAGIAN BAWAH FILE position.py ===
# ======================================================================
# =======================================================
# === TEMPELKAN (PASTE) SELURUH BLOK INI ===
# =======================================================
@position_bp.route('/position/close_by_ticket', methods=['POST'])
@api_key_required
def close_position_by_ticket_simple():
    """
    Menutup posisi trading hanya berdasarkan nomor tiket.
    """
    ticket = None
    try:
        if not mt5.initialize():
            logger.error("MT5 initialize failed on /position/close_by_ticket")
            return jsonify({"error": "MT5 initialize failed"}), 500
        
        data = request.get_json(force=True)
        if not data or 'ticket' not in data: return jsonify({"error": "Nomor 'ticket' wajib diisi"}), 400
        
        ticket = data['ticket']
        position = mt5.positions_get(ticket=ticket)
        
        if not position: return jsonify({"error": f"Posisi dengan tiket {ticket} tidak ditemukan."}), 404
        
        position = position[0]
        order_type_close = mt5.ORDER_TYPE_SELL if position.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
        tick = mt5.symbol_info_tick(position.symbol)
        
        if tick is None: return jsonify({"error": "Gagal mendapatkan harga tick"}), 500
        
        price = tick.ask if order_type_close == mt5.ORDER_TYPE_SELL else tick.bid
        close_request = {"action": mt5.TRADE_ACTION_DEAL, "position": ticket, "symbol": position.symbol, "volume": position.volume, "type": order_type_close, "price": price, "deviation": 20, "comment": f"Closed by API #{ticket}", "type_time": mt5.ORDER_TIME_GTC, "type_filling": mt5.ORDER_FILLING_IOC}
        
        result = mt5.order_send(close_request)

        # INI PERBAIKANNYA - MENAMBAHKAN PENGECEKAN 'None'
        if result is None:
            logger.error(f"Gagal mengirim permintaan close untuk tiket #{ticket}. mt5.order_send() mengembalikan None.")
            last_error = mt5.last_error()
            return jsonify({
                "error": "Failed to send close request to terminal. order_send() returned None.",
                "last_error": last_error
            }), 500

        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Gagal menutup posisi #{ticket}. Comment: {result.comment}")
            return jsonify({"error": f"Gagal menutup posisi: {result.comment}", "result": result._asdict()}), 500
        
        return jsonify({"message": f"Posisi #{ticket} berhasil ditutup.", "result": result._asdict()})
        
    except Exception as e:
        logger.exception(f"CRITICAL ERROR in /position/close_by_ticket endpoint for ticket #{ticket}")
        return jsonify({"error": "Internal server error"}), 500
