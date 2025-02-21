from flask import Flask, render_template, request, jsonify
from geopy.distance import geodesic
import json
import time
import uuid  # لإنشاء trip_id تلقائيًا

app = Flask(__name__)
TRIP_HISTORY_FILE = "trip_history.json"

# لحفظ بيانات التوقيت
active_trips = {}

def calculate_fare(start_coords, end_coords, total_trip_time, fuel_price=2.5, fuel_efficiency=15):
    """حساب تكلفة الأجرة بناءً على المسافة والوقت المستغرق"""
    distance_km = geodesic(start_coords, end_coords).km

    # حساب تكلفة البنزين
    fuel_used = distance_km / fuel_efficiency
    fuel_cost = fuel_used * fuel_price

    base_fare = 5  # رسوم أساسية
    cost_per_km = 2  # تكلفة لكل كيلومتر
    cost_per_minute = 0.5  # تكلفة لكل دقيقة مستغرقة

    # حساب التكلفة النهائية
    total_fare = base_fare + (cost_per_km * distance_km) + (cost_per_minute * (total_trip_time / 60)) + fuel_cost

    return round(total_fare, 2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    """حساب الأجرة عند إدخال الإحداثيات"""
    try:
        start_lat = request.form.get('start_lat', type=float)
        start_lon = request.form.get('start_lon', type=float)
        end_lat = request.form.get('end_lat', type=float)
        end_lon = request.form.get('end_lon', type=float)
        trip_id = request.form.get('trip_id', str) or str(uuid.uuid4())  # إنشاء trip_id تلقائيًا

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

@app.route('/start_trip', methods=['POST'])
def start_trip():
    """بدء الرحلة وتسجيل الوقت"""
    try:
        trip_id = request.form.get('trip_id', str) or str(uuid.uuid4())
        active_trips[trip_id] = {
            "start_time": time.time(),
            "paused_time": 0,
            "is_paused": False,
            "pause_start_time": 0
        }
        return jsonify({"message": "تم بدء الرحلة!", "trip_id": trip_id})

    except Exception as e:
        return jsonify({"error": f"حدث خطأ: {str(e)}"})

@app.route('/pause_trip', methods=['POST'])
def pause_trip():
    """إيقاف مؤقت للرحلة"""
    try:
        trip_id = request.form.get('trip_id', str)
        if trip_id in active_trips and not active_trips[trip_id]["is_paused"]:
            active_trips[trip_id]["pause_start_time"] = time.time()
            active_trips[trip_id]["is_paused"] = True
            return jsonify({"message": "تم إيقاف الرحلة مؤقتًا!"})
        return jsonify({"error": "لم يتم العثور على الرحلة أو هي بالفعل متوقفة!"})

    except Exception as e:
        return jsonify({"error": f"حدث خطأ: {str(e)}"})

@app.route('/resume_trip', methods=['POST'])
def resume_trip():
    """استئناف الرحلة بعد التوقف"""
    try:
        trip_id = request.form.get('trip_id', str)
        if trip_id in active_trips and active_trips[trip_id]["is_paused"]:
            paused_duration = time.time() - active_trips[trip_id]["pause_start_time"]
            active_trips[trip_id]["paused_time"] += paused_duration
            active_trips[trip_id]["is_paused"] = False
            return jsonify({"message": "تم استئناف الرحلة!"})
        return jsonify({"error": "لم يتم العثور على الرحلة أو لم تكن متوقفة!"})

    except Exception as e:
        return jsonify({"error": f"حدث خطأ: {str(e)}"})

@app.route('/save_trip', methods=['POST'])
def save_trip():
    """حفظ بيانات الرحلة بعد إنهائها"""
    try:
        trip_data = request.get_json()
        trip_id = trip_data.get('trip_id', str) or str(uuid.uuid4())

        if trip_id in active_trips:
            trip_data["total_time"] = time.time() - active_trips[trip_id]["start_time"] - active_trips[trip_id]["paused_time"]
            del active_trips[trip_id]

        with open(TRIP_HISTORY_FILE, "a") as file:
            json.dump(trip_data, file)
            file.write("\n")

        return jsonify({"message": "تم حفظ الرحلة بنجاح!"})

    except Exception as e:
        return jsonify({"error": f"حدث خطأ أثناء الحفظ: {str(e)}"})

from flask import Flask, render_template
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html', current_year=datetime.now().year)

if __name__ == '__main__':
    app.run(debug=True)
