import * as THREE from "three";

export function createCinematicCamera({
    camera,
    controls,
    station,
    onStart,
    onExit
}) {
    const elements = {
        start: document.getElementById("cinematic-start"),
        pause: document.getElementById("cinematic-pause"),
        next: document.getElementById("cinematic-next"),
        exit: document.getElementById("cinematic-exit"),
        fullscreen: document.getElementById("cinematic-fullscreen"),
        speed: document.getElementById("cinematic-speed"),
        status: document.getElementById("cinematic-status"),
        shot: document.getElementById("cinematic-shot"),
        description: document.getElementById("cinematic-description"),
        index: document.getElementById("cinematic-index"),
        progress: document.getElementById("cinematic-progress"),
        time: document.getElementById("cinematic-time"),
        stage: document.querySelector(".globe-stage")
    };

    const shots = [
        {
            name: "Earth Reveal",
            description: "A wide orbital view of Earth and the ISS",
            duration: 9
        },
        {
            name: "Orbital Approach",
            description: "A smooth camera approach toward the space station",
            duration: 10
        },
        {
            name: "Solar Array Flyby",
            description: "A sweeping shot across the station's solar arrays",
            duration: 9
        },
        {
            name: "ISS Hero Orbit",
            description: "A cinematic orbit around the spacecraft",
            duration: 12
        }
    ];

    const state = {
        active: false,
        paused: false,
        shotIndex: 0,
        elapsed: 0,
        speed: 1,
        previousTime: null
    };

    const up = new THREE.Vector3(0, 1, 0);
    const xAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const radial = new THREE.Vector3();
    const stationPosition = new THREE.Vector3();
    const desiredPosition = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();

    function smoothstep(value) {
        const t = THREE.MathUtils.clamp(value, 0, 1);
        return t * t * (3 - 2 * t);
    }

    function getFrame() {
        station.getWorldPosition(stationPosition);

        const quaternion = station.getWorldQuaternion(
            new THREE.Quaternion()
        );

        radial.copy(stationPosition).normalize();

        xAxis.set(1, 0, 0)
            .applyQuaternion(quaternion)
            .normalize();

        zAxis.set(0, 0, 1)
            .applyQuaternion(quaternion)
            .normalize();
    }

    function calculateShot() {
        getFrame();

        const shot = shots[state.shotIndex];
        const t = THREE.MathUtils.clamp(
            state.elapsed / shot.duration,
            0,
            1
        );

        const eased = smoothstep(t);

        desiredPosition.set(0, 0, 0);
        desiredTarget.set(0, 0, 0);

        switch (state.shotIndex) {
            case 0: {
                desiredPosition
                    .copy(radial)
                    .multiplyScalar(3.6 - eased * 0.45)
                    .addScaledVector(xAxis, -0.7 + t * 1.4)
                    .addScaledVector(zAxis, 0.24);

                desiredTarget.copy(
                    stationPosition.clone().multiplyScalar(0.12)
                );
                break;
            }

            case 1: {
                desiredPosition
                    .copy(stationPosition)
                    .addScaledVector(
                        radial,
                        0.85 - eased * 0.52
                    )
                    .addScaledVector(xAxis, 0.25)
                    .addScaledVector(zAxis, 0.26);

                desiredTarget.copy(stationPosition);
                break;
            }

            case 2: {
                desiredPosition
                    .copy(stationPosition)
                    .addScaledVector(xAxis, -0.55 + t * 1.1)
                    .addScaledVector(radial, 0.22)
                    .addScaledVector(zAxis, 0.34);

                desiredTarget
                    .copy(stationPosition)
                    .addScaledVector(xAxis, 0.08 * Math.sin(t * Math.PI));
                break;
            }

            case 3: {
                const angle = t * Math.PI * 1.5 + 0.35;

                desiredPosition
                    .copy(stationPosition)
                    .addScaledVector(radial, 0.28)
                    .addScaledVector(
                        xAxis,
                        Math.cos(angle) * 0.37
                    )
                    .addScaledVector(
                        zAxis,
                        Math.sin(angle) * 0.37
                    );

                desiredTarget.copy(stationPosition);
                break;
            }
        }
    }

    function render() {
        const shot = shots[state.shotIndex];

        elements.status.textContent = !state.active
            ? "STANDBY"
            : state.paused
                ? "CINEMATIC PAUSED"
                : "CINEMATIC ACTIVE";

        elements.status.dataset.active =
            String(state.active && !state.paused);

        elements.shot.textContent = state.active
            ? shot.name
            : "Ready for cinematic tour";

        elements.description.textContent = state.active
            ? shot.description
            : "Four cinematic camera sequences around Earth and the ISS";

        elements.index.textContent =
            `${String(state.shotIndex + 1).padStart(2, "0")} / ${String(shots.length).padStart(2, "0")}`;

        const percentage = state.active
            ? Math.min(100, state.elapsed / shot.duration * 100)
            : 0;

        elements.progress.style.width = `${percentage}%`;

        elements.progress.parentElement.setAttribute(
            "aria-valuenow",
            String(Math.round(percentage))
        );

        elements.time.textContent =
            `${state.elapsed.toFixed(1)} / ${shot.duration.toFixed(1)} SEC`;

        elements.start.textContent = state.active
            ? "Restart Cinematic Tour"
            : "Start Cinematic Tour";

        elements.pause.textContent = state.paused
            ? "Resume"
            : "Pause";

        elements.pause.disabled = !state.active;
        elements.next.disabled = !state.active;
        elements.exit.disabled = !state.active;
    }

    function selectShot(index) {
        state.shotIndex = ((index % shots.length) + shots.length) % shots.length;
        state.elapsed = 0;
        render();
    }

    function start() {
        if (!station.visible) {
            elements.status.textContent = "WAITING FOR ISS DATA";
            return;
        }

        onStart?.();

        state.active = true;
        state.paused = false;
        state.previousTime = null;
        state.speed = Number(elements.speed.value);

        controls.autoRotate = false;
        controls.minDistance = 0.1;

        selectShot(0);
    }

    function stop(restore = true) {
        if (!state.active) return;

        state.active = false;
        state.paused = false;
        state.previousTime = null;

        controls.autoRotate = false;
        controls.minDistance = 1.35;

        if (restore) {
            onExit?.();
        }

        render();
    }

    function togglePause() {
        if (!state.active) return;

        state.paused = !state.paused;
        state.previousTime = null;
        render();
    }

    function next() {
        if (!state.active) return;

        selectShot(state.shotIndex + 1);
    }

    function update(timeSeconds) {
        if (!state.active) return;

        if (state.previousTime === null) {
            state.previousTime = timeSeconds;
        }

        const delta = Math.min(
            Math.max(timeSeconds - state.previousTime, 0),
            0.05
        );

        state.previousTime = timeSeconds;

        if (!state.paused) {
            state.elapsed += delta * state.speed;

            const duration = shots[state.shotIndex].duration;

            if (state.elapsed >= duration) {
                selectShot(state.shotIndex + 1);
            }
        }

        calculateShot();

        const smoothing = 1 - Math.exp(-2.6 * delta);

        camera.position.lerp(
            desiredPosition,
            smoothing
        );

        controls.target.lerp(
            desiredTarget,
            smoothing
        );

        render();
    }

    elements.start.addEventListener("click", start);
    elements.pause.addEventListener("click", togglePause);
    elements.next.addEventListener("click", next);
    elements.exit.addEventListener("click", () => stop(true));

    elements.speed.addEventListener("change", () => {
        state.speed = Number(elements.speed.value);
    });

    elements.fullscreen.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement === elements.stage) {
                await document.exitFullscreen();
            } else {
                await elements.stage.requestFullscreen();
            }
        } catch (error) {
            console.error("Fullscreen unavailable:", error);
        }
    });

    controls.addEventListener("start", () => {
        if (state.active) {
            stop(false);
        }
    });

    render();

    return {
        start,
        stop,
        update,
        isActive: () => state.active
    };
}
