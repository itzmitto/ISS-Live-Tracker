import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createIssModel } from "./issModel.js";

const EARTH_RADIUS = 6371;
const sceneContainer = document.getElementById("mc-earth-scene");

const fields = {
    connection: document.getElementById("mc-connection"),
    latitude: document.getElementById("mc-latitude"),
    longitude: document.getElementById("mc-longitude"),
    altitude: document.getElementById("mc-altitude"),
    velocity: document.getElementById("mc-velocity"),
    feed: document.getElementById("mc-feed-status"),
    freshness: document.getElementById("mc-freshness"),
    updated: document.getElementById("mc-last-update"),
    visibility: document.getElementById("mc-visibility"),
    footprint: document.getElementById("mc-footprint"),
    period: document.getElementById("mc-orbit-period"),
    orbits: document.getElementById("mc-orbits-day"),
    radius: document.getElementById("mc-orbit-radius"),
    horizon: document.getElementById("mc-horizon"),
    samples: document.getElementById("mc-samples"),
    duration: document.getElementById("mc-duration"),
    distance: document.getElementById("mc-distance"),
    scenePoints: document.getElementById("mc-scene-points"),
    altAverage: document.getElementById("mc-altitude-average"),
    altMin: document.getElementById("mc-altitude-min"),
    altMax: document.getElementById("mc-altitude-max"),
    velAverage: document.getElementById("mc-velocity-average"),
    velMin: document.getElementById("mc-velocity-min"),
    velMax: document.getElementById("mc-velocity-max"),
    history: document.getElementById("mc-history-body"),
    clock: document.getElementById("mc-clock"),
    date: document.getElementById("mc-date"),
    refresh: document.getElementById("mc-refresh")
};

const buttons = {
    follow: document.getElementById("mc-follow"),
    rotate: document.getElementById("mc-rotate"),
    trail: document.getElementById("mc-trail"),
    reset: document.getElementById("mc-reset")
};

const state = {
    follow: true,
    rotate: false,
    trail: true,
    requesting: false,
    position: null,
    target: null
};

const scene = new THREE.Scene();
scene.background = new THREE.Color("#061523");

const camera = new THREE.PerspectiveCamera(43, 1, 0.01, 100);
camera.position.set(0, 0.7, 3.4);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
sceneContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 1.4;
controls.maxDistance = 7;
controls.enablePan = false;
controls.autoRotateSpeed = 0.5;

controls.addEventListener("start", () => {
    state.follow = false;
    syncControls();
});

scene.add(new THREE.AmbientLight(0xb1d5ed, 0.36));

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(4, 2, 3);
scene.add(sun);

const textureLoader = new THREE.TextureLoader();

const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 13,
    specular: 0x254966
});

earthMaterial.map = textureLoader.load(
    "/assets/globe/earth.jpg",
    undefined,
    undefined,
    () => {
        earthMaterial.map = null;
        earthMaterial.color.set("#267db2");
        earthMaterial.needsUpdate = true;
    }
);

earthMaterial.map.colorSpace = THREE.SRGBColorSpace;

const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 80, 56),
    earthMaterial
);

scene.add(earth);

const cloudTexture = textureLoader.load(
    "/assets/globe/clouds.png",
    undefined,
    undefined,
    () => {
        cloudShell.visible = false;
    }
);

const cloudShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 80, 56),
    new THREE.MeshLambertMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    })
);

scene.add(cloudShell);

const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.065, 80, 56),
    new THREE.MeshBasicMaterial({
        color: "#378dc5",
        transparent: true,
        opacity: 0.085,
        depthWrite: false,
        side: THREE.BackSide
    })
);

scene.add(atmosphere);

const starsGeometry = new THREE.BufferGeometry();
const starsPositions = new Float32Array(1400 * 3);

for (let i = 0; i < 1400; i++) {
    const vector = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
    ).normalize().multiplyScalar(11 + Math.random() * 15);

    starsPositions.set(
        [vector.x, vector.y, vector.z],
        i * 3
    );
}

starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starsPositions, 3)
);

scene.add(
    new THREE.Points(
        starsGeometry,
        new THREE.PointsMaterial({
            color: 0xb8d6ec,
            size: 0.035,
            transparent: true,
            opacity: 0.8
        })
    )
);

const model = createIssModel();
const station = model.group;
station.scale.setScalar(0.045);
station.visible = false;
scene.add(station);

const stationHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
        color: "#3dbbff",
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);

stationHalo.scale.setScalar(0.15);
station.add(stationHalo);

const trailGroup = new THREE.Group();
scene.add(trailGroup);

function radians(value) {
    return value * Math.PI / 180;
}

function globePosition(latitude, longitude, radius = 1) {
    const lat = radians(latitude);
    const lon = radians(longitude);

    return new THREE.Vector3(
        radius * Math.cos(lat) * Math.cos(lon),
        radius * Math.sin(lat),
        -radius * Math.cos(lat) * Math.sin(lon)
    );
}

function number(value, digits = 2) {
    if (!Number.isFinite(value)) return "--";

    return value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

function timeUTC(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString(
        "en-GB",
        {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    ) + " UTC";
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = Math.floor(seconds % 60);

    return [hours, minutes, remaining]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
}

function updateClock() {
    const now = new Date();

    fields.clock.textContent =
        now.toLocaleTimeString("en-GB", {
            timeZone: "UTC",
            hour12: false
        });

    fields.date.textContent =
        now.toLocaleDateString("en-GB", {
            timeZone: "UTC",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }) + " UTC";
}

function validPosition(data) {
    return data &&
        Number.isFinite(data.latitude) &&
        Number.isFinite(data.longitude) &&
        Number.isFinite(data.altitude) &&
        Number.isFinite(data.velocity) &&
        Number.isFinite(data.timestamp) &&
        Math.abs(data.latitude) <= 90 &&
        Math.abs(data.longitude) <= 180 &&
        data.altitude >= 0;
}

function syncControls() {
    controls.autoRotate = state.rotate;

    buttons.follow.setAttribute(
        "aria-pressed",
        String(state.follow)
    );

    buttons.rotate.setAttribute(
        "aria-pressed",
        String(state.rotate)
    );

    buttons.trail.setAttribute(
        "aria-pressed",
        String(state.trail)
    );

    trailGroup.visible = state.trail;
}

function updateISS(data) {
    state.position = data;

    state.target = globePosition(
        data.latitude,
        data.longitude,
        1 + data.altitude / EARTH_RADIUS
    );

    station.position.copy(state.target);
    station.visible = true;

    const outward = state.target.clone().normalize();
    const tangent = new THREE.Vector3()
        .crossVectors(
            new THREE.Vector3(0, 1, 0),
            outward
        ).normalize();

    if (tangent.lengthSq() < 0.001) {
        tangent.set(1, 0, 0);
    }

    const cross = new THREE.Vector3()
        .crossVectors(tangent, outward)
        .normalize();

    station.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(
            tangent,
            outward,
            cross
        )
    );

    fields.latitude.textContent =
        `${data.latitude.toFixed(4)}°`;

    fields.longitude.textContent =
        `${data.longitude.toFixed(4)}°`;

    fields.altitude.textContent =
        `${number(data.altitude)} KM`;

    fields.velocity.textContent =
        `${number(data.velocity, 0)} KM/H`;

    fields.visibility.textContent =
        String(data.visibility || "UNKNOWN").toUpperCase();

    fields.footprint.textContent =
        `${number(data.footprint, 0)} KM`;

    fields.updated.textContent = timeUTC(data.timestamp);
}

function setStatus(text, status) {
    fields.connection.textContent = text;
    fields.connection.parentElement.dataset.status = status;
    fields.feed.textContent = text;
    fields.feed.dataset.state = status;
}

function updateFreshness() {
    if (!state.position) {
        fields.freshness.textContent = "--";
        return;
    }

    const age = Math.max(
        0,
        Math.floor(Date.now() / 1000 - state.position.timestamp)
    );

    fields.freshness.textContent = `${age} SEC OLD`;

    if (age > 60) {
        setStatus("STALE DATA", "error");
    }
}

function clearTrails() {
    for (const child of [...trailGroup.children]) {
        trailGroup.remove(child);
        child.geometry.dispose();
        child.material.dispose();
    }
}

function renderTrail(history) {
    clearTrails();

    let segment = [];
    let previous = null;

    function addSegment() {
        if (segment.length >= 2) {
            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(segment),
                new THREE.LineBasicMaterial({
                    color: "#54bcff",
                    transparent: true,
                    opacity: 0.9
                })
            );

            trailGroup.add(line);
        }

        segment = [];
    }

    for (const point of history) {
        if (!validPosition(point)) continue;

        if (
            previous &&
            point.timestamp - previous.timestamp > 90
        ) {
            addSegment();
        }

        segment.push(
            globePosition(
                point.latitude,
                point.longitude,
                1 + point.altitude / EARTH_RADIUS + 0.006
            )
        );

        previous = point;
    }

    addSegment();

    fields.scenePoints.textContent =
        `${history.length} POINTS`;
}

function drawChart(id, values, color) {
    const svg = document.getElementById(id);
    const namespace = "http://www.w3.org/2000/svg"\;

    svg.replaceChildren();

    if (!values.length) return;

    const width = 500;
    const height = 170;
    const padding = 12;

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = Math.max(maximum - minimum, 0.1);

    const points = values.map((value, index) => {
        const x = padding +
            (values.length === 1
                ? (width - padding * 2) / 2
                : index / (values.length - 1) *
                    (width - padding * 2));

        const y = height - padding -
            ((value - minimum) / range) *
            (height - padding * 2);

        return [x, y];
    });

    for (let i = 0; i < 4; i++) {
        const line = document.createElementNS(
            namespace,
            "line"
        );

        const y = padding + i * (height - padding * 2) / 3;

        line.setAttribute("x1", String(padding));
        line.setAttribute("x2", String(width - padding));
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", "#e7f0f5");
        line.setAttribute("stroke-width", "1");

        svg.appendChild(line);
    }

    const path = document.createElementNS(namespace, "path");

    path.setAttribute(
        "d",
        points.map(([x, y], index) =>
            `${index === 0 ? "M" : "L"} ${x} ${y}`
        ).join(" ")
    );

    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("vector-effect", "non-scaling-stroke");

    svg.appendChild(path);

    const last = points.at(-1);
    const circle = document.createElementNS(namespace, "circle");

    circle.setAttribute("cx", String(last[0]));
    circle.setAttribute("cy", String(last[1]));
    circle.setAttribute("r", "5");
    circle.setAttribute("fill", color);
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "2");

    svg.appendChild(circle);
}

function updateChartSummary(history, field, ids, unit, color) {
    const values = history
        .map(point => point[field])
        .filter(Number.isFinite);

    if (!values.length) return;

    const average = values.reduce((a, b) => a + b, 0) /
        values.length;

    document.getElementById(ids.average).textContent =
        `${number(average, field === "velocity" ? 0 : 2)} ${unit}`;

    document.getElementById(ids.min).textContent =
        `MIN ${number(Math.min(...values), 1)}`;

    document.getElementById(ids.max).textContent =
        `MAX ${number(Math.max(...values), 1)}`;

    drawChart(ids.chart, values, color);
}

function renderHistory(history) {
    const recent = [...history].reverse().slice(0, 8);

    fields.history.replaceChildren();

    for (const point of recent) {
        const row = document.createElement("tr");

        const values = [
            timeUTC(point.timestamp),
            `${point.latitude.toFixed(4)}°`,
            `${point.longitude.toFixed(4)}°`,
            `${number(point.altitude)} KM`,
            `${number(point.velocity, 0)} KM/H`,
            String(point.visibility || "UNKNOWN").toUpperCase()
        ];

        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        }

        fields.history.appendChild(row);
    }

    if (!recent.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.className = "mc-empty";
        cell.textContent = "Waiting for recorded positions...";

        row.appendChild(cell);
        fields.history.appendChild(row);
    }
}

async function fetchJson(url) {
    const response = await fetch(url, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`${url}: HTTP ${response.status}`);
    }

    return response.json();
}

async function updateSupportingData() {
    const results = await Promise.allSettled([
        fetchJson("/api/iss/history?limit=120"),
        fetchJson("/api/iss/stats"),
        fetchJson("/api/iss/orbit")
    ]);

    const [historyResult, statsResult, orbitResult] = results;

    if (
        historyResult.status === "fulfilled" &&
        Array.isArray(historyResult.value)
    ) {
        const history = historyResult.value
            .filter(validPosition)
            .sort((a, b) => a.timestamp - b.timestamp);

        renderHistory(history);
        renderTrail(history);

        updateChartSummary(
            history,
            "altitude",
            {
                average: "mc-altitude-average",
                min: "mc-altitude-min",
                max: "mc-altitude-max",
                chart: "mc-altitude-chart"
            },
            "KM",
            "#168abd"
        );

        updateChartSummary(
            history,
            "velocity",
            {
                average: "mc-velocity-average",
                min: "mc-velocity-min",
                max: "mc-velocity-max",
                chart: "mc-velocity-chart"
            },
            "KM/H",
            "#5e8fda"
        );
    }

    if (statsResult.status === "fulfilled") {
        const stats = statsResult.value;

        fields.samples.textContent = number(stats.samples, 0);
        fields.duration.textContent = formatDuration(
            stats.trackedSeconds
        );

        fields.distance.textContent =
            `${number(stats.groundDistanceKm, 0)} KM`;
    }

    if (orbitResult.status === "fulfilled") {
        const orbit = orbitResult.value;

        fields.period.textContent =
            `${number(orbit.estimatedPeriodMinutes)} MIN`;

        fields.orbits.textContent =
            number(orbit.estimatedOrbitsPerDay);

        fields.radius.textContent =
            `${number(orbit.orbitalRadiusKm, 0)} KM`;

        fields.horizon.textContent =
            `${number(orbit.horizonSurfaceRadiusKm, 0)} KM`;
    }
}

async function refreshAll() {
    if (state.requesting) return;

    state.requesting = true;
    fields.refresh.disabled = true;

    try {
        const data = await fetchJson("/api/iss");

        if (!validPosition(data)) {
            throw new Error("Invalid ISS telemetry response");
        }

        updateISS(data);
        setStatus("LIVE CONNECTION", "live");
        updateFreshness();

        await updateSupportingData();
    } catch (error) {
        console.error("Mission Control refresh failed:", error);
        setStatus("CONNECTION ERROR", "error");
    } finally {
        state.requesting = false;
        fields.refresh.disabled = false;
    }
}

buttons.follow.addEventListener("click", () => {
    state.follow = !state.follow;

    if (state.follow) {
        state.rotate = false;
    }

    syncControls();
});

buttons.rotate.addEventListener("click", () => {
    state.rotate = !state.rotate;

    if (state.rotate) {
        state.follow = false;
    }

    syncControls();
});

buttons.trail.addEventListener("click", () => {
    state.trail = !state.trail;
    syncControls();
});

buttons.reset.addEventListener("click", () => {
    state.follow = false;
    state.rotate = false;

    camera.position.set(0, 0.7, 3.4);
    controls.target.set(0, 0, 0);
    controls.update();

    syncControls();
});

fields.refresh.addEventListener("click", refreshAll);

function resize() {
    const width = Math.max(sceneContainer.clientWidth, 1);
    const height = Math.max(sceneContainer.clientHeight, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

new ResizeObserver(resize).observe(sceneContainer);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (state.follow && state.target) {
        const destination = state.target.clone()
            .normalize()
            .multiplyScalar(2.8);

        camera.position.lerp(
            destination,
            1 - Math.exp(-2 * delta)
        );
    }

    model.update(clock.elapsedTime, true);
    cloudShell.rotation.y += delta * 0.0008;

    controls.update();
    renderer.render(scene, camera);
}

resize();
syncControls();
updateClock();
animate();

document.getElementById("mc-earth-loading").remove();

refreshAll();
setInterval(refreshAll, 5000);
setInterval(updateClock, 1000);
setInterval(updateFreshness, 1000);
