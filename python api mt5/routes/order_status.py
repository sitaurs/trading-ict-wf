from flask import Blueprint, jsonify, request
import MetaTrader5 as mt5
import logging
from flasgger import swag_from
from auth import api_key_required

order_status_bp = Blueprint('order_status', __name__)
logger = logging.getLogger(__name__)

@order_status_bp.route('/order/status/<int:ticket>', methods=['GET'])
@api_key_required
@swag_from({
    'tags': ['Order'],
    'parameters': [
        {
            'name': 'ticket',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'Order ticket number to check status.'
        }
    ],
    'responses': {
        200: {
            'description': 'Order status retrieved successfully.',
            'schema': {
                'type': 'object',
                'properties': {
                    'ticket': {'type': 'integer'},
                    'status': {'type': 'string'},
                    'state': {'type': 'integer'},
                    'type': {'type': 'integer'},
                    'symbol': {'type': 'string'},
                    'volume': {'type': 'number'},
                    'price_open': {'type': 'number'},
                    'sl': {'type': 'number'},
                    'tp': {'type': 'number'},
                    'time_setup': {'type': 'integer'},
                    'comment': {'type': 'string'}
                }
            }
        },
        404: {
            'description': 'Order not found or no longer exists.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def get_order_status_endpoint(ticket):
    """
    Get Order Status by Ticket
    ---
    description: Retrieve the current status of an order using its ticket number.
    This endpoint checks both active positions and pending orders.
    """
    try:
        if not mt5.initialize():
            logger.error("MT5 initialize failed on /order/status")
            return jsonify({"error": "MT5 initialize failed"}), 500
        
        # Check if it's an active position first
        positions = mt5.positions_get(ticket=ticket)
        if positions and len(positions) > 0:
            position = positions[0]
            position_dict = position._asdict()
            position_dict['status'] = 'ACTIVE'
            position_dict['state'] = 'FILLED'
            logger.info(f"Order #{ticket} found as active position")
            return jsonify(position_dict), 200
        
        # Check if it's a pending order
        orders = mt5.orders_get(ticket=ticket)
        if orders and len(orders) > 0:
            order = orders[0]
            order_dict = order._asdict()
            order_dict['status'] = 'PENDING'
            logger.info(f"Order #{ticket} found as pending order")
            return jsonify(order_dict), 200
        
        # Check historical orders/deals (order was executed or cancelled)
        from datetime import datetime, timedelta
        to_date = datetime.now()
        from_date = to_date - timedelta(days=7)  # Check last 7 days
        
        # Check historical orders first
        history_orders = mt5.history_orders_get(from_date, to_date, ticket=ticket)
        if history_orders and len(history_orders) > 0:
            order = history_orders[0]
            order_dict = order._asdict()
            
            # Determine status based on order state
            if order.state == mt5.ORDER_STATE_FILLED:
                order_dict['status'] = 'FILLED'
            elif order.state == mt5.ORDER_STATE_CANCELED:
                order_dict['status'] = 'CANCELLED'
            elif order.state == mt5.ORDER_STATE_REJECTED:
                order_dict['status'] = 'REJECTED'
            elif order.state == mt5.ORDER_STATE_EXPIRED:
                order_dict['status'] = 'EXPIRED'
            else:
                order_dict['status'] = 'UNKNOWN'
            
            logger.info(f"Order #{ticket} found in history with status: {order_dict['status']}")
            return jsonify(order_dict), 200
        
        # Check historical deals
        history_deals = mt5.history_deals_get(from_date, to_date, ticket=ticket)
        if history_deals and len(history_deals) > 0:
            deal = history_deals[0]
            deal_dict = deal._asdict()
            deal_dict['status'] = 'CLOSED'
            deal_dict['ticket'] = ticket
            logger.info(f"Order #{ticket} found as closed deal")
            return jsonify(deal_dict), 200
        
        # Order not found anywhere
        logger.warning(f"Order #{ticket} not found in any MT5 records")
        return jsonify({
            "error": f"Order with ticket #{ticket} not found",
            "ticket": ticket,
            "status": "NOT_FOUND"
        }), 404
        
    except Exception as e:
        logger.exception(f"CRITICAL ERROR in /order/status/{ticket} endpoint")
        return jsonify({"error": "Internal server error"}), 500

@order_status_bp.route('/order/status', methods=['GET'])
@api_key_required  
@swag_from({
    'tags': ['Order'],
    'parameters': [
        {
            'name': 'ticket',
            'in': 'query',
            'type': 'integer',
            'required': True,
            'description': 'Order ticket number to check status.'
        }
    ],
    'responses': {
        200: {
            'description': 'Order status retrieved successfully.',
            'schema': {
                'type': 'object',
                'properties': {
                    'ticket': {'type': 'integer'},
                    'status': {'type': 'string'},
                    'state': {'type': 'integer'},
                    'type': {'type': 'integer'},
                    'symbol': {'type': 'string'},
                    'volume': {'type': 'number'},
                    'price_open': {'type': 'number'},
                    'sl': {'type': 'number'},
                    'tp': {'type': 'number'},
                    'time_setup': {'type': 'integer'},
                    'comment': {'type': 'string'}
                }
            }
        },
        400: {
            'description': 'Missing ticket parameter.'
        },
        404: {
            'description': 'Order not found or no longer exists.'
        },
        500: {
            'description': 'Internal server error.'
        }
    }
})
def get_order_status_query_endpoint():
    """
    Get Order Status by Query Parameter
    ---
    description: Alternative endpoint to retrieve order status using query parameter instead of path parameter.
    """
    try:
        ticket = request.args.get('ticket')
        if not ticket:
            return jsonify({"error": "Ticket parameter is required"}), 400
        
        try:
            ticket = int(ticket)
        except ValueError:
            return jsonify({"error": "Ticket must be a valid integer"}), 400
        
        # Reuse the main logic from the path parameter endpoint
        return get_order_status_endpoint(ticket)
        
    except Exception as e:
        logger.exception("CRITICAL ERROR in /order/status (query) endpoint")
        return jsonify({"error": "Internal server error"}), 500
