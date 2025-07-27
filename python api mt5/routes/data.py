from flask import Blueprint, jsonify, request
import MetaTrader5 as mt5
import logging
from datetime import datetime
import pytz
import pandas as pd
from flasgger import swag_from
from lib import get_timeframe

data_bp = Blueprint('data', __name__)
logger = logging.getLogger(__name__)

@data_bp.route('/fetch_data_pos', methods=['GET'])
@swag_from({
    'tags': ['Data'],
    'parameters': [
        {
            'name': 'symbol',
            'in': 'query',
            'type': 'string',
            'required': True,
            'description': 'Symbol name to fetch data for.'
        },
        {
            'name': 'timeframe',
            'in': 'query',
            'type': 'string',
            'required': False,
            'default': 'M1',
            'description': 'Timeframe for the data (e.g., M1, M5, H1).'
        },
        {
            'name': 'num_bars',
            'in': 'query',
            'type': 'integer',
            'required': False,
            'default': 100,
            'description': 'Number of bars to fetch.'
        }
    ],
    'responses': {
        200: {
            'description': 'Data fetched successfully.',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'time': {'type': 'string', 'format': 'date-time'},
                        'open': {'type': 'number'},
                        'high': {'type': 'number'},
                        'low': {'type': 'number'},
                        'close': {'type': 'number'},
                        'tick_volume': {'type': 'integer'},
                        'spread': {'type': 'integer'},
                        'real_volume': {'type': 'integer'}
                    }
                }
            }
        },
        400: {
            'description': 'Invalid request parameters.'
        },
        404: {
            'description': 'Failed to get rates data.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def fetch_data_pos_endpoint():
    """
    Fetch Data from Position
    ---
    description: Retrieve historical price data for a given symbol starting from a specific position.
    """
    try:
        symbol = request.args.get('symbol')
        timeframe = request.args.get('timeframe', 'M1')
        num_bars = int(request.args.get('num_bars', 100))
        
        if not symbol:
            return jsonify({"error": "Symbol parameter is required"}), 400

        mt5_timeframe = get_timeframe(timeframe)
        
        rates = mt5.copy_rates_from_pos(symbol, mt5_timeframe, 0, num_bars)
        if rates is None:
            return jsonify({"error": "Failed to get rates data"}), 404
        
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        
        return jsonify(df.to_dict(orient='records'))
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in fetch_data_pos: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@data_bp.route('/fetch_data_range', methods=['GET'])
@swag_from({
    'tags': ['Data'],
    'parameters': [
        {
            'name': 'symbol',
            'in': 'query',
            'type': 'string',
            'required': True,
            'description': 'Symbol name to fetch data for.'
        },
        {
            'name': 'timeframe',
            'in': 'query',
            'type': 'string',
            'required': False,
            'default': 'M1',
            'description': 'Timeframe for the data (e.g., M1, M5, H1).'
        },
        {
            'name': 'start',
            'in': 'query',
            'type': 'string',
            'required': True,
            'format': 'date-time',
            'description': 'Start datetime in ISO format.'
        },
        {
            'name': 'end',
            'in': 'query',
            'type': 'string',
            'required': True,
            'format': 'date-time',
            'description': 'End datetime in ISO format.'
        }
    ],
    'responses': {
        200: {
            'description': 'Data fetched successfully.',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'time': {'type': 'string', 'format': 'date-time'},
                        'open': {'type': 'number'},
                        'high': {'type': 'number'},
                        'low': {'type': 'number'},
                        'close': {'type': 'number'},
                        'tick_volume': {'type': 'integer'},
                        'spread': {'type': 'integer'},
                        'real_volume': {'type': 'integer'}
                    }
                }
            }
        },
        400: {
            'description': 'Invalid request parameters.'
        },
        404: {
            'description': 'Failed to get rates data.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def fetch_data_range_endpoint():
    """
    Fetch Data within a Date Range
    ---
    description: Retrieve historical price data for a given symbol within a specified date range.
    """
    try:
        symbol = request.args.get('symbol')
        timeframe = request.args.get('timeframe', 'M1')
        start_str = request.args.get('start')
        end_str = request.args.get('end')
        
        if not all([symbol, start_str, end_str]):
            return jsonify({"error": "Symbol, start, and end parameters are required"}), 400

        mt5_timeframe = get_timeframe(timeframe)
        
        # Convert string dates to datetime objects
        start_date = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
        
        rates = mt5.copy_rates_range(symbol, mt5_timeframe, start_date, end_date)
        if rates is None:
            return jsonify({"error": "Failed to get rates data"}), 404
        
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        
        return jsonify(df.to_dict(orient='records'))
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in fetch_data_range: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# =======================================================
# === TAMBAHKAN BLOK KODE BARU INI DI AKHIR FILE ===
# =======================================================
@data_bp.route('/data/tick/<string:symbol>', methods=['GET'])
def get_tick_data(symbol):
    """
    Mengambil data tick terakhir (harga saat ini) untuk simbol tertentu.
    """
    try:
        # Pastikan koneksi ke MT5 aktif
        if not mt5.initialize():
            logger.error("MT5 initialize failed on /data/tick")
            return jsonify({"error": "MT5 initialize failed"}), 500

        # Ambil informasi tick terakhir untuk simbol yang diminta
        tick_info = mt5.symbol_info_tick(symbol)

        # Jika simbol tidak valid atau tidak ada data, kembalikan error 404
        if tick_info is None:
            return jsonify({"error": f"Tidak bisa menemukan data tick untuk simbol '{symbol}'"}), 404

        # Ubah hasil menjadi format dictionary yang bisa dibaca
        tick_data = tick_info._asdict()

        # Ubah timestamp menjadi format waktu yang mudah dibaca (opsional, tapi sangat membantu)
        tick_data['time_iso'] = datetime.fromtimestamp(tick_data['time']).isoformat()

        return jsonify(tick_data)

    except Exception as e:
        logger.exception(f"CRITICAL ERROR in /data/tick for symbol {symbol}")
        return jsonify({"error": "Internal server error"}), 500


# =======================================================
# === SALIN DAN TEMPEL SELURUH BLOK INI KE data.py ANDA ===
# =======================================================
@data_bp.route('/ohlcv', methods=['GET'])
@swag_from({
    'tags': ['Data'],
    'summary': 'Get historical OHLCV data',
    'description': 'Retrieve a specific number of historical OHLCV (Open, High, Low, Close, Volume) bars for a given symbol and timeframe, starting from the most recent bar.',
    'parameters': [
        {
            'name': 'symbol',
            'in': 'query',
            'type': 'string',
            'required': True,
            'description': 'Symbol name to fetch data for (e.g., EURUSD).'
        },
        {
            'name': 'timeframe',
            'in': 'query',
            'type': 'string',
            'required': True,
            'description': 'Timeframe for the data (e.g., M1, M5, H1, D1).'
        },
        {
            'name': 'count',
            'in': 'query',
            'type': 'integer',
            'required': False,
            'default': 100,
            'description': 'Number of bars (candles) to fetch.'
        }
    ],
    'responses': {
        200: {
            'description': 'OHLCV data fetched successfully.',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'time': {'type': 'string', 'format': 'date-time'},
                        'open': {'type': 'number'},
                        'high': {'type': 'number'},
                        'low': {'type': 'number'},
                        'close': {'type': 'number'},
                        'tick_volume': {'type': 'integer'},
                        'spread': {'type': 'integer'},
                        'real_volume': {'type': 'integer'}
                    }
                }
            }
        },
        400: {
            'description': 'Invalid or missing request parameters.'
        },
        404: {
            'description': 'Failed to get rates data from MT5, symbol might be invalid.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def get_ohlcv_data():
    """
    Get OHLCV Data
    ---
    description: Retrieve historical OHLCV data for a given symbol and timeframe.
    """
    try:
        # Ambil parameter dari query URL
        symbol = request.args.get('symbol')
        timeframe_str = request.args.get('timeframe')
        count = int(request.args.get('count', 100))
        
        # Validasi parameter yang wajib ada
        if not symbol or not timeframe_str:
            return jsonify({"error": "Parameters 'symbol' and 'timeframe' are required"}), 400

        # Konversi string timeframe (misal 'H1') ke konstanta MT5
        # Fungsi get_timeframe() ini sudah Anda impor di bagian atas file
        mt5_timeframe = get_timeframe(timeframe_str)
        if mt5_timeframe is None:
            return jsonify({"error": f"Invalid timeframe: {timeframe_str}"}), 400
        
        # Ambil data dari MetaTrader 5
        # Argumen ke-3 (0) berarti mulai dari bar saat ini (paling baru)
        rates = mt5.copy_rates_from_pos(symbol, mt5_timeframe, 0, count)
        
        # Jika MT5 tidak mengembalikan data (misal simbol salah)
        if rates is None or len(rates) == 0:
            logger.error(f"Could not retrieve rates for {symbol} on timeframe {timeframe_str}")
            return jsonify({"error": f"Failed to get OHLCV data for {symbol}"}), 404
        
        # Konversi ke DataFrame Pandas agar mudah diolah
        df = pd.DataFrame(rates)
        
        # --- BLOK PERUBAHAN ZONA WAKTU DIMULAI DI SINI ---

        # 1. Konversi kolom waktu dari Unix timestamp ke datetime yang sadar-UTC
        df['time'] = pd.to_datetime(df['time'], unit='s', utc=True)

        # 2. Tentukan zona waktu Jakarta
        jakarta_tz = pytz.timezone('Asia/Jakarta')

        # 3. Konversi kolom 'time' dari UTC ke zona waktu Jakarta
        df['time'] = df['time'].dt.tz_convert(jakarta_tz)

        # 4. (Opsional) Format ulang ke string agar lebih rapi dan konsisten
        df['time'] = df['time'].dt.strftime('%Y-%m-%d %H:%M:%S %Z')
        
        # --- BLOK PERUBAHAN ZONA WAKTU SELESAI ---

        # Kembalikan data dalam format JSON
        return jsonify(df.to_dict(orient='records'))
    
    except ValueError:
        # Error jika 'count' bukan angka integer
        return jsonify({"error": "Invalid 'count' parameter. Must be an integer."}), 400
    except Exception as e:
        logger.error(f"Error in /ohlcv endpoint: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
