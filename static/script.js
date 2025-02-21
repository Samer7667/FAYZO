let startTime, timerInterval, pauseTime = 0, isPaused = false, tripId = Date.now().toString();

// 🔹 زر تحديد الموقع الحالي (GPS)
document.getElementById("gps-button").addEventListener("click", function() {
    getLocation("start-lat", "start-lon", "start-time");
});

// 🔹 زر تحديد الوجهة (GPS)
document.getElementById("gps-destination").addEventListener("click", function() {
    getLocation("end-lat", "end-lon");
});

// 📌 وظيفة جلب الموقع الجغرافي
function getLocation(latField, lonField, timeField = null) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;

            document.getElementById(latField).value = latitude;
            document.getElementById(lonField).value = longitude;

            if (timeField) {
                document.getElementById(timeField).value = new Date().toLocaleTimeString();
                startTimer(); // بدء العداد عند تحديد نقطة الانطلاق
                document.getElementById("trip-id").value = tripId; // حفظ trip_id
            }
        }, function(error) {
            alert("تعذر الحصول على الموقع: " + error.message);
        });
    } else {
        alert("المتصفح لا يدعم تحديد الموقع الجغرافي.");
    }
}

// 📌 حساب الأجرة وإرسال البيانات للسيرفر
document.getElementById("fare-form").addEventListener("submit", function(event) {
    event.preventDefault();

    let formData = new FormData(this);
    formData.append("trip_id", tripId); // إرسال trip_id مع الطلب

    fetch("/calculate", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            document.getElementById("fare-result").innerText = `الأجرة: ${data.fare} ريال`;
            saveTrip();
        }
    })
    .catch(error => console.error("خطأ:", error));
});

// ⏳ بدء العداد
function startTimer() {
    if (!isPaused) {
        startTime = new Date() - pauseTime;
    }
    
    isPaused = false;
    timerInterval = setInterval(updateTimer, 1000);
}

// ⏸️ إيقاف مؤقت للعداد
document.getElementById("pause-timer").addEventListener("click", function() {
    clearInterval(timerInterval);
    isPaused = true;
    pauseTime = new Date() - startTime;

    fetch("/pause_trip", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `trip_id=${tripId}`
    });
});

// ▶️ استئناف العداد بعد التوقف
document.getElementById("resume-timer").addEventListener("click", function() {
    startTimer();

    fetch("/resume_trip", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `trip_id=${tripId}`
    });
});

// ⏹️ إنهاء الرحلة
document.getElementById("stop-timer").addEventListener("click", function() {
    clearInterval(timerInterval);
    saveTrip();
});

// 📌 تحديث العداد
function updateTimer() {
    let elapsedTime = new Date() - startTime;
    let hours = Math.floor(elapsedTime / (1000 * 60 * 60));
    let minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

    document.getElementById("trip-timer").innerText = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 📜 حفظ سجل المشاوير
function saveTrip() {
    let tripData = {
        trip_id: tripId,
        start: {
            lat: document.getElementById("start-lat").value,
            lon: document.getElementById("start-lon").value,
            time: document.getElementById("start-time").value
        },
        end: {
            lat: document.getElementById("end-lat").value,
            lon: document.getElementById("end-lon").value
        },
        fare: document.getElementById("fare-result").innerText
    };

    fetch("/save_trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            let tripHistory = document.getElementById("trip-history");
            let tripItem = document.createElement("li");
            tripItem.innerText = `رحلة من (${tripData.start.lat}, ${tripData.start.lon}) إلى (${tripData.end.lat}, ${tripData.end.lon}) - ${tripData.fare}`;
            tripHistory.appendChild(tripItem);
        }
    })
    .catch(error => console.error("خطأ أثناء حفظ الرحلة:", error));
}
