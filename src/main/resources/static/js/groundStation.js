import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const elements = {
    connection: document.getElementById("gs-connection"),
    location: document.getElementById("gs-location"),
    latitudeInput: document.getElementById("gs-latitude"),
    longitudeInput: document.getElementById("gs-longitude"),
    apply: document.getElementById("gs-apply"),
    azimuth: document.getElementById("gs-azimuth"),
    elevation: document.getElementById("gs-elevation"),
    range: document.getElementById("gs-range"),
    visibility: document.getElementById("gs-visibility"),
    groundDistance: document.getElementById("gs-ground-distance"),
    horizonDistance: document.getElementById("gs-horizon-distance"),
    altitude: document.getElementById("gs-altitude"),
    samples: document.getElementById("gs-samples"),
    updated: document.getElementById("gs-updated"),
    radarDot: document.getElementById("gs-radar-dot"),
    radarTrack: document.getElementById("gs-radar-track"),
    radarMessage: document.getElementById("gs-radar-message"),
    reset: document.getElementById("gs-reset"),
    rotate: document.getElementById("gs-rotate")
};

let observer = {
    latitude: 52.3676,
    longitude: 4.9041
};

let loading = false;
let latest = null;

const container = document.getElementById("gs-three");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#071724");

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(7, 4.3, 7);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 17;
controls.autoRotateSpeed = 0.6;
controls.update();

scene.add(new THREE.AmbientLight(0xb2dfff, 0.8));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(3, 8, 4);
scene.add(light);

const ground = new THREE.Mesh(
    new THREE.CircleGeometry(4.05, 96),
    new THREE.MeshBasicMaterial({
        color: 0x102d40,
        side: THREE.DoubleSide
    })
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.025;
scene.add(ground);

const dome = new THREE.Mesh(
    new THREE.SphereGeometry(
        4,
        64,
        24,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
    ),
    new THREE.MeshBasicMaterial({
        color: 0x4b9dc8,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        side: THREE.DoubleSide
    })
);

scene.add(dome);

function radians(value) {
    return THREE.MathUtils.degToRad(value);
}

function directionVector(azimuth, elevation, radius = 4) {
    const az = radians(azimuth);
    const el = radians(elevation);

    return new THREE.Vector3(
        radius * Math.cos(el) * Math.sin(az),
        radius * Math.sin(el),
        -radius * Math.cos(el) * Math.cos(az)
    );
}

function createLine(points, color, opacity = 0.5) {
    const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false
        })
    );

    scene.add(line);
    return line;
}

for (const elevation of [0, 30, 60]) {
    const points = [];

    for (let bearing = 0; bearing <= 360; bearing += 3) {
        points.push(directionVector(bearing, elevation));
    }

    createLine(points, 0x397d9f, elevation === 0 ? 0.9 : 0.4);
}

for (let azimuth = 0; azimuth < 360; azimuth += 30) {
    const points = [];

    for (let elevation = 0; elevation <= 90; elevation += 5) {
        points.push(directionVector(azimuth, elevation));
    }

    createLine(points, 0x397d9f, 0.22);
}

function createLabel(text, azimuth) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;

    const context = canvas.getContext("2d");
    context.fillStyle = "#c3e9ff";
    context.font = "bold 40px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 64, 32);

    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(canvas),
            transparent: true,
            depthTest: false
        })
    );

    sprite.position.copy(directionVector(azimuth, 0, 4.55));
    sprite.position.y = 0.15;
    sprite.scale.set(0.65, 0.32, 1);
    scene.add(sprite);
}

createLabel("N", 0);
createLabel("E", 90);
createLabel("S", 180);
createLabel("W", 270);

const stationMarker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.13, 0.2, 16),
    new THREE.MeshStandardMaterial({
        color: 0x66caff,
        emissive: 0x0c6a9c,
        emissiveIntensity: 0.8,
        metalness: 0.5
    })
);

stationMarker.position.y = 0.1;
scene.add(stationMarker);

const issMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 24, 16),
    new THREE.MeshBasicMaterial({
        color: 0xffc266
    })
);

issMarker.visible = false;
scene.add(issMarker);

const issHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
        color: 0xffa53a,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);

issHalo.scale.set(0.65, 0.65, 1);
issHalo.visible = false;
scene.add(issHalo);

const signalLine = createLine([], 0xffc266, 0.75);
signalLine.visible = false;

const historyGroup = new THREE.Group();
scene.add(historyGroup);

function format(value, digits = 2) {
    return value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

function polarPosition(point) {
    const elevation = Math.max(0, point.elevationDegrees);
    const radius = (90 - elevation) / 90 * 120;
    const angle = radians(point.azimuthDegrees);

    return [
        160 + Math.sin(angle) * radius,
        160 - Math.cos(angle) * radius
    ];
}

function updateRadar(point) {
    const [x, y] = polarPosition(point);

    elements.radarDot.setAttribute("cx", String(x));
    elements.radarDot.setAttribute("cy", String(y));
    elements.radarDot.style.opacity = point.aboveHorizon ? "1" : "0.4";

    elements.radarMessage.textContent = point.aboveHorizon
        ? "ISS ABOVE HORIZON / POSSIBLE LINE OF SIGHT"
        : "ISS BELOW HORIZON / NO DIRECT LINE OF SIGHT";
}

function update3D(point) {
    if (!point.aboveHorizon) {
        issMarker.visible = false;
        issHalo.visible = false;
        signalLine.visible = false;
        return;
    }

    const position = directionVector(
        point.azimuthDegrees,
        point.elevationDegrees
    );

    issMarker.position.copy(position);
    issHalo.position.copy(position);

    issMarker.visible = true;
    issHalo.visible = true;
    signalLine.visible = true;

    signalLine.geometry.dispose();

    signalLine.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.2, 0),
        position
    ]);
}

function clearHistory() {
    for (const child of [...historyGroup.children]) {
        historyGroup.remove(child);
        child.geometry.dispose();
        child.material.dispose();
    }
}

function renderHistory(history) {
    clearHistory();
    elements.radarTrack.replaceChildren();

    const namespace = "http://www.w3.org/2000/svg"\;
    let radarSegment = [];
    let skySegment = [];

    function flush() {
        if (radarSegment.length > 1) {
            const path = document.createElementNS(namespace, "polyline");

            path.setAttribute(
                "points",
                radarSegment.map(([x, y]) => `${x},${y}`).join(" ")
            );

            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "#1688bb");
            path.setAttribute("stroke-width", "3");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");

            elements.radarTrack.appendChild(path);
        }

        if (skySegment.length > 1) {
            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(skySegment),
                new THREE.LineBasicMaterial({
                    color: 0x55c5ff,
                    transparent: true,
                    opacity: 0.9
                })
            );

            historyGroup.add(line);
        }

        radarSegment = [];
        skySegment = [];
    }

    let previousTimestamp = null;

    for (const point of history) {
        if (
            !point.aboveHorizon ||
            (previousTimestamp !== null &&
                point.timestamp - previousTimestamp > 90)
        ) {
            flush();
        }

        if (point.aboveHorizon) {
            radarSegment.push(polarPosition(point));

            skySegment.push(
                directionVector(
                    point.azimuthDegrees,
                    point.elevationDegrees
                )
            );
        }

        previousTimestamp = point.timestamp;
    }

    flush();
    elements.samples.textContent = String(history.length);
}

function renderTelemetry(point) {
    latest = point;

    elements.azimuth.textContent =
        `${format(point.azimuthDegrees)}°`;

    elements.elevation.textContent =
        `${format(point.elevationDegrees)}°`;

    elements.range.textContent =
        `${format(point.slantRangeKm, 0)} KM`;

    elements.visibility.textContent =
        point.aboveHorizon ? "ABOVE HORIZON" : "BELOW HORIZON";

    elements.visibility.style.color =
        point.aboveHorizon ? "#168259" : "#b56c32";

    elements.groundDistance.textContent =
        `${format(point.groundDistanceKm, 0)} KM`;

    elements.horizonDistance.textContent =
        `${format(point.horizonDistanceKm, 0)} KM`;

    elements.altitude.textContent =
        `${format(point.altitudeKm)} KM`;

    elements.updated.textContent =
        new Date(point.timestamp * 1000).toLocaleTimeString("en-GB", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }) + " UTC";

    updateRadar(point);
    update3D(point);
}

async function fetchJson(url) {
    const response = await fetch(url, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
    }

    return response.json();
}

async function refresh() {
    if (loading) return;

    loading = true;
    elements.apply.disabled = true;

    const snapshot = { ...observer };

    try {
        const parameters = new URLSearchParams({
            lat: String(snapshot.latitude),
            lon: String(snapshot.longitude)
        });

        const current = await fetchJson(
            `/api/iss/ground-station?${parameters}`
        );

        if (
            snapshot.latitude !== observer.latitude ||
            snapshot.longitude !== observer.longitude
        ) {
            return;
        }

        renderTelemetry(current);

        const history = await fetchJson(
            `/api/iss/ground-station/history?${parameters}&limit=120`
        );

        if (
            snapshot.latitude !== observer.latitude ||
            snapshot.longitude !== observer.longitude
        ) {
            return;
        }

        if (Array.isArray(history)) {
            renderHistory(history);
        }

        elements.connection.textContent = "LIVE RADAR DATA";
        elements.connection.dataset.state = "live";
    } catch (error) {
        console.error("Ground station update failed:", error);
        elements.connection.textContent = "CONNECTION ERROR";
        elements.connection.dataset.state = "error";
    } finally {
        loading = false;
        elements.apply.disabled = false;
    }
}

function applyCoordinates() {
    const latitude = Number(elements.latitudeInput.value);
    const longitude = Number(elements.longitudeInput.value);

    if (
        !elements.latitudeInput.value.trim() ||
        !elements.longitudeInput.value.trim() ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        elements.connection.textContent = "INVALID COORDINATES";
        elements.connection.dataset.state = "error";
        return;
    }

    observer = { latitude, longitude };

    latest = null;
    issMarker.visible = false;
    issHalo.visible = false;
    signalLine.visible = false;
    elements.radarDot.style.opacity = "0";
    clearHistory();
    elements.radarTrack.replaceChildren();
    elements.samples.textContent = "0";

    refresh();
}

elements.location.addEventListener("change", () => {
    if (elements.location.value === "custom") return;

    const [lat, lon] = elements.location.value.split(",");

    elements.latitudeInput.value = lat;
    elements.longitudeInput.value = lon;

    applyCoordinates();
});

for (const input of [
    elements.latitudeInput,
    elements.longitudeInput
]) {
    input.addEventListener("input", () => {
        elements.location.value = "custom";
    });
}

elements.apply.addEventListener("click", applyCoordinates);

elements.reset.addEventListener("click", () => {
    camera.position.set(7, 4.3, 7);
    controls.target.set(0, 1.2, 0);
    controls.autoRotate = false;

    elements.rotate.setAttribute("aria-pressed", "false");
    elements.rotate.textContent = "Auto Rotate Off";

    controls.update();
});

elements.rotate.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;

    elements.rotate.setAttribute(
        "aria-pressed",
        String(controls.autoRotate)
    );

    elements.rotate.textContent = controls.autoRotate
        ? "Auto Rotate On"
        : "Auto Rotate Off";
});

function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

new ResizeObserver(resize).observe(container);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    if (latest?.aboveHorizon) {
        issHalo.material.opacity =
            0.25 + Math.sin(time * 3) * 0.1;

        issHalo.scale.setScalar(
            0.6 + Math.sin(time * 3) * 0.08
        );
    }

    controls.update();
    renderer.render(scene, camera);
}

resize();
animate();

refresh();
setInterval(refresh, 5000);
