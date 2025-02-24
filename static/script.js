document.addEventListener("DOMContentLoaded", function() {
    const gpsButton = document.getElementById("gps-button");
    const gpsDestinationButton = document.getElementById("gps-destination");
    const fareForm = document.getElementById("fare-form");
    const fareResult = document.getElementById("fare-result");
    const startTimerButton = document.getElementById("start-timer");
    const pauseTimerButton = document.getElementById("pause-timer");
    const resumeTimerButton = document.getElementById("resume-timer");
    const endTripButton = document.getElementById("end-trip");

    let timerInterval;
    let elapsedTime = 0;
    let isPaused = false;

    // زر تحديد إحداثيات الموقع الحالي
    if (gpsButton) {
        gpsButton.addEventListener("click", function() {
            getLocation("start-lat", "start-lon", "start-time");
        });
    }

    // زر تحديد إحداثيات الوجهة
    if (gpsDestinationButton) {
        gpsDestinationButton.addEventListener("click", function() {
            getLocation("end-lat", "end-lon");
        });
    }

    // عند إرسال نموذج حساب الأجرة
    if (fareForm) {
        fareForm.addEventListener("submit", function(event) {
            event.preventDefault();
            let formData = new FormData(this);
            fetch("/calculate", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    fareResult.innerText = `خطأ: ${data.error}`;
                } else {
                    fareResult.innerText = `الأجرة: ${data.fare} ريال`;
                }
            })
            .catch(error => console.error("خطأ:", error));
        });
    }

    // دالة للحصول على الموقع من المتصفح
    function getLocation(latField, lonField, timeField = null) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                document.getElementById(latField).value = position.coords.latitude;
                document.getElementById(lonField).value = position.coords.longitude;
                if (timeField) {
                    document.getElementById(timeField).value = new Date().toLocaleTimeString();
                }
            }, function(error) {
                alert("تعذر الحصول على الموقع: " + error.message);
            });
        } else {
            alert("المتصفح لا يدعم تحديد الموقع الجغرافي.");
        }
    }

    // دوال تشغيل العداد وإيقافه
    function startTimer() {
        elapsedTime = 0;
        isPaused = false;
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isPaused) {
                elapsedTime++;
                startTimerButton.innerText = `الوقت: ${elapsedTime} ثانية`;
            }
        }, 1000);
    }

    function pauseTimer() {
        isPaused = true;
    }

    function resumeTimer() {
        isPaused = false;
    }

    function endTrip() {
        clearInterval(timerInterval);
        elapsedTime = 0;
        startTimerButton.innerText = "ابدأ العداد";
        let startLat = document.getElementById("start-lat").value;
        let startLon = document.getElementById("start-lon").value;
        let endLat = document.getElementById("end-lat").value;
        let endLon = document.getElementById("end-lon").value;

        if (!startLat || !startLon || !endLat || !endLon) {
            alert("يجب إدخال الإحداثيات لحفظ الرحلة.");
            return;
        }

        let formData = new FormData();
        formData.append("start_lat", startLat);
        formData.append("start_lon", startLon);
        formData.append("end_lat", endLat);
        formData.append("end_lon", endLon);
        formData.append("duration", elapsedTime);

        fetch("/save_trip", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("تم حفظ الرحلة بنجاح!");
            } else {
                alert("خطأ أثناء حفظ الرحلة: " + data.error);
            }
        })
        .catch(error => console.error("خطأ:", error));
    }

    // ربط أزرار العداد بالدوال
    if (startTimerButton) startTimerButton.addEventListener("click", startTimer);
    if (pauseTimerButton) pauseTimerButton.addEventListener("click", pauseTimer);
    if (resumeTimerButton) resumeTimerButton.addEventListener("click", resumeTimer);
    if (endTripButton) endTripButton.addEventListener("click", endTrip);

    // تحسين الأزرار وجعلها متجاوبة بدون اهتزاز الموقع
    document.querySelectorAll("button").forEach(button => {
        button.style.transition = "none"; // منع أي تأثير تكبير أثناء التحويم
    });

    function checkPrayerTime() {
        const prayerTimes = {
            "Fajr": "04:30",
            "Dhuhr": "12:15",
            "Asr": "15:45",
            "Maghrib": "18:10",
            "Isha": "19:30"
        };
    
        let now = new Date();
        let currentTime = now.getHours() + ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes();
    
        for (let prayer in prayerTimes) {
            if (currentTime === prayerTimes[prayer]) {
                alert(`🕌 حان وقت صلاة ${prayer}!`);
            }
        }
    }
    
    setInterval(checkPrayerTime, 60000); // فحص وقت الصلاة كل دقيقة
    
    function estimateUberFare(distance) {
        const baseFare = 6; 
        const costPerKm = 2.5;
        const estimatedFare = baseFare + (costPerKm * distance);
        return estimatedFare.toFixed(2);
    }
    
    document.getElementById("fare-form").addEventListener("submit", function(event) {
        event.preventDefault();
        
        let startLat = parseFloat(document.getElementById("start-lat").value);
        let startLon = parseFloat(document.getElementById("start-lon").value);
        let endLat = parseFloat(document.getElementById("end-lat").value);
        let endLon = parseFloat(document.getElementById("end-lon").value);
    
        if (!startLat || !startLon || !endLat || !endLon) {
            alert("يجب إدخال الإحداثيات لحساب الأجرة.");
            return;
        }
    
        let distance = geodesic({latitude: startLat, longitude: startLon}, {latitude: endLat, longitude: endLon}).distance;
        
        document.getElementById("uber-fare").innerText = `💰 سعر أوبر المتوقع: ${estimateUberFare(distance)} ريال`;
    });
    
});
