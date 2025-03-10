from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from geopy.distance import geodesic
import json
import time
import uuid
import os

# مفتاح الأمان (استخدم متغير بيئة لحماية التطبيق في بيئة الإنتاج)
secret_key = os.environ.get("SECRET_KEY", "super_secret_key")

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = secret_key

# ملف تخزين بيانات المشاوير
TRIP_HISTORY_FILE = "trip_history.json"
active_trips = {}

def calculate_fare(start_coords, end_coords, total_trip_time, fuel_price=2.5, fuel_efficiency=15):
   
    distance_km = geodesic(start_coords, end_coords).km
    fuel_used = distance_km / fuel_efficiency
    fuel_cost = fuel_used * fuel_price

    base_fare = 3  # خفضنا الأجرة الأساسية
    cost_per_km = 1.5  # جعلناها أقل من أوبر
    cost_per_minute = 0.4  # خفضناها لجعلها عادلة

    total_fare = base_fare + (cost_per_km * distance_km) + (cost_per_minute * (total_trip_time / 60)) + fuel_cost
    return round(total_fare, 2)

@app.route('/')
def login_page():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get("username")
    if username:
        session['username'] = username
        return redirect(url_for('home'))
    return redirect(url_for('login_page'))

@app.route('/home')
def home():
    if 'username' not in session:
        return redirect(url_for('login_page'))
    return render_template('index.html', username=session.get('username', 'مستخدم مجهول'))

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        start_lat = request.form.get('start_lat', type=float)
        start_lon = request.form.get('start_lon', type=float)
        end_lat = request.form.get('end_lat', type=float)
        end_lon = request.form.get('end_lon', type=float)
        trip_id = request.form.get('trip_id', str) or str(uuid.uuid4())

        if None in (start_lat, start_lon, end_lat, end_lon):
            return jsonify({"error": "إحداثيات غير صحيحة!"})

        start_coords = (start_lat, start_lon)
        end_coords = (end_lat, end_lon)
        total_trip_time = 0

        if trip_id in active_trips:
            trip_data = active_trips[trip_id]
            total_trip_time = time.time() - trip_data["start_time"] - trip_data["paused_time"]

        fare = calculate_fare(start_coords, end_coords, total_trip_time)
        return jsonify({"fare": fare})

    except Exception as e:
        return jsonify({"error": f"حدث خطأ: {str(e)}"})

@app.route('/history')
def history():
    """
    عرض سجل المشاوير
    """
    try:
        if os.path.exists(TRIP_HISTORY_FILE):
            with open(TRIP_HISTORY_FILE, "r", encoding="utf-8") as file:
                trip_history = json.load(file)
        else:
            trip_history = []
    except Exception:
        trip_history = []

    return render_template('history.html', trips=trip_history)

@app.route('/save_trip', methods=['POST'])
def save_trip():
    """
    تخزين بيانات الرحلة بعد إنهائها.
    """
    try:
        start_lat = request.form.get('start_lat', type=float)
        start_lon = request.form.get('start_lon', type=float)
        end_lat = request.form.get('end_lat', type=float)
        end_lon = request.form.get('end_lon', type=float)
        duration = request.form.get('duration', type=float)

        if None in (start_lat, start_lon, end_lat, end_lon, duration):
            return jsonify({"error": "بيانات غير مكتملة!"})

        distance_km = geodesic((start_lat, start_lon), (end_lat, end_lon)).km

        trip_data = {
            "id": str(uuid.uuid4()),
            "start_lat": start_lat,
            "start_lon": start_lon,
            "end_lat": end_lat,
            "end_lon": end_lon,
            "distance_km": round(distance_km, 2),
            "duration_min": round(duration / 60, 2),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        if os.path.exists(TRIP_HISTORY_FILE):
            with open(TRIP_HISTORY_FILE, "r", encoding="utf-8") as file:
                trip_history = json.load(file)
        else:
            trip_history = []

        trip_history.append(trip_data)

        with open(TRIP_HISTORY_FILE, "w", encoding="utf-8") as file:
            json.dump(trip_history, file, ensure_ascii=False, indent=4)

        return jsonify({"success": True, "trip": trip_data})

    except Exception as e:
        return jsonify({"error": f"حدث خطأ: {str(e)}"})

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login_page'))

@app.route('/about')
def about_page():
    return render_template('about.html')

@app.errorhandler(404)
def page_not_found(e):
    return "<h1>404</h1><p>عذرًا، الصفحة غير موجودة.</p>", 404

if __name__ == '__main__':
    app.run(debug=True)
