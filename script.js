/* =====================================================
   SMART NYUMBA - SMART HOME IoT DASHBOARD
   ===================================================== */


/* =====================================================
   FIREBASE IMPORTS
   ===================================================== */

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    onValue as rawOnValue,
    set
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";


/* =====================================================
   FIREBASE CONFIGURATION
   ===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyAE11jZXLfHYQw0N09gnJoaVH3SklYFqwE",
    authDomain: "smart-nyumba-27bc0.firebaseapp.com",
    databaseURL: "https://smart-nyumba-27bc0-default-rtdb.firebaseio.com",
    projectId: "smart-nyumba-27bc0",
    storageBucket: "smart-nyumba-27bc0.firebasestorage.app",
    messagingSenderId: "222893340644",
    appId: "1:222893340644:web:2d1beb17bdbabf4bb3b9f1"
};


/* =====================================================
   INITIALIZE FIREBASE
   ===================================================== */

function onValue(dbRef, callback) {

    return rawOnValue(
        dbRef,
        callback,
        (error) => {

            console.error(
                "Database read failed for",
                dbRef.key,
                error.code,
                error.message
            );

            const msg =
                "Database error: " +
                (error.code || error.message);

            const status =
                document.getElementById("firebaseStatus");

            const text =
                document.getElementById("connectionText");

            if (status) {
                status.textContent = msg;
                status.classList.add("firebase-offline");
            }

            if (text) {
                text.textContent = msg;
            }
        }
    );
}


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const database = getDatabase(app);

/* =====================================================
   HTML ELEMENTS
   ===================================================== */

const $ = (id) =>
    document.getElementById(id);


/* =====================================================
   SENSOR ELEMENTS
   ===================================================== */

const temperatureElement =
    $("temperature");

const humidityElement =
    $("humidity");

const lightElement =
    $("light");


/* =====================================================
   DEVICE CONTROLS
   ===================================================== */

const fanSwitch =
    $("fanSwitch");

const lightsSwitch =
    $("lightsSwitch");

const fanStatus =
    $("fanStatus");

const lightsStatus =
    $("lightsStatus");

const fanCard =
    $("fanCard");

const lightsCard =
    $("lightsCard");


/* =====================================================
   CONNECTION ELEMENTS
   ===================================================== */

const connectionDot =
    $("connectionDot");

const connectionText =
    $("connectionText");

const firebaseStatus =
    $("firebaseStatus");

const lastUpdate =
    $("lastUpdate");


/* =====================================================
   HOME STATUS
   ===================================================== */

const homeStatusBadge =
    $("homeStatusBadge");

const homeStatusDot =
    $("homeStatusDot");

const homeStatusText =
    $("homeStatusText");

const homeTemperature =
    $("homeTemperature");

const homeHumidity =
    $("homeHumidity");

const homeLight =
    $("homeLight");

const homeFan =
    $("homeFan");

const homeLights =
    $("homeLights");


/* =====================================================
   SENSOR VARIABLES
   ===================================================== */

let currentTemperature = null;

let currentHumidity = null;

let currentLight = null;


/* =====================================================
   DEVICE STATE VARIABLES
   ===================================================== */

/*
   Controls = what the user requested.

   Device = what the Arduino actually reports.
*/

let requestedFanState = false;

let actualFanState = false;

let requestedLightsState = false;

let actualLightsState = false;


/* =====================================================
   COMMAND STATE
   ===================================================== */

let fanCommandPending = false;

let lightsCommandPending = false;

let fanCommandTimer = null;

let lightsCommandTimer = null;


/* =====================================================
   ARDUINO CONNECTION
   ===================================================== */

let firebaseConnected = false;

let arduinoOnline = false;

let lastArduinoSeen = 0;

let serverTimeOffset = 0;


/*
   Arduino heartbeat is sent every approximately
   3 seconds.

   If no heartbeat is received for 10 seconds,
   the Arduino is considered offline.
*/

const ARDUINO_TIMEOUT_MS = 10000;


/* =====================================================
   CHART DATA
   ===================================================== */

const MAX_DATA_POINTS = 20;

const chartLabels = [];

const temperatureData = [];

const humidityData = [];

const lightData = [];


/* =====================================================
   LAST UPDATE
   ===================================================== */

function updateLastUpdate() {

    lastUpdate.textContent =
        new Date().toLocaleTimeString();

}


/* =====================================================
   CREATE CHARTS
   ===================================================== */

function createChart(
    canvasId,
    data,
    yOptions
) {

    if (typeof Chart === "undefined") {

        console.warn(
            "Chart.js did not load - charts disabled, live values still work."
        );

        return null;
    }

    return new Chart($(canvasId), {

        type: "line",

        data: {

            labels: chartLabels,

            datasets: [{

                data: data,

                tension: 0.3,

                fill: false,

                borderWidth: 2,

                pointRadius: 2

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            animation: false,

            plugins: {

                legend: {
                    display: false
                }

            },

            scales: {

                x: {
                    display: false
                },

                y: yOptions

            }

        }

    });

}


const temperatureChart =
    createChart(
        "temperatureChart",
        temperatureData,
        {
            beginAtZero: false
        }
    );


const humidityChart =
    createChart(
        "humidityChart",
        humidityData,
        {
            beginAtZero: true,
            max: 100
        }
    );


const lightChart =
    createChart(
        "lightChart",
        lightData,
        {
            beginAtZero: true
        }
    );


/* =====================================================
   UPDATE CHARTS
   ===================================================== */

function updateCharts() {

    if (
        currentTemperature === null ||
        currentHumidity === null ||
        currentLight === null
    ) {

        return;
    }


    chartLabels.push(
        new Date().toLocaleTimeString()
    );


    temperatureData.push(
        currentTemperature
    );


    humidityData.push(
        currentHumidity
    );


    lightData.push(
        currentLight
    );


    if (
        chartLabels.length >
        MAX_DATA_POINTS
    ) {

        chartLabels.shift();

        temperatureData.shift();

        humidityData.shift();

        lightData.shift();
    }


    if (temperatureChart)
        temperatureChart.update();

    if (humidityChart)
        humidityChart.update();

    if (lightChart)
        lightChart.update();

}


/* =====================================================
   CONNECTION / DEVICE STATUS
   ===================================================== */

function updateControlAvailability() {

    /*
       Controls only work when BOTH:

       Firebase = connected
       Arduino = online
    */

    const canControl =
        firebaseConnected &&
        arduinoOnline;


    fanSwitch.disabled =
        !canControl;


    lightsSwitch.disabled =
        !canControl;


    fanSwitch.title =
        canControl
            ? "Control fan"
            : "Controls disabled: Arduino is offline";


    lightsSwitch.title =
        canControl
            ? "Control lights"
            : "Controls disabled: Arduino is offline";


    fanCard.classList.toggle(
        "device-offline",
        !canControl
    );


    lightsCard.classList.toggle(
        "device-offline",
        !canControl
    );

}


/* =====================================================
   OVERALL STATUS
   ===================================================== */

function updateOverallStatus() {

    /*
       Firebase completely offline
    */

    if (!firebaseConnected) {

        connectionDot.style.color =
            "#dc2626";

        connectionText.textContent =
            "Firebase Offline";


        firebaseStatus.textContent =
            "Firebase Offline";


        firebaseStatus.classList.remove(
            "firebase-online"
        );


        firebaseStatus.classList.add(
            "firebase-offline"
        );


        homeStatusText.textContent =
            "OFFLINE";


        homeStatusDot.style.color =
            "#dc2626";


        homeStatusBadge.style.background =
            "#fef2f2";


        homeStatusBadge.style.color =
            "#dc2626";

    }


    /*
       Firebase works but Arduino is offline
    */

    else if (!arduinoOnline) {

        connectionDot.style.color =
            "#f59e0b";

        connectionText.textContent =
            "Arduino Offline";


        firebaseStatus.textContent =
            "Firebase Connected • Arduino Offline";


        firebaseStatus.classList.remove(
            "firebase-offline"
        );


        firebaseStatus.classList.add(
            "firebase-online"
        );


        homeStatusText.textContent =
            "ARDUINO OFFLINE";


        homeStatusDot.style.color =
            "#f59e0b";


        homeStatusBadge.style.background =
            "#fffbeb";


        homeStatusBadge.style.color =
            "#d97706";

    }


    /*
       Everything online
    */

    else {

        connectionDot.style.color =
            "#22c55e";


        connectionText.textContent =
            "Online";


        firebaseStatus.textContent =
            "Firebase Connected • Arduino Online";


        firebaseStatus.classList.remove(
            "firebase-offline"
        );


        firebaseStatus.classList.add(
            "firebase-online"
        );


        homeStatusText.textContent =
            "ONLINE";


        homeStatusDot.style.color =
            "#22c55e";


        homeStatusBadge.style.background =
            "#ecfdf5";


        homeStatusBadge.style.color =
            "#16a34a";
    }


    updateControlAvailability();

}


/* =====================================================
   FIREBASE CONNECTION STATUS
   ===================================================== */

onValue(
    ref(database, ".info/connected"),
    (snapshot) => {

        firebaseConnected =
            snapshot.val() === true;


        console.log(
            "Firebase connected:",
            firebaseConnected
        );


        updateOverallStatus();

    }
);


/* =====================================================
   FIREBASE SERVER TIME
   ===================================================== */

onValue(
    ref(database, ".info/serverTimeOffset"),
    (snapshot) => {

        serverTimeOffset =
            Number(snapshot.val()) || 0;

    }
);


/* =====================================================
   ARDUINO HEARTBEAT
   ===================================================== */

onValue(
    ref(
        database,
        "System/Arduino/lastSeen"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (typeof value === "number") {

            lastArduinoSeen =
                value;


            arduinoOnline =
                (
                    Date.now() +
                    serverTimeOffset -
                    lastArduinoSeen
                ) <=
                ARDUINO_TIMEOUT_MS;


            console.log(
                "Arduino heartbeat:",
                new Date(
                    lastArduinoSeen
                ).toLocaleTimeString(),

                "Online:",
                arduinoOnline
            );


            updateOverallStatus();

        }

    }
);


/* =====================================================
   CONTINUOUS ARDUINO TIMEOUT CHECK
   ===================================================== */

setInterval(() => {

    if (lastArduinoSeen > 0) {

        const wasOnline =
            arduinoOnline;


        arduinoOnline =
            (
                Date.now() +
                serverTimeOffset -
                lastArduinoSeen
            ) <=
            ARDUINO_TIMEOUT_MS;


        if (
            wasOnline !==
            arduinoOnline
        ) {

            console.warn(
                "Arduino status changed:",
                arduinoOnline
                    ? "ONLINE"
                    : "OFFLINE"
            );


            updateOverallStatus();

        }

    }

}, 1000);


/* =====================================================
   TEMPERATURE
   ===================================================== */

onValue(
    ref(
        database,
        "Sensors/Temperature"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (value !== null) {

            currentTemperature =
                Number(value);


            console.log(
                "Temperature:",
                currentTemperature
            );


            const text =
                currentTemperature.toFixed(1) +
                " °C";


            temperatureElement.textContent =
                text;


            homeTemperature.textContent =
                text;


            updateLastUpdate();

        }

    }
);


/* =====================================================
   HUMIDITY
   ===================================================== */

onValue(
    ref(
        database,
        "Sensors/Humidity"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (value !== null) {

            currentHumidity =
                Number(value);


            console.log(
                "Humidity:",
                currentHumidity
            );


            const text =
                currentHumidity.toFixed(1) +
                " %";


            humidityElement.textContent =
                text;


            homeHumidity.textContent =
                text;


            updateLastUpdate();

        }

    }
);


/* =====================================================
   LIGHT SENSOR
   ===================================================== */

onValue(
    ref(
        database,
        "Sensors/Light"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (value !== null) {

            currentLight =
                Number(value);


            console.log(
                "Light:",
                currentLight
            );


            lightElement.textContent =
                currentLight;


            homeLight.textContent =
                currentLight;


            updateLastUpdate();


            updateCharts();

        }

    }
);


/* =====================================================
   FAN - REQUESTED STATE
   ===================================================== */

onValue(
    ref(
        database,
        "Controls/FAN"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (value === null)
            return;


        requestedFanState =
            value === true;


        /*
           Don't overwrite the switch while waiting
           for the Arduino to acknowledge a command.
        */

        if (!fanCommandPending) {

            fanSwitch.checked =
                requestedFanState;

        }


        console.log(
            "Fan requested state:",
            requestedFanState
        );

    }
);


/* =====================================================
   FAN - ACTUAL HARDWARE STATE
   ===================================================== */

onValue(
    ref(
        database,
        "Device/FAN"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (value === null)
            return;


        actualFanState =
            value === true;


        fanStatus.textContent =
            actualFanState
                ? "ON"
                : "OFF";


        homeFan.textContent =
            actualFanState
                ? "ON"
                : "OFF";


        fanCard.classList.toggle(
            "device-on",
            actualFanState
        );


        /*
           Arduino acknowledged our command.
        */

        if (
            fanCommandPending &&
            actualFanState ===
            requestedFanState
        ) {

            fanCommandPending =
                false;


            if (fanCommandTimer) {

                clearTimeout(
                    fanCommandTimer
                );

                fanCommandTimer =
                    null;
            }


            fanSwitch.checked =
                actualFanState;


            console.log(
                "Fan command acknowledged by Arduino:",
                actualFanState
            );

        }

    }
);


/* =====================================================
   LIGHTS - REQUESTED STATE
   ===================================================== */

onValue(
    ref(
        database,
        "Controls/LIGHTS"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (value === null)
            return;


        requestedLightsState =
            value === true;


        if (!lightsCommandPending) {

            lightsSwitch.checked =
                requestedLightsState;

        }


        console.log(
            "Lights requested state:",
            requestedLightsState
        );

    }
);


/* =====================================================
   LIGHTS - ACTUAL HARDWARE STATE
   ===================================================== */

onValue(
    ref(
        database,
        "Device/LIGHTS"
    ),
    (snapshot) => {

        const value =
            snapshot.val();


        if (value === null)
            return;


        actualLightsState =
            value === true;


        lightsStatus.textContent =
            actualLightsState
                ? "ON"
                : "OFF";


        homeLights.textContent =
            actualLightsState
                ? "ON"
                : "OFF";


        lightsCard.classList.toggle(
            "device-on",
            actualLightsState
        );


        /*
           Arduino acknowledged our command.
        */

        if (
            lightsCommandPending &&
            actualLightsState ===
            requestedLightsState
        ) {

            lightsCommandPending =
                false;


            if (lightsCommandTimer) {

                clearTimeout(
                    lightsCommandTimer
                );

                lightsCommandTimer =
                    null;
            }


            lightsSwitch.checked =
                actualLightsState;


            console.log(
                "Lights command acknowledged by Arduino:",
                actualLightsState
            );

        }

    }
);


/* =====================================================
   DEVICE CONTROL
   ===================================================== */

function sendCommand(
    path,
    switchElement,
    label,
    onPending,
    onTimeout
) {

    /*
       Do not send commands if either Firebase
       or the Arduino is offline.
    */

    if (
        !firebaseConnected ||
        !arduinoOnline
    ) {

        console.warn(
            label +
            ": command blocked because Arduino/Firebase is offline."
        );


        /*
           Restore actual hardware state.
        */

        switchElement.checked =
            label === "Fan"
                ? actualFanState
                : actualLightsState;


        updateOverallStatus();

        return;
    }


    const state =
        switchElement.checked;


    onPending();


    set(
        ref(database, path),
        state
    )

        .then(() => {

            console.log(
                label +
                " command sent to Firebase:",
                state
            );

        })

        .catch((error) => {

            console.error(
                label +
                " Firebase error:",
                error
            );


            onTimeout();


            switchElement.checked =
                label === "Fan"
                    ? actualFanState
                    : actualLightsState;

        });

}


/* =====================================================
   FAN SWITCH
   ===================================================== */

fanSwitch.addEventListener(
    "change",
    () => {

        const desired =
            fanSwitch.checked;


        sendCommand(

            "Controls/FAN",

            fanSwitch,

            "Fan",

            () => {

                fanCommandPending =
                    true;


                requestedFanState =
                    desired;


                if (fanCommandTimer) {

                    clearTimeout(
                        fanCommandTimer
                    );

                }


                /*
                   Wait up to 8 seconds
                   for Arduino acknowledgement.
                */

                fanCommandTimer =
                    setTimeout(() => {

                        if (
                            fanCommandPending
                        ) {

                            console.warn(
                                "Fan command was not acknowledged by Arduino."
                            );


                            fanCommandPending =
                                false;


                            fanSwitch.checked =
                                actualFanState;


                            fanStatus.textContent =
                                actualFanState
                                    ? "ON"
                                    : "OFF";


                            homeFan.textContent =
                                actualFanState
                                    ? "ON"
                                    : "OFF";


                            alert(
                                "Fan command was not acknowledged by the Arduino."
                            );

                        }

                    }, 8000);

            },

            () => {

                fanCommandPending =
                    false;


                if (fanCommandTimer) {

                    clearTimeout(
                        fanCommandTimer
                    );

                    fanCommandTimer =
                        null;
                }

            }

        );

    }
);


/* =====================================================
   LIGHTS SWITCH
   ===================================================== */

lightsSwitch.addEventListener(
    "change",
    () => {

        const desired =
            lightsSwitch.checked;


        sendCommand(

            "Controls/LIGHTS",

            lightsSwitch,

            "Lights",

            () => {

                lightsCommandPending =
                    true;


                requestedLightsState =
                    desired;


                if (lightsCommandTimer) {

                    clearTimeout(
                        lightsCommandTimer
                    );

                }


                /*
                   Wait up to 8 seconds
                   for Arduino acknowledgement.
                */

                lightsCommandTimer =
                    setTimeout(() => {

                        if (
                            lightsCommandPending
                        ) {

                            console.warn(
                                "Lights command was not acknowledged by Arduino."
                            );


                            lightsCommandPending =
                                false;


                            lightsSwitch.checked =
                                actualLightsState;


                            lightsStatus.textContent =
                                actualLightsState
                                    ? "ON"
                                    : "OFF";


                            homeLights.textContent =
                                actualLightsState
                                    ? "ON"
                                    : "OFF";


                            alert(
                                "Lights command was not acknowledged by the Arduino."
                            );

                        }

                    }, 8000);

            },

            () => {

                lightsCommandPending =
                    false;


                if (lightsCommandTimer) {

                    clearTimeout(
                        lightsCommandTimer
                    );

                    lightsCommandTimer =
                        null;
                }

            }

        );

    }
);


/* =====================================================
   INITIAL CONTROL STATE
   ===================================================== */

fanSwitch.disabled = true;

lightsSwitch.disabled = true;


/* =====================================================
   STARTUP MESSAGE
   ===================================================== */

console.log(
    "===================================="
);

console.log(
    "SMART NYUMBA Dashboard Started"
);

console.log(
    "Signed in as:",
    auth.currentUser?.email
);

console.log(
    "===================================="
);