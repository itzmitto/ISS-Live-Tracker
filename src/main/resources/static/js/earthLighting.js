import * as THREE from "three";

export function createEarthLighting({ scene, sunlight, ambient }) {
    const elements = {
        night: document.getElementById("globe-night-lights"),
        terminator: document.getElementById("globe-terminator"),
        marker: document.getElementById("globe-sun-marker"),
        cycle: document.getElementById("globe-day-cycle"),
        reset: document.getElementById("globe-sun-reset"),
        slider: document.getElementById("globe-time-slider"),
        offset: document.getElementById("globe-time-offset"),
        time: document.getElementById("globe-solar-time"),
        latitude: document.getElementById("globe-solar-latitude"),
        longitude: document.getElementById("globe-solar-longitude"),
        state: document.getElementById("globe-solar-state"),
        mode: document.getElementById("globe-lighting-mode")
    };

    const state = {
        nightLights: true,
        terminator: false,
        sunMarker: false,
        cycling: false,
        offsetHours: 0,
        lastFrame: null,
        lastUpdate: -Infinity,
        groundLatitude: null,
        groundLongitude: null
    };

    const sunDirection = new THREE.Vector3(1, 0, 0);

    ambient.intensity = 0.16;

    const nightTexture = new THREE.TextureLoader().load(
        "/assets/globe/earth-lights.png",
        undefined,
        undefined,
        error => console.error("Night texture failed:", error)
    );

    nightTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.anisotropy = 4;

    const nightMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uNightTexture: {
                value: nightTexture
            },
            uSunDirection: {
                value: sunDirection
            },
            uIntensity: {
                value: 2.2
            }
        },
        vertexShader: `
            varying vec2 vNightUv;
            varying vec3 vWorldNormal;

            void main() {
                vNightUv = uv;

                vWorldNormal = normalize(
                    mat3(modelMatrix) * normal
                );

                gl_Position = projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uNightTexture;
            uniform vec3 uSunDirection;
            uniform float uIntensity;

            varying vec2 vNightUv;
            varying vec3 vWorldNormal;

            void main() {
                vec3 normalDirection = normalize(vWorldNormal);

                float sunlightFactor = dot(
                    normalDirection,
                    normalize(uSunDirection)
                );

                float nightFactor = 1.0 - smoothstep(
                    -0.16,
                    0.08,
                    sunlightFactor
                );

                vec3 cityLights = texture2D(
                    uNightTexture,
                    vNightUv
                ).rgb;

                cityLights = pow(
                    cityLights,
                    vec3(1.18)
                );

                gl_FragColor = vec4(
                    cityLights * nightFactor * uIntensity,
                    1.0
                );
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
    });

    const nightEarth = new THREE.Mesh(
        new THREE.SphereGeometry(1.003, 96, 64),
        nightMaterial
    );

    nightEarth.name = "Earth Night City Lights";
    nightEarth.visible = state.nightLights;
    scene.add(nightEarth);

    const terminator = new THREE.LineLoop(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({
            color: 0xffce78,
            transparent: true,
            opacity: 0.58,
            depthTest: true,
            depthWrite: false
        })
    );

    terminator.name = "Day Night Terminator";
    terminator.visible = false;
    scene.add(terminator);

    const sunMarker = new THREE.Group();
    sunMarker.name = "Subsolar Position";

    const sunCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 20, 16),
        new THREE.MeshBasicMaterial({
            color: 0xffcc69
        })
    );

    sunMarker.add(sunCore);

    const sunRing = new THREE.Mesh(
        new THREE.RingGeometry(0.027, 0.034, 48),
        new THREE.MeshBasicMaterial({
            color: 0xffdd95,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        })
    );

    sunMarker.add(sunRing);
    sunMarker.visible = false;
    scene.add(sunMarker);

    function radians(value) {
        return value * Math.PI / 180;
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

    function normalizeLongitude(value) {
        return ((value + 180) % 360 + 360) % 360 - 180;
    }

    function calculateSun(date) {
        const julianDate =
            date.getTime() / 86400000 + 2440587.5;

        const days = julianDate - 2451545;

        const meanAnomaly = radians(
            357.529 + 0.98560028 * days
        );

        const meanLongitude =
            280.459 + 0.98564736 * days;

        const eclipticLongitude = radians(
            meanLongitude +
            1.915 * Math.sin(meanAnomaly) +
            0.020 * Math.sin(2 * meanAnomaly)
        );

        const obliquity = radians(
            23.439 - 0.00000036 * days
        );

        const rightAscension = Math.atan2(
            Math.cos(obliquity) *
                Math.sin(eclipticLongitude),
            Math.cos(eclipticLongitude)
        );

        const declination = Math.asin(
            Math.sin(obliquity) *
                Math.sin(eclipticLongitude)
        );

        const siderealAngle = radians(
            280.46061837 +
            360.98564736629 * days
        );

        return {
            latitude: degrees(declination),
            longitude: normalizeLongitude(
                degrees(rightAscension - siderealAngle)
            )
        };
    }

    function updateTerminator() {
        const reference = new THREE.Vector3(0, 1, 0);

        const horizontal = new THREE.Vector3()
            .crossVectors(reference, sunDirection)
            .normalize();

        const vertical = new THREE.Vector3()
            .crossVectors(sunDirection, horizontal)
            .normalize();

        const points = [];

        for (let i = 0; i < 256; i++) {
            const angle = i / 256 * Math.PI * 2;

            const point = horizontal.clone()
                .multiplyScalar(Math.cos(angle))
                .addScaledVector(
                    vertical,
                    Math.sin(angle)
                )
                .multiplyScalar(1.028);

            points.push(point);
        }

        terminator.geometry.dispose();

        terminator.geometry =
            new THREE.BufferGeometry().setFromPoints(points);
    }

    function updateSunMarker() {
        sunMarker.position.copy(
            sunDirection.clone().multiplyScalar(1.027)
        );

        sunMarker.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            sunDirection
        );
    }

    function updateGroundState() {
        if (
            state.groundLatitude === null ||
            state.groundLongitude === null
        ) {
            elements.state.textContent = "WAITING";
            return;
        }

        const groundNormal = toVector(
            state.groundLatitude,
            state.groundLongitude
        );

        const illumination = groundNormal.dot(sunDirection);

        elements.state.textContent =
            illumination > 0.03
                ? "DAYLIGHT"
                : illumination < -0.08
                    ? "NIGHT"
                    : "TWILIGHT";
    }

    function updateControls() {
        const offset = state.offsetHours;

        elements.night.setAttribute(
            "aria-pressed",
            String(state.nightLights)
        );

        elements.terminator.setAttribute(
            "aria-pressed",
            String(state.terminator)
        );

        elements.marker.setAttribute(
            "aria-pressed",
            String(state.sunMarker)
        );

        elements.cycle.setAttribute(
            "aria-pressed",
            String(state.cycling)
        );

        elements.night.textContent = state.nightLights
            ? "City Lights On"
            : "City Lights Off";

        elements.terminator.textContent = state.terminator
            ? "Terminator On"
            : "Terminator Off";

        elements.marker.textContent = state.sunMarker
            ? "Sun Marker On"
            : "Sun Marker Off";

        elements.cycle.textContent = state.cycling
            ? "Stop Simulation"
            : "Play 24H Cycle";

        elements.offset.textContent = offset === 0
            ? "LIVE UTC"
            : `${offset > 0 ? "+" : ""}${offset.toFixed(1)} H`;

        elements.mode.textContent = state.cycling
            ? "SIMULATING"
            : offset === 0
                ? "REAL-TIME SUN"
                : "TIME SHIFT ACTIVE";

        elements.mode.dataset.simulated =
            String(state.cycling || offset !== 0);

        elements.slider.value = String(offset);

        nightEarth.visible = state.nightLights;
        terminator.visible = state.terminator;
        sunMarker.visible = state.sunMarker;
    }

    function refreshSunlight() {
        const date = new Date(
            Date.now() + state.offsetHours * 3600000
        );

        const solarPosition = calculateSun(date);

        sunDirection.copy(
            toVector(
                solarPosition.latitude,
                solarPosition.longitude
            )
        );

        sunlight.position.copy(
            sunDirection.clone().multiplyScalar(5)
        );

        updateTerminator();
        updateSunMarker();
        updateGroundState();

        elements.time.textContent =
            date.toISOString()
                .replace("T", " ")
                .slice(0, 19) + " UTC";

        elements.latitude.textContent =
            `${solarPosition.latitude.toFixed(2)}°`;

        elements.longitude.textContent =
            `${solarPosition.longitude.toFixed(2)}°`;

        updateControls();
    }

    function update(timeSeconds) {
        if (state.lastFrame === null) {
            state.lastFrame = timeSeconds;
        }

        const delta = Math.min(
            Math.max(timeSeconds - state.lastFrame, 0),
            0.1
        );

        state.lastFrame = timeSeconds;

        if (state.cycling) {
            state.offsetHours += delta * 0.5;

            if (state.offsetHours > 12) {
                state.offsetHours -= 24;
            }
        }

        if (
            state.cycling ||
            timeSeconds - state.lastUpdate >= 1
        ) {
            refreshSunlight();
            state.lastUpdate = timeSeconds;
        }
    }

    function setGroundPosition(latitude, longitude) {
        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return;
        }

        state.groundLatitude = latitude;
        state.groundLongitude = longitude;
        updateGroundState();
    }

    elements.night.addEventListener("click", () => {
        state.nightLights = !state.nightLights;
        updateControls();
    });

    elements.terminator.addEventListener("click", () => {
        state.terminator = !state.terminator;
        updateControls();
    });

    elements.marker.addEventListener("click", () => {
        state.sunMarker = !state.sunMarker;
        updateControls();
    });

    elements.cycle.addEventListener("click", () => {
        state.cycling = !state.cycling;
        updateControls();
    });

    elements.slider.addEventListener("input", () => {
        state.cycling = false;
        state.offsetHours = Number(elements.slider.value);
        refreshSunlight();
    });

    elements.reset.addEventListener("click", () => {
        state.cycling = false;
        state.offsetHours = 0;
        refreshSunlight();
    });

    refreshSunlight();

    return {
        update,
        setGroundPosition
    };
}
