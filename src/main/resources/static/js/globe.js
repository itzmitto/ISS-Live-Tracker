import * as THREE from "three";
import { createEarthLighting } from "./earthLighting.js";
import { createIssModel } from "./issModel.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createGlobeReplay } from "./globeReplay.js";

const EARTH_RADIUS_KM = 6371;
const POLLING_INTERVAL = 5000;
const container = document.getElementById("globe-canvas");
const loading = document.getElementById("globe-loading");

const fields = {
    connection: document.getElementById("globe-connection"),
    latitude: document.getElementById("globe-latitude"),
    longitude: document.getElementById("globe-longitude"),
    altitude: document.getElementById("globe-altitude"),
    velocity: document.getElementById("globe-velocity"),
    visibility: document.getElementById("globe-visibility"),
    updated: document.getElementById("globe-updated"),
    samples: document.getElementById("globe-samples"),
    footprint: document.getElementById("globe-footprint"),
    cameraMode: document.getElementById("globe-camera-mode")
};

const buttons = {
    follow: document.getElementById("globe-follow"),
    inspect: document.getElementById("globe-inspect"),
    rotate: document.getElementById("globe-rotate"),
    coverage: document.getElementById("globe-coverage"),
    trail: document.getElementById("globe-trail"),
    reset: document.getElementById("globe-reset")
};

const state = {
    follow: true,
    inspect: false,
    rotate: false,
    coverage: true,
    trail: true,
    firstPosition: true,
    loading: false,
    current: null,
    livePosition: null,
    targetPosition: null
};

const scene = new THREE.Scene();
scene.background = new THREE.Color("#06111f");

const camera = new THREE.PerspectiveCamera(
    42,
    1,
    0.01,
    100
);

camera.position.set(0, 1.1, 3.4);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(1, 1);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 1.35;
controls.maxDistance = 8;
controls.autoRotateSpeed = 0.5;

controls.addEventListener("start", () => {
    if (state.inspect) return;

    state.follow = false;
    updateControls();
});

const ambient = new THREE.AmbientLight(0x8aaccb, 0.16);
scene.add(ambient);

const sunlight = new THREE.DirectionalLight(0xffffff, 3.1);
scene.add(sunlight);

function radians(degrees) {
    return degrees * Math.PI / 180;
}

function degrees(value) {
    return value * 180 / Math.PI;
}

function toVector(latitude, longitude, radius = 1) {
    const lat = radians(latitude);
    const lon = radians(longitude);

    return new THREE.Vector3(
        radius * Math.cos(lat) * Math.cos(lon),
        radius * Math.sin(lat),
        -radius * Math.cos(lat) * Math.sin(lon)
    );
}



const textureLoader = new THREE.TextureLoader();

const earthTexture = textureLoader.load(
    "/assets/globe/earth.jpg"
);
earthTexture.colorSpace = THREE.SRGBColorSpace;

const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 18,
        specular: new THREE.Color("#24455e")
    })
);

scene.add(earth);

const cloudTexture = textureLoader.load(
    "/assets/globe/clouds.png"
);

cloudTexture.colorSpace = THREE.SRGBColorSpace;

const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 96, 64),
    new THREE.MeshLambertMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);

scene.add(clouds);

const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.09, 96, 64),
    new THREE.ShaderMaterial({
        uniforms: {
            glowColor: {
                value: new THREE.Color("#3da9ff")
            }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDirection;
            void main() {
                vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vViewDirection = normalize(-viewPosition.xyz);
                gl_Position = projectionMatrix * viewPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying vec3 vNormal;
            varying vec3 vViewDirection;
            void main() {
                float edge = 1.0 - max(
                    dot(normalize(vNormal), normalize(vViewDirection)),
                    0.0
                );
                float glow = pow(edge, 4.0);
                gl_FragColor = vec4(glowColor, glow * 0.38);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.FrontSide
    })
);

scene.add(atmosphere);

const earthLighting = createEarthLighting({
    scene,
    sunlight,
    ambient
});


function addStars() {
    const count = 2200;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();

        const radius = 12 + Math.random() * 24;
        direction.multiplyScalar(radius);

        positions[i * 3] = direction.x;
        positions[i * 3 + 1] = direction.y;
        positions[i * 3 + 2] = direction.z;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    const stars = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            color: 0xb9d6f0,
            size: 0.035,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.85,
            depthWrite: false
        })
    );

    scene.add(stars);
}

addStars();

const satellite = new THREE.Group();

const issModel = createIssModel();
satellite.add(issModel.group);

const satelliteHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
        color: 0x27b5ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);

satelliteHalo.scale.set(0.18, 0.18, 1);
satellite.add(satelliteHalo);
satellite.visible = false;
scene.add(satellite);

const groundMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.011, 16, 16),
    new THREE.MeshBasicMaterial({
        color: 0x55d6ff
    })
);

groundMarker.visible = false;
scene.add(groundMarker);

const connector = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
        color: 0x55d6ff,
        transparent: true,
        opacity: 0.6
    })
);

connector.visible = false;
scene.add(connector);

const coverage = new THREE.LineLoop(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
        color: 0x41c8ff,
        transparent: true,
        opacity: 0.85
    })
);

coverage.visible = false;
scene.add(coverage);

const trailGroup = new THREE.Group();
scene.add(trailGroup);

const replayProgressGroup = new THREE.Group();
scene.add(replayProgressGroup);

function renderReplayProgress(history, selectedIndex) {
    for (const line of [...replayProgressGroup.children]) {
        replayProgressGroup.remove(line);
        line.geometry.dispose();
        line.material.dispose();
    }

    let segment = [];
    let previous = null;

    function addSegment() {
        if (segment.length > 1) {
            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(segment),
                new THREE.LineBasicMaterial({
                    color: 0xffc766,
                    transparent: true,
                    opacity: 0.98,
                    depthTest: false
                })
            );

            line.renderOrder = 3;
            replayProgressGroup.add(line);
        }

        segment = [];
    }

    for (const point of history.slice(0, selectedIndex + 1)) {
        if (!validPosition(point)) continue;

        if (
            previous &&
            point.timestamp - previous.timestamp > 90
        ) {
            addSegment();
        }

        segment.push(
            toVector(
                point.latitude,
                point.longitude,
                1 + point.altitude / EARTH_RADIUS_KM + 0.014
            )
        );

        previous = point;
    }

    addSegment();

    replayProgressGroup.visible = state.trail;
}


function updateCoverage(position) {
    const altitude = position.altitude;
    const centerLatitude = radians(position.latitude);
    const centerLongitude = radians(position.longitude);

    const angularRadius = Math.acos(
        EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitude)
    );

    const points = [];

    for (let bearing = 0; bearing < 360; bearing += 3) {
        const angle = radians(bearing);

        const latitude = Math.asin(
            Math.sin(centerLatitude) * Math.cos(angularRadius) +
            Math.cos(centerLatitude) *
            Math.sin(angularRadius) * Math.cos(angle)
        );

        const longitude = centerLongitude + Math.atan2(
            Math.sin(angle) * Math.sin(angularRadius) *
            Math.cos(centerLatitude),
            Math.cos(angularRadius) -
            Math.sin(centerLatitude) * Math.sin(latitude)
        );

        points.push(
            toVector(
                degrees(latitude),
                degrees(longitude),
                1.008
            )
        );
    }

    coverage.geometry.dispose();
    coverage.geometry = new THREE.BufferGeometry()
        .setFromPoints(points);

    coverage.visible = state.coverage;
}

function renderTrail(history) {
    for (const line of [...trailGroup.children]) {
        trailGroup.remove(line);
        line.geometry.dispose();
        line.material.dispose();
    }

    let segment = [];
    let previous = null;
    let total = 0;

    function addSegment() {
        if (segment.length < 2) {
            segment = [];
            return;
        }

        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(segment),
            new THREE.LineBasicMaterial({
                color: 0x42bfff,
                transparent: true,
                opacity: 0.85
            })
        );

        trailGroup.add(line);
        segment = [];
    }

    for (const point of history) {
        if (
            !Number.isFinite(point.latitude) ||
            !Number.isFinite(point.longitude) ||
            !Number.isFinite(point.altitude) ||
            !Number.isFinite(point.timestamp)
        ) {
            continue;
        }

        if (
            previous &&
            point.timestamp - previous.timestamp > 90
        ) {
            addSegment();
        }

        segment.push(
            toVector(
                point.latitude,
                point.longitude,
                1 + point.altitude / EARTH_RADIUS_KM + 0.008
            )
        );

        previous = point;
        total++;
    }

    addSegment();

    fields.samples.textContent = String(total);
    trailGroup.visible = state.trail;
}

function validPosition(position) {
    return position &&
        Number.isFinite(position.latitude) &&
        Number.isFinite(position.longitude) &&
        Number.isFinite(position.altitude) &&
        Number.isFinite(position.velocity) &&
        Number.isFinite(position.timestamp) &&
        position.latitude >= -90 &&
        position.latitude <= 90 &&
        position.longitude >= -180 &&
        position.longitude <= 180 &&
        position.altitude >= 0;
}

function number(value, digits = 2) {
    return value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

function focusIss() {
    if (!state.targetPosition) return;

    state.inspect = false;
    controls.minDistance = 1.35;
    controls.maxDistance = 8;
    controls.autoRotate = false;
    state.rotate = false;
    state.follow = true;

    camera.position.copy(
        state.targetPosition.clone()
            .normalize()
            .multiplyScalar(2.65)
    );

    controls.target.set(0, 0, 0);
    controls.update();
    updateControls();
}

function updatePosition(position) {
    state.current = position;
    earthLighting.setGroundPosition(
        position.latitude,
        position.longitude
    );

    const orbitalRadius =
        1 + position.altitude / EARTH_RADIUS_KM;

    state.targetPosition = toVector(
        position.latitude,
        position.longitude,
        orbitalRadius
    );

    satellite.position.copy(state.targetPosition);
    satellite.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        state.targetPosition.clone().normalize()
    );
    satellite.visible = true;

    const surfacePoint = toVector(
        position.latitude,
        position.longitude,
        1.009
    );

    groundMarker.position.copy(surfacePoint);
    groundMarker.visible = true;

    connector.geometry.dispose();
    connector.geometry = new THREE.BufferGeometry()
        .setFromPoints([
            surfacePoint,
            state.targetPosition
        ]);

    connector.visible = true;

    updateCoverage(position);

    fields.latitude.textContent =
        `${position.latitude.toFixed(4)}°`;

    fields.longitude.textContent =
        `${position.longitude.toFixed(4)}°`;

    fields.altitude.textContent =
        `${number(position.altitude)} KM`;

    fields.velocity.textContent =
        `${number(position.velocity, 0)} KM/H`;

    fields.visibility.textContent =
        String(position.visibility || "UNKNOWN").toUpperCase();

    fields.updated.textContent = new Date(
        position.timestamp * 1000
    ).toLocaleTimeString("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }) + " UTC";

    const horizonAngle = Math.acos(
        EARTH_RADIUS_KM /
        (EARTH_RADIUS_KM + position.altitude)
    );

    fields.footprint.textContent =
        `${number(2 * EARTH_RADIUS_KM * horizonAngle, 0)} KM`;

    if (state.firstPosition) {
        state.firstPosition = false;
        focusIss();
    }
}

async function refreshTelemetry() {
    if (state.loading) return;

    state.loading = true;

    try {
        const response = await fetch("/api/iss", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`ISS API returned ${response.status}`);
        }

        const position = await response.json();

        if (!validPosition(position)) {
            throw new Error("Invalid ISS coordinates.");
        }

        state.livePosition = position;

        if (replay.isLive()) {
            updatePosition(position);
        }

        fields.connection.textContent = "LIVE CONNECTION";
        fields.connection.dataset.connected = "true";

        try {
            const historyResponse = await fetch(
                "/api/iss/history?limit=300",
                {
                    cache: "no-store"
                }
            );

            if (historyResponse.ok) {
                const history = await historyResponse.json();

                if (Array.isArray(history)) {
                    renderTrail(history);
                    replay.updateHistory(history);
                }
            }
        } catch (error) {
            console.warn("History temporarily unavailable:", error);
        }
    } catch (error) {
        console.error("3D ISS tracking failed:", error);

        fields.connection.textContent = "CONNECTION ERROR";
        fields.connection.dataset.connected = "false";
    } finally {
        state.loading = false;
    }
}

function updateControls() {
    controls.autoRotate = state.rotate;

    buttons.follow.setAttribute(
        "aria-pressed",
        String(state.follow)
    );

    buttons.inspect.setAttribute(
        "aria-pressed",
        String(state.inspect)
    );

    buttons.inspect.textContent = state.inspect
        ? "Exit Inspection"
        : "Inspect ISS";

    buttons.rotate.setAttribute(
        "aria-pressed",
        String(state.rotate)
    );

    buttons.coverage.setAttribute(
        "aria-pressed",
        String(state.coverage)
    );

    buttons.trail.setAttribute(
        "aria-pressed",
        String(state.trail)
    );

    buttons.coverage.textContent = state.coverage
        ? "Coverage On"
        : "Coverage Off";

    buttons.trail.textContent = state.trail
        ? "Trail On"
        : "Trail Off";

    fields.cameraMode.textContent = state.inspect
        ? "ISS INSPECTION"
        : state.follow
            ? "FOLLOW ISS"
            : state.rotate
                ? "AUTO ROTATE"
                : "FREE CAMERA";
}

buttons.follow.addEventListener("click", focusIss);

buttons.inspect.addEventListener("click", () => {
    if (state.inspect) {
        focusIss();
        return;
    }

    if (!state.targetPosition) return;

    state.inspect = true;
    state.follow = false;
    state.rotate = false;

    controls.autoRotate = false;
    controls.minDistance = 0.15;
    controls.maxDistance = 3;

    const normal = state.targetPosition.clone().normalize();

    controls.target.copy(state.targetPosition);

    camera.position.copy(
        state.targetPosition.clone().add(
            normal.multiplyScalar(0.6)
        )
    );

    controls.update();
    updateControls();
});

buttons.rotate.addEventListener("click", () => {
    if (state.inspect) {
        focusIss();
    }

    state.rotate = !state.rotate;

    if (state.rotate) {
        state.follow = false;
    }

    updateControls();
});

buttons.coverage.addEventListener("click", () => {
    state.coverage = !state.coverage;
    coverage.visible = state.coverage && !!state.current;
    updateControls();
});

buttons.trail.addEventListener("click", () => {
    state.trail = !state.trail;
    trailGroup.visible = state.trail;
    replayProgressGroup.visible =
        state.trail && !replay.isLive();
    updateControls();
});

buttons.reset.addEventListener("click", () => {
    state.follow = false;
    state.inspect = false;
    state.rotate = false;
    controls.minDistance = 1.35;
    controls.maxDistance = 8;

    controls.autoRotate = false;
    controls.target.set(0, 0, 0);
    camera.position.set(0, 1.1, 3.4);
    controls.update();

    updateControls();
});


const replay = createGlobeReplay({
    onSelect(position, history, index) {
        updatePosition(position);
        renderReplayProgress(history, index);
    },
    onLive() {
        renderReplayProgress([], 0);
        replayProgressGroup.visible = false;

        state.rotate = false;
        state.follow = true;

        if (state.livePosition) {
            updatePosition(state.livePosition);
        }

        updateControls();
    }
});

function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

new ResizeObserver(resize).observe(container);

function animate() {
    requestAnimationFrame(animate);

    if (state.inspect && state.targetPosition) {
        const displacement = state.targetPosition
            .clone()
            .sub(controls.target);

        camera.position.add(displacement);
        controls.target.copy(state.targetPosition);
    } else if (
        state.follow &&
        state.targetPosition &&
        !state.firstPosition
    ) {
        const destination = state.targetPosition
            .clone()
            .normalize()
            .multiplyScalar(2.65);

        camera.position.lerp(destination, 0.025);
    }

    const time = performance.now() * 0.001;

    issModel.update(time);

    satelliteHalo.material.opacity =
        0.25 + Math.sin(time * 3) * 0.12;

    satelliteHalo.scale.setScalar(
        0.18 + Math.sin(time * 3) * 0.025
    );

    clouds.rotation.y += 0.000015;

    earthLighting.update(time);

    controls.update();
    renderer.render(scene, camera);
}

updateControls();
resize();
animate();

loading.remove();

refreshTelemetry();
setInterval(refreshTelemetry, POLLING_INTERVAL);
