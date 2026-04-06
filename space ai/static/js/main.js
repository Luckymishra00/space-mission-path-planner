/* =========================
   GLOBAL VARIABLES
========================= */
let lineChartInstance = null;
let animationSpeed = 1000;
let isPaused = false;

/* =========================
   GET POSITION
========================= */
function getPosition(id) {
    let el = document.getElementById(id);
    if (!el) return { x: 0, y: 0 };

    return {
        x: el.offsetLeft,
        y: el.offsetTop
    };
}

/* =========================
   RESET ROCKET
========================= */
function resetRocket(start) {
    let rocket = document.getElementById("rocket");
    if (!rocket) return;

    let pos = getPosition(start);
    rocket.style.left = pos.x + "px";
    rocket.style.top = pos.y + "px";
}

/* =========================
   ROTATE ROCKET
========================= */
function rotateRocket(from, to) {
    let rocket = document.getElementById("rocket");
    if (!rocket) return;

    let dx = to.x - from.x;
    let dy = to.y - from.y;

    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    rocket.style.transform = `rotate(${angle}deg)`;
}

/* =========================
   MOVE ROCKET 🚀
========================= */
function moveRocket(path) {
    let rocket = document.getElementById("rocket");
    if (!rocket) return;

    let i = 0;

    function moveNext() {
        if (isPaused) {
            setTimeout(moveNext, 300);
            return;
        }

        if (i >= path.length - 1) return;

        let current = getPosition(path[i]);
        let next = getPosition(path[i + 1]);

        rotateRocket(current, next);

        rocket.style.left = next.x + "px";
        rocket.style.top = next.y + "px";
        rocket.style.filter = "drop-shadow(0 0 12px #00d4ff)";

        let planet = document.getElementById(path[i + 1]);
        if (planet) planet.classList.add("active");

        i++;
        setTimeout(moveNext, animationSpeed);
    }

    moveNext();
}

/* =========================
   DRAW LINE
========================= */
function drawLine(from, to) {
    let map = document.getElementById("space-map");
    if (!map) return;

    let p1 = getPosition(from);
    let p2 = getPosition(to);

    let line = document.createElement("div");
    line.className = "line";

    let length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

    line.style.width = length + "px";
    line.style.left = p1.x + "px";
    line.style.top = p1.y + "px";
    line.style.transform = `rotate(${angle}deg)`;

    map.appendChild(line);
}

/* =========================
   ANIMATE PATH
========================= */
function animatePath(path) {

    if (!path || path.length === 0) return;

    document.querySelectorAll(".line").forEach(el => el.remove());
    document.querySelectorAll(".planet").forEach(p => p.classList.remove("active"));

    resetRocket(path[0]);

    for (let i = 0; i < path.length - 1; i++) {
        setTimeout(() => {
            drawLine(path[i], path[i + 1]);
        }, i * animationSpeed);
    }

    setTimeout(() => {
        moveRocket(path);
    }, 300);
}

/* =========================
   LINE GRAPH 📈
========================= */
function showLineChart(path, fuel, time) {
    let canvas = document.getElementById('lineChart');
    if (!canvas) return;

    let ctx = canvas.getContext('2d');

    if (lineChartInstance) lineChartInstance.destroy();

    let steps = path.map((_, i) => i + 1);

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: steps,
            datasets: [
                {
                    label: 'Path Progress',
                    data: steps,
                    borderColor: '#00d4ff',
                    tension: 0.4
                },
                {
                    label: 'Fuel Usage',
                    data: steps.map(x => x * 10),
                    borderColor: '#ff00ff',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: { ticks: { color: 'white' } },
                y: { ticks: { color: 'white' } }
            }
        }
    });
}

/* =========================
   🧠 ALGORITHM COMPARISON
========================= */
function updateComparison(data) {
    let tbody = document.getElementById("comparison-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    for (let algo in data) {
        let row = `
            <tr>
                <td>${algo}</td>
                <td>${data[algo].nodes}</td>
                <td>${data[algo].time_taken} ms</td>
            </tr>
        `;
        tbody.innerHTML += row;
    }
}

/* =========================
   MAIN FUNCTION 🚀
========================= */
function startMission() {
    let start = document.getElementById("start").value;
    let end = document.getElementById("end").value;
    let algo = document.getElementById("algo").value;

    let button = document.querySelector(".btn-space");

    button.innerText = "🚀 Launching...";
    button.disabled = true;

    fetch('/find-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end, algorithm: algo })
    })
    .then(res => res.json())
    .then(data => {

        button.innerText = "🚀 Start Mission";
        button.disabled = false;

        if (data.error) {
            alert(data.error);
            return;
        }

        // =========================
        // OUTPUT TEXT
        // =========================
        document.getElementById("path").innerText =
            "Path: " + data.path.join(" → ");

        document.getElementById("fuel").innerText = "Fuel: " + data.fuel;
        document.getElementById("time").innerText = "Time: " + data.time;

        // =========================
        // 🔥 FIND BEST ALGORITHM
        // =========================
        let bestAlgo = null;
        let minNodes = Infinity;

        for (let key in data.comparison) {
            if (data.comparison[key].nodes < minNodes && data.comparison[key].nodes > 0) {
                minNodes = data.comparison[key].nodes;
                bestAlgo = key;
            }
        }

        // =========================
        // 🚀 UPDATE TOP METRICS ONLY
        // =========================
        document.getElementById("fuel-metric").innerText = data.fuel;
        document.getElementById("time-metric").innerText = data.time;

        // show selected OR best
        document.getElementById("algo-metric").innerText =
            (algo === "AUTO") ? bestAlgo : algo;

        document.getElementById("nodes-metric").innerText =
            data.comparison[bestAlgo]?.nodes || data.path.length;

        // =========================
        // AI Suggestion (SMART)
        // =========================
        document.getElementById("ai-suggestion").innerText =
            "Best: " + bestAlgo + " (least nodes)";

        // =========================
        // ANIMATION
        // =========================
        animatePath(data.path);

        setTimeout(() => {
            showLineChart(data.path, data.fuel, data.time);
        }, 200);

    })
    .catch(err => {
        console.error(err);
        alert("Something went wrong!");
        button.innerText = "🚀 Start Mission";
        button.disabled = false;
    });
}

/* =========================
   CONTROLS
========================= */
function togglePause() {
    isPaused = !isPaused;
}

function setSpeed(value) {
    animationSpeed = parseInt(value);
}