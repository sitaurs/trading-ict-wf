import os
from functools import wraps
from flask import request, jsonify

def api_key_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        secret_key = os.environ.get('API_SECRET_KEY')
        provided_key = request.headers.get('X-API-Key')

        if not secret_key or not provided_key or provided_key != secret_key:
            return jsonify({"error": "Unauthorized Access"}), 401

        return f(*args, **kwargs)
    return decorated_function
