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

    if (gpsButton) {
        gpsButton.addEventListener("click", function() {
            getLocation("start-lat", "start-lon", "start-time");
        });
    }

    if (gpsDestinationButton) {
        gpsDestinationButton.addEventListener("click", function() {
            getLocation("end-lat", "end-lon");
        });
    }

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
                fareResult.innerText = `الأجرة: ${data.fare} ريال`;
            })
            .catch(error => console.error("خطأ:", error));
        });
    }

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
    }

    if (startTimerButton) startTimerButton.addEventListener("click", startTimer);
    if (pauseTimerButton) pauseTimerButton.addEventListener("click", pauseTimer);
    if (resumeTimerButton) resumeTimerButton.addEventListener("click", resumeTimer);
    if (endTripButton) endTripButton.addEventListener("click", endTrip);

    // تحسين الأزرار وجعلها متجاوبة بدون اهتزاز الموقع
    document.querySelectorAll("button").forEach(button => {
        button.style.transition = "none"; // منع أي تأثير تكبير أثناء التحويم
    });

});