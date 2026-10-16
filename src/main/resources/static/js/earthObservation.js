import * as THREE from "three";

export function createEarthObservation({
    camera,
    controls,
    station,
    getPosition,
    getTelemetry,
    onEnter,
    onExit
}) {
    const earthRadiusKm = 6371;

    const elements = {
        enter: document.getElementById("observation-enter"),
        nadir: document.getElementById("observation-nadir"),
        horizon: document.getElementById("observation-horizon"),
        exit: document.getElementById("observation-exit"),
        fov: document.getElementById("observation-fov"),
        status: document.getElementById("observation-status"),
        mode: document.getElementById("observation-mode"),
        latitude: document.getElementById("observation-latitude"),
        longitude: document.getElementById("observation-longitude"),
        altitude: document.getElementById("observation-altitude"),
        distance: document.getElementById("observation-distance"),
        updated: document.getElementById("observation-updated"),
        hud: document.getElementById("observation-hud"),
        hudMode: document.getElementById("observation-hud-mode"),
        hudPosition: document.getElementById("observation-hud-position"),
        hudAltitude: document.getElementById("observation-hud-altitude"),
        hudTime: document.getElementById("observation-hud-time")
    };

    const state = {
        active: false,
        mode: "nadir",
        fieldOfView: 65,
        transition: false
    };

    const radial = new THREE.Vector3();
    const east = new THREE.Vector3();
    const north = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const target = new THREE.Vector3();
    const cameraUp = new THREE.Vector3();
    const desiredQuaternion = new THREE.Quaternion();
    const rotationMatrix = new THREE.Matrix4();
    const worldNorth = new THREE.Vector3(0, 1, 0);
    const fallbackAxis = new THREE.Vector3(0, 0, 1);

    const originalCamera = {
        fov: camera.fov,
        near: camera.near,
        far: camera.far
    };

    function formatNumber(value, digits = 2) {
        return value.toLocaleString("en-US", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function formatTime(timestamp) {
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

    function updateInterface() {
        elements.status.textContent = state.active
            ? "EARTH OBSERVATION ACTIVE"
            : "OBSERVATION STANDBY";

        elements.status.dataset.active = String(state.active);

        elements.mode.textContent = !state.active
            ? "STANDBY"
            : state.mode === "nadir"
                ? "NADIR / EARTH BELOW"
                : "HORIZON / EARTH LIMB";

        elements.enter.disabled = state.active;
        elements.nadir.disabled = !state.active;
        elements.horizon.disabled = !state.active;
        elements.exit.disabled = !state.active;
        elements.fov.disabled = !state.active;

        elements.nadir.setAttribute(
            "aria-pressed",
            String(state.active && state.mode === "nadir")
        );

        elements.horizon.setAttribute(
            "aria-pressed",
            String(state.active && state.mode === "horizon")
        );

        elements.hud.hidden = !state.active;

        elements.hudMode.textContent = state.mode === "nadir"
            ? "NADIR VIEW"
            : "HORIZON VIEW";
    }

    function updateTelemetry() {
        const data = getTelemetry();

        if (!data) return;

        if (
            !Number.isFinite(data.latitude) ||
            !Number.isFinite(data.longitude) ||
            !Number.isFinite(data.altitude) ||
            !Number.isFinite(data.timestamp)
        ) {
            return;
        }

        elements.latitude.textContent =
            `${data.latitude.toFixed(4)}°`;

        elements.longitude.textContent =
            `${data.longitude.toFixed(4)}°`;

        elements.altitude.textContent =
            `${formatNumber(data.altitude)} KM`;

        const horizonDistance = earthRadiusKm * Math.acos(
            earthRadiusKm / (earthRadiusKm + data.altitude)
        );

        elements.distance.textContent =
            `${formatNumber(horizonDistance, 0)} KM`;

        elements.updated.textContent =
            formatTime(data.timestamp);

        elements.hudPosition.textContent =
            `${data.latitude.toFixed(2)}° / ${data.longitude.toFixed(2)}°`;

        elements.hudAltitude.textContent =
            `${formatNumber(data.altitude)} KM`;

        elements.hudTime.textContent =
            formatTime(data.timestamp);
    }

    function buildCameraFrame(position) {
        radial.copy(position).normalize();

        east.crossVectors(worldNorth, radial);

        if (east.lengthSq() < 0.000001) {
            east.crossVectors(fallbackAxis, radial);
        }

        east.normalize();

        north.crossVectors(radial, east).normalize();
    }

    function getViewDirection(position) {
        buildCameraFrame(position);

        if (state.mode === "nadir") {
            direction.copy(radial).negate();
            cameraUp.copy(north);
        } else {
            const orbitalRadius = position.length();

            const horizonAngle = Math.asin(
                Math.min(1, 1 / orbitalRadius)
            );

            const viewAngle = horizonAngle +
                THREE.MathUtils.degToRad(7);

            direction.copy(radial)
                .multiplyScalar(-Math.cos(viewAngle))
                .addScaledVector(
                    east,
                    Math.sin(viewAngle)
                )
                .normalize();

            cameraUp.copy(radial);
        }

        target.copy(position).add(direction);

        rotationMatrix.lookAt(
            position,
            target,
            cameraUp
        );

        desiredQuaternion.setFromRotationMatrix(
            rotationMatrix
        );
    }

    function updateCamera(delta) {
        if (!state.active) return;

        const position = getPosition();

        if (!position || position.lengthSq() <= 1) return;

        camera.position.copy(position);

        getViewDirection(position);

        const smoothing = 1 - Math.exp(
            -3.5 * Math.max(0, delta)
        );

        if (state.transition) {
            camera.quaternion.slerp(
                desiredQuaternion,
                smoothing
            );

            if (
                camera.quaternion.angleTo(
                    desiredQuaternion
                ) < 0.002
            ) {
                state.transition = false;
            }
        } else {
            camera.quaternion.copy(desiredQuaternion);
        }

        updateTelemetry();
    }

    function enter(mode = "nadir") {
        const position = getPosition();

        if (!position || position.lengthSq() <= 1) {
            elements.status.textContent =
                "WAITING FOR LIVE ISS POSITION";
            return;
        }

        onEnter?.();

        state.active = true;
        state.mode = mode;
        state.transition = false;

        controls.enabled = false;
        controls.autoRotate = false;

        station.visible = false;

        camera.fov = state.fieldOfView;
        camera.near = 0.0005;
        camera.far = 100;
        camera.updateProjectionMatrix();

        camera.position.copy(position);
        getViewDirection(position);
        camera.quaternion.copy(desiredQuaternion);

        updateTelemetry();
        updateInterface();
    }

    function exit(restore = true) {
        if (!state.active) return;

        state.active = false;
        state.transition = false;

        station.visible = true;

        controls.enabled = true;

        camera.up.set(0, 1, 0);
        camera.fov = originalCamera.fov;
        camera.near = originalCamera.near;
        camera.far = originalCamera.far;
        camera.updateProjectionMatrix();

        if (restore) {
            onExit?.();
        }

        updateInterface();
    }

    function changeMode(mode) {
        if (!state.active) return;

        if (mode !== "nadir" && mode !== "horizon") return;

        state.mode = mode;
        state.transition = true;

        updateInterface();
    }

    function update(delta) {
        if (!state.active) return;
        updateCamera(delta);
    }

    elements.enter.addEventListener("click", () => {
        enter("nadir");
    });

    elements.nadir.addEventListener("click", () => {
        changeMode("nadir");
    });

    elements.horizon.addEventListener("click", () => {
        changeMode("horizon");
    });

    elements.exit.addEventListener("click", () => {
        exit(true);
    });

    elements.fov.addEventListener("change", () => {
        state.fieldOfView = Number(elements.fov.value);

        if (state.active) {
            camera.fov = state.fieldOfView;
            camera.updateProjectionMatrix();
        }
    });

    updateInterface();

    return {
        enter,
        exit,
        update,
        isActive: () => state.active
    };
}
