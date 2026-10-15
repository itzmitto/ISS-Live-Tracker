export function createGlobeReplay({ onSelect, onLive }) {
    const elements = {
        mode: document.getElementById("globe-replay-mode"),
        time: document.getElementById("globe-replay-time"),
        index: document.getElementById("globe-replay-index"),
        duration: document.getElementById("globe-replay-duration"),
        speedLabel: document.getElementById("globe-replay-speed-label"),
        start: document.getElementById("globe-replay-start"),
        end: document.getElementById("globe-replay-end"),
        slider: document.getElementById("globe-replay-slider"),
        previous: document.getElementById("globe-replay-previous"),
        play: document.getElementById("globe-replay-play"),
        next: document.getElementById("globe-replay-next"),
        restart: document.getElementById("globe-replay-restart"),
        live: document.getElementById("globe-replay-live"),
        speed: document.getElementById("globe-replay-speed")
    };

    let history = [];
    let selectedIndex = 0;
    let mode = "live";
    let playing = false;
    let playbackTimer = null;

    function formatTime(timestamp) {
        if (!Number.isFinite(timestamp)) return "--";

        return new Date(timestamp * 1000).toLocaleTimeString("en-GB", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }) + " UTC";
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remaining = seconds % 60;

        return [hours, minutes, remaining]
            .map(value => String(value).padStart(2, "0"))
            .join(":");
    }

    function validSample(point) {
        return point &&
            Number.isFinite(point.timestamp) &&
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude) &&
            Number.isFinite(point.altitude) &&
            Number.isFinite(point.velocity) &&
            Math.abs(point.latitude) <= 90 &&
            Math.abs(point.longitude) <= 180 &&
            point.altitude >= 0;
    }

    function render() {
        const count = history.length;
        const selected = history[selectedIndex];

        elements.mode.textContent = mode === "live"
            ? "LIVE MODE"
            : playing
                ? "REPLAYING"
                : "REPLAY PAUSED";

        elements.mode.dataset.mode = mode;

        elements.time.textContent = selected
            ? formatTime(selected.timestamp)
            : "--";

        elements.index.textContent =
            `${count ? selectedIndex + 1 : 0} / ${count}`;

        elements.start.textContent = count
            ? formatTime(history[0].timestamp)
            : "--";

        elements.end.textContent = count
            ? formatTime(history.at(-1).timestamp)
            : "--";

        elements.duration.textContent = count > 1
            ? formatDuration(
                history.at(-1).timestamp - history[0].timestamp
            )
            : "00:00:00";

        elements.speedLabel.textContent =
            elements.speed.selectedOptions[0].textContent;

        elements.slider.max = String(Math.max(0, count - 1));
        elements.slider.value = String(selectedIndex);
        elements.slider.disabled = count === 0;

        elements.previous.disabled =
            count === 0 || selectedIndex === 0;

        elements.next.disabled =
            count === 0 || selectedIndex >= count - 1;

        elements.play.disabled = count < 2;
        elements.restart.disabled = count < 2;
        elements.live.disabled = count === 0 || mode === "live";

        elements.play.textContent = playing ? "Pause" : "Play";
    }

    function stopPlayback() {
        playing = false;

        if (playbackTimer !== null) {
            clearTimeout(playbackTimer);
            playbackTimer = null;
        }
    }

    function showSelected() {
        if (!history.length) {
            render();
            return;
        }

        onSelect(history[selectedIndex], history, selectedIndex);
        render();
    }

    function select(index) {
        stopPlayback();
        mode = "replay";

        selectedIndex = Math.max(
            0,
            Math.min(history.length - 1, index)
        );

        showSelected();
    }

    function playbackStep() {
        playbackTimer = null;

        if (!playing) return;

        if (selectedIndex >= history.length - 1) {
            stopPlayback();
            render();
            return;
        }

        selectedIndex++;
        showSelected();

        if (selectedIndex >= history.length - 1) {
            stopPlayback();
            render();
            return;
        }

        scheduleNext();
    }

    function scheduleNext() {
        if (!playing) return;

        playbackTimer = setTimeout(
            playbackStep,
            Number(elements.speed.value)
        );
    }

    function startPlayback() {
        if (history.length < 2) return;

        stopPlayback();
        mode = "replay";

        if (selectedIndex >= history.length - 1) {
            selectedIndex = 0;
        }

        playing = true;
        showSelected();
        scheduleNext();
    }

    function returnToLive() {
        stopPlayback();
        mode = "live";

        selectedIndex = Math.max(0, history.length - 1);

        onLive();
        render();
    }

    function updateHistory(records) {
        if (!Array.isArray(records)) return;

        const selectedTimestamp = mode === "replay"
            ? history[selectedIndex]?.timestamp
            : null;

        const sorted = records
            .filter(validSample)
            .sort((a, b) => a.timestamp - b.timestamp);

        const unique = new Map();

        for (const point of sorted) {
            unique.set(point.timestamp, point);
        }

        history = [...unique.values()].slice(-300);

        if (mode === "live") {
            selectedIndex = Math.max(0, history.length - 1);
        } else {
            const previousIndex = history.findIndex(
                point => point.timestamp === selectedTimestamp
            );

            if (previousIndex >= 0) {
                selectedIndex = previousIndex;
            } else {
                selectedIndex = Math.min(
                    selectedIndex,
                    Math.max(0, history.length - 1)
                );

                if (history.length) {
                    showSelected();
                }
            }
        }

        if (!history.length && mode === "replay") {
            returnToLive();
            return;
        }

        render();
    }

    elements.slider.addEventListener("input", () => {
        select(Number(elements.slider.value));
    });

    elements.previous.addEventListener("click", () => {
        select(selectedIndex - 1);
    });

    elements.next.addEventListener("click", () => {
        select(selectedIndex + 1);
    });

    elements.play.addEventListener("click", () => {
        if (playing) {
            stopPlayback();
            render();
        } else {
            startPlayback();
        }
    });

    elements.restart.addEventListener("click", () => {
        if (history.length < 2) return;

        stopPlayback();
        selectedIndex = 0;
        startPlayback();
    });

    elements.live.addEventListener("click", returnToLive);

    elements.speed.addEventListener("change", () => {
        if (playing) {
            clearTimeout(playbackTimer);
            playbackTimer = null;
            scheduleNext();
        }

        render();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && playing) {
            stopPlayback();
            render();
        }
    });

    render();

    return {
        updateHistory,
        isLive: () => mode === "live"
    };
}
