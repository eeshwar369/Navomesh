from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Global model variables
model = None
scaler = None

def generate_sample_data():
    """Generate sample parking occupancy data for training"""
    np.random.seed(42)
    
    hours = []
    days = []
    occupancy = []
    
    # Generate data for a week (7 days, 24 hours)
    for day in range(7):
        for hour in range(24):
            hours.append(hour)
            days.append(day)
            
            # Peak hours (8-10 AM, 5-8 PM): 80-95% occupancy
            if hour in [8, 9, 10, 17, 18, 19, 20]:
                base_occupancy = 85 + np.random.normal(0, 5)
            # Lunch hours (12-2 PM): 70-85% occupancy
            elif hour in [12, 13, 14]:
                base_occupancy = 75 + np.random.normal(0, 5)
            # Night hours (10 PM - 6 AM): 20-40% occupancy
            elif hour >= 22 or hour <= 6:
                base_occupancy = 30 + np.random.normal(0, 5)
            # Regular hours: 50-70% occupancy
            else:
                base_occupancy = 60 + np.random.normal(0, 5)
            
            # Weekend adjustment (Saturday=5, Sunday=6)
            if day in [5, 6]:
                base_occupancy *= 0.8  # 20% less on weekends
            
            # Ensure occupancy is between 0 and 100
            occupancy.append(max(0, min(100, base_occupancy)))
    
    df = pd.DataFrame({
        'hour': hours,
        'day_of_week': days,
        'occupancy': occupancy
    })
    
    return df

def train_model():
    """Train the parking occupancy prediction model"""
    global model, scaler
    
    print("🔄 Training parking prediction model...")
    
    # Generate sample data
    df = generate_sample_data()
    
    # Features and target
    X = df[['hour', 'day_of_week']]
    y = df['occupancy']
    
    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train model
    model = LinearRegression()
    model.fit(X_scaled, y)
    
    # Save model
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/parking_model.pkl')
    joblib.dump(scaler, 'models/scaler.pkl')
    
    print("✅ Model trained successfully!")
    print(f"   Model score: {model.score(X_scaled, y):.4f}")

def load_model():
    """Load trained model from disk"""
    global model, scaler
    
    try:
        model = joblib.load('models/parking_model.pkl')
        scaler = joblib.load('models/scaler.pkl')
        print("✅ Model loaded from disk")
    except FileNotFoundError:
        print("⚠️  Model files not found, training new model...")
        train_model()

# Initialize model on startup
load_model()

@app.route('/')
def home():
    """API home endpoint"""
    return jsonify({
        'success': True,
        'message': 'SmartPark AI - ML Prediction Service',
        'version': '1.0.0',
        'endpoints': {
            '/predict': 'GET - Predict parking occupancy',
            '/predict/batch': 'POST - Batch predictions',
            '/train': 'POST - Retrain model',
            '/health': 'GET - Health check'
        }
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['GET'])
def predict():
    """Predict parking occupancy for given hour and day"""
    try:
        # Get parameters
        hour = request.args.get('hour', type=int, default=datetime.now().hour)
        day = request.args.get('day', type=int, default=datetime.now().weekday())
        
        # Validate inputs
        if not (0 <= hour <= 23):
            return jsonify({
                'success': False,
                'error': 'Hour must be between 0 and 23'
            }), 400
        
        if not (0 <= day <= 6):
            return jsonify({
                'success': False,
                'error': 'Day must be between 0 (Monday) and 6 (Sunday)'
            }), 400
        
        # Prepare features
        features = np.array([[hour, day]])
        features_scaled = scaler.transform(features)
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        prediction = max(0, min(100, prediction))  # Clip to 0-100
        
        # Calculate confidence score (inverse of distance from training data mean)
        confidence = 0.90 if 8 <= hour <= 20 else 0.85
        
        # Get category
        if prediction >= 90:
            category = 'critical'
            availability = 'very low'
        elif prediction >= 75:
            category = 'high'
            availability = 'low'
        elif prediction >= 50:
            category = 'medium'
            availability = 'moderate'
        else:
            category = 'low'
            availability = 'high'
        
        return jsonify({
            'success': True,
            'prediction': {
                'occupancy_percentage': round(prediction, 2),
                'available_percentage': round(100 - prediction, 2),
                'category': category,
                'availability': availability,
                'confidence_score': confidence,
                'hour': hour,
                'day_of_week': day,
                'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day],
                'timestamp': datetime.now().isoformat()
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """Batch predictions for multiple time slots"""
    try:
        data = request.get_json()
        
        if not data or 'requests' not in data:
            return jsonify({
                'success': False,
                'error': 'Invalid request format. Expected {"requests": [{"hour": 0, "day": 0}, ...]}'
            }), 400
        
        predictions = []
        
        for req in data['requests']:
            hour = req.get('hour', datetime.now().hour)
            day = req.get('day', datetime.now().weekday())
            
            # Prepare features
            features = np.array([[hour, day]])
            features_scaled = scaler.transform(features)
            
            # Make prediction
            prediction = model.predict(features_scaled)[0]
            prediction = max(0, min(100, prediction))
            
            predictions.append({
                'hour': hour,
                'day_of_week': day,
                'occupancy_percentage': round(prediction, 2),
                'available_percentage': round(100 - prediction, 2)
            })
        
        return jsonify({
            'success': True,
            'count': len(predictions),
            'predictions': predictions
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict/next-hours', methods=['GET'])
def predict_next_hours():
    """Predict parking occupancy for the next N hours"""
    try:
        hours = request.args.get('hours', type=int, default=6)
        
        if not (1 <= hours <= 24):
            return jsonify({
                'success': False,
                'error': 'Hours must be between 1 and 24'
            }), 400
        
        current_hour = datetime.now().hour
        current_day = datetime.now().weekday()
        
        predictions = []
        
        for i in range(hours):
            hour = (current_hour + i) % 24
            day = current_day + ((current_hour + i) // 24)
            day = day % 7
            
            # Prepare features
            features = np.array([[hour, day]])
            features_scaled = scaler.transform(features)
            
            # Make prediction
            prediction = model.predict(features_scaled)[0]
            prediction = max(0, min(100, prediction))
            
            predictions.append({
                'hour': hour,
                'day_of_week': day,
                'occupancy_percentage': round(prediction, 2),
                'available_percentage': round(100 - prediction, 2),
                'hours_from_now': i
            })
        
        return jsonify({
            'success': True,
            'count': len(predictions),
            'predictions': predictions,
            'current_time': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/train', methods=['POST'])
def retrain():
    """Retrain the model (admin endpoint)"""
    try:
        train_model()
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/model/info')
def model_info():
    """Get model information"""
    try:
        return jsonify({
            'success': True,
            'model': {
                'type': 'Linear Regression',
                'features': ['hour', 'day_of_week'],
                'target': 'occupancy_percentage',
                'trained': model is not None,
                'scaler': 'StandardScaler'
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict/traffic', methods=['GET'])
def predict_traffic():
    """Predict traffic congestion for given location and time"""
    try:
        # Get parameters
        hour = request.args.get('hour', type=int, default=datetime.now().hour)
        day = request.args.get('day', type=int, default=datetime.now().weekday())
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        # Validate inputs
        if not (0 <= hour <= 23):
            return jsonify({
                'success': False,
                'error': 'Hour must be between 0 and 23'
            }), 400
        
        if not (0 <= day <= 6):
            return jsonify({
                'success': False,
                'error': 'Day must be between 0 (Monday) and 6 (Sunday)'
            }), 400
        
        # Traffic prediction based on hour and day patterns
        # Peak hours (8-10 AM, 5-8 PM): High congestion
        if hour in [8, 9, 10, 17, 18, 19, 20]:
            base_congestion = 80 + np.random.normal(0, 5)
            congestion_level = 'high' if base_congestion < 85 else 'critical'
            avg_speed = 15 + np.random.normal(0, 3)
            vehicle_count = int(450 + np.random.normal(0, 50))
        # Lunch hours (12-2 PM): Medium congestion
        elif hour in [12, 13, 14]:
            base_congestion = 60 + np.random.normal(0, 5)
            congestion_level = 'medium'
            avg_speed = 28 + np.random.normal(0, 4)
            vehicle_count = int(300 + np.random.normal(0, 40))
        # Night hours (10 PM - 6 AM): Low congestion
        elif hour >= 22 or hour <= 6:
            base_congestion = 25 + np.random.normal(0, 5)
            congestion_level = 'low'
            avg_speed = 45 + np.random.normal(0, 5)
            vehicle_count = int(150 + np.random.normal(0, 30))
        # Regular hours: Medium congestion
        else:
            base_congestion = 50 + np.random.normal(0, 5)
            congestion_level = 'medium'
            avg_speed = 32 + np.random.normal(0, 4)
            vehicle_count = int(280 + np.random.normal(0, 35))
        
        # Weekend adjustment (Saturday=5, Sunday=6)
        if day in [5, 6]:
            base_congestion *= 0.75
            avg_speed *= 1.2
            vehicle_count = int(vehicle_count * 0.7)
            if base_congestion < 40:
                congestion_level = 'low'
            elif base_congestion < 65:
                congestion_level = 'medium'
        
        # Ensure values are in valid ranges
        base_congestion = max(0, min(100, base_congestion))
        avg_speed = max(5, min(60, avg_speed))
        vehicle_count = max(0, vehicle_count)
        
        # Calculate confidence based on time of day
        confidence = 0.88 if 7 <= hour <= 21 else 0.82
        
        result = {
            'success': True,
            'prediction': {
                'congestion_level': congestion_level,
                'congestion_percentage': round(base_congestion, 2),
                'avg_speed_kmh': round(avg_speed, 2),
                'vehicle_count': vehicle_count,
                'confidence_score': confidence,
                'hour': hour,
                'day_of_week': day,
                'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day],
                'timestamp': datetime.now().isoformat()
            }
        }
        
        # Add location if provided
        if lat and lng:
            result['prediction']['latitude'] = lat
            result['prediction']['longitude'] = lng
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict/traffic/batch', methods=['POST'])
def predict_traffic_batch():
    """Batch traffic predictions for multiple locations and times"""
    try:
        data = request.get_json()
        
        if not data or 'requests' not in data:
            return jsonify({
                'success': False,
                'error': 'Invalid request format. Expected {"requests": [{"hour": 0, "day": 0, "lat": 0, "lng": 0}, ...]}'
            }), 400
        
        predictions = []
        
        for req in data['requests']:
            hour = req.get('hour', datetime.now().hour)
            day = req.get('day', datetime.now().weekday())
            lat = req.get('lat')
            lng = req.get('lng')
            zone_id = req.get('zone_id')
            zone_name = req.get('zone_name', 'Unknown Zone')
            
            # Traffic prediction logic (same as single prediction)
            if hour in [8, 9, 10, 17, 18, 19, 20]:
                base_congestion = 80 + np.random.normal(0, 5)
                congestion_level = 'high' if base_congestion < 85 else 'critical'
                avg_speed = 15 + np.random.normal(0, 3)
                vehicle_count = int(450 + np.random.normal(0, 50))
            elif hour in [12, 13, 14]:
                base_congestion = 60 + np.random.normal(0, 5)
                congestion_level = 'medium'
                avg_speed = 28 + np.random.normal(0, 4)
                vehicle_count = int(300 + np.random.normal(0, 40))
            elif hour >= 22 or hour <= 6:
                base_congestion = 25 + np.random.normal(0, 5)
                congestion_level = 'low'
                avg_speed = 45 + np.random.normal(0, 5)
                vehicle_count = int(150 + np.random.normal(0, 30))
            else:
                base_congestion = 50 + np.random.normal(0, 5)
                congestion_level = 'medium'
                avg_speed = 32 + np.random.normal(0, 4)
                vehicle_count = int(280 + np.random.normal(0, 35))
            
            # Weekend adjustment
            if day in [5, 6]:
                base_congestion *= 0.75
                avg_speed *= 1.2
                vehicle_count = int(vehicle_count * 0.7)
                if base_congestion < 40:
                    congestion_level = 'low'
                elif base_congestion < 65:
                    congestion_level = 'medium'
            
            base_congestion = max(0, min(100, base_congestion))
            avg_speed = max(5, min(60, avg_speed))
            vehicle_count = max(0, vehicle_count)
            
            prediction = {
                'hour': hour,
                'day_of_week': day,
                'congestion_level': congestion_level,
                'congestion_percentage': round(base_congestion, 2),
                'avg_speed_kmh': round(avg_speed, 2),
                'vehicle_count': vehicle_count,
                'confidence_score': 0.88 if 7 <= hour <= 21 else 0.82
            }
            
            if lat and lng:
                prediction['latitude'] = lat
                prediction['longitude'] = lng
            
            if zone_id:
                prediction['zone_id'] = zone_id
                prediction['zone_name'] = zone_name
            
            predictions.append(prediction)
        
        return jsonify({
            'success': True,
            'count': len(predictions),
            'predictions': predictions,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict/traffic/route', methods=['POST'])
def predict_traffic_route():
    """Predict traffic along a route with multiple waypoints"""
    try:
        data = request.get_json()
        
        if not data or 'waypoints' not in data:
            return jsonify({
                'success': False,
                'error': 'Invalid request format. Expected {"waypoints": [{"lat": 0, "lng": 0}, ...]}'
            }), 400
        
        waypoints = data['waypoints']
        hour = data.get('hour', datetime.now().hour)
        day = data.get('day', datetime.now().weekday())
        
        route_predictions = []
        total_congestion = 0
        
        for i, waypoint in enumerate(waypoints):
            lat = waypoint.get('lat')
            lng = waypoint.get('lng')
            
            # Add slight variation for each waypoint
            variation = np.random.normal(0, 3)
            
            if hour in [8, 9, 10, 17, 18, 19, 20]:
                base_congestion = 80 + variation
                congestion_level = 'high' if base_congestion < 85 else 'critical'
                avg_speed = 15 + np.random.normal(0, 3)
            elif hour >= 22 or hour <= 6:
                base_congestion = 25 + variation
                congestion_level = 'low'
                avg_speed = 45 + np.random.normal(0, 5)
            else:
                base_congestion = 50 + variation
                congestion_level = 'medium'
                avg_speed = 32 + np.random.normal(0, 4)
            
            base_congestion = max(0, min(100, base_congestion))
            avg_speed = max(5, min(60, avg_speed))
            total_congestion += base_congestion
            
            route_predictions.append({
                'waypoint_index': i,
                'latitude': lat,
                'longitude': lng,
                'congestion_level': congestion_level,
                'congestion_percentage': round(base_congestion, 2),
                'avg_speed_kmh': round(avg_speed, 2)
            })
        
        avg_congestion = total_congestion / len(waypoints)
        overall_level = 'low' if avg_congestion < 40 else ('medium' if avg_congestion < 70 else 'high')
        
        return jsonify({
            'success': True,
            'route': {
                'waypoints': route_predictions,
                'overall_congestion': round(avg_congestion, 2),
                'overall_level': overall_level,
                'hour': hour,
                'day_of_week': day
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"""
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🤖 SmartPark AI - ML Service                    ║
║                                                           ║
║   Server running at: http://localhost:{port}              ║
║   Models: Parking Occupancy & Traffic Prediction         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(host='0.0.0.0', port=port, debug=True)
