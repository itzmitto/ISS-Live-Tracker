(() => {
    const elements = {
        status: document.getElementById("timeline-status"),
        samples: document.getElementById("timeline-samples"),
        selectedTime: document.getElementById("timeline-selected-time"),
        position: document.getElementById("timeline-position"),
        mode: document.getElementById("timeline-mode"),
        slider: document.getElementById("timeline-slider"),
        start: document.getElementById("timeline-start"),
        end: document.getElementById("timeline-end"),
        back: document.getElementById("timeline-back"),
        play: document.getElementById("timeline-play"),
        next: document.getElementById("timeline-next"),
        live: document.getElementById("timeline-live"),
        replay: document.getElementById("timeline-replay"),
        speed: document.getElementById("timeline-speed"),
        latitude: document.getElementById("timeline-latitude"),
        longitude: document.getElementById("timeline-longitude"),
        altitude: document.getElementById("timeline-altitude"),
        velocity: document.getElementById("timeline-velocity")
    };

    if (!window.L) {
        elements.status.textContent = "MAP UNAVAILABLE";
        return;
    }

    const map = L.map("timeline-map", {
        worldCopyJump: true,
        minZoom: 2,
        maxZoom: 7
    }).setView([20, 0], 2);

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 7,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

    const groundTrack = L.layerGroup().addTo(map);

    let marker = null;
    let samples = [];
    let selectedIndex = 0;
    let followLive = true;
    let playing = false;
    let playbackTimer = null;
    let loading = false;

    const numberFormatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    function formatNumber(value) {
        return numberFormatter.format(value);
    }

    function formatUtc(timestamp) {
        if (!Number.isFinite(timestamp)) return "--";

        return new Date(timestamp * 1000).toLocaleTimeString(
            "en-GB",
            {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }
        ) + " UTC";
    }

    function validPosition(point) {
        return point &&
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude) &&
            Number.isFinite(point.altitude) &&
            Number.isFinite(point.velocity) &&
            Number.isFinite(point.timestamp) &&
            Math.abs(point.latitude) <= 90 &&
            Math.abs(point.longitude) <= 180;
    }

    function renderTrack() {
        groundTrack.clearLayers();

        if (!samples.length) return;

        const segments = [];
        let segment = [];

        for (const point of samples) {
            const position = [point.latitude, point.longitude];
            const previous = segment.at(-1);

            if (
                previous &&
                Math.abs(position[1] - previous[1]) > 180
            ) {
                if (segment.length > 1) {
                    segments.push(segment);
                }

                segment = [];
            }

            segment.push(position);
        }

        if (segment.length > 1) {
            segments.push(segment);
        }

        for (const coordinates of segments) {
            L.polyline(coordinates, {
                color: "#176a9c",
                weight: 3,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(groundTrack);
        }
    }

    function updateMarker(point, centerMap) {
        const position = [
            point.latitude,
            point.longitude
        ];

        if (!marker) {
            marker = L.circleMarker(position, {
                radius: 9,
                color: "#ffffff",
                weight: 3,
                fillColor: "#176a9c",
                fillOpacity: 1
            }).addTo(map);
        } else {
            marker.setLatLng(position);
        }

        marker.bindTooltip(
            `ISS / ${formatUtc(point.timestamp)}`,
            {
                direction: "top",
                offset: [0, -12]
            }
        );

        if (centerMap) {
            map.panTo(position, {
                animate: true,
                duration: 0.35
            });
        }
    }

    function renderControls() {
        const count = samples.length;

        elements.slider.disabled = count === 0;
        elements.slider.min = "0";
        elements.slider.max = String(Math.max(0, count - 1));
        elements.slider.value = String(selectedIndex);

        elements.back.disabled = count === 0 || selectedIndex === 0;
        elements.next.disabled =
            count === 0 || selectedIndex >= count - 1;

        elements.play.disabled = count < 2;
        elements.replay.disabled = count < 2;
        elements.live.disabled = count === 0;

        elements.play.textContent = playing
            ? "Pause"
            : "Play";

        elements.mode.textContent = count === 0
            ? "WAITING"
            : playing
                ? "PLAYBACK"
                : followLive
                    ? "FOLLOW LIVE"
                    : "PAUSED";

        elements.live.setAttribute(
            "aria-pressed",
            String(followLive)
        );
    }

    function renderSelection(centerMap = true) {
        const count = samples.length;

        elements.samples.textContent = String(count);
        elements.position.textContent =
            `${count ? selectedIndex + 1 : 0} / ${count}`;

        elements.start.textContent = count
            ? formatUtc(samples[0].timestamp)
            : "--";

        elements.end.textContent = count
            ? formatUtc(samples.at(-1).timestamp)
            : "--";

        if (!count) {
            renderControls();
            return;
        }

        const point = samples[selectedIndex];

        elements.selectedTime.textContent =
            formatUtc(point.timestamp);

        elements.latitude.textContent =
            `${point.latitude.toFixed(4)}°`;

        elements.longitude.textContent =
            `${point.longitude.toFixed(4)}°`;

        elements.altitude.textContent =
            `${formatNumber(point.altitude)} KM`;

        elements.velocity.textContent =
            `${formatNumber(point.velocity)} KM/H`;

        updateMarker(point, centerMap);
        renderControls();
    }

    function selectPosition(index, centerMap = true) {
        if (!samples.length) return;

        selectedIndex = Math.max(
            0,
            Math.min(samples.length - 1, index)
        );

        renderSelection(centerMap);
    }

    function stopPlayback() {
        playing = false;

        if (playbackTimer !== null) {
            clearTimeout(playbackTimer);
            playbackTimer = null;
        }

        renderControls();
    }

    function playbackStep() {
        if (!playing) return;

        if (selectedIndex >= samples.length - 1) {
            stopPlayback();
            return;
        }

        selectPosition(selectedIndex + 1);

        if (selectedIndex >= samples.length - 1) {
            stopPlayback();
            return;
        }

        playbackTimer = setTimeout(
            playbackStep,
            Number(elements.speed.value)
        );
    }

    function startPlayback() {
        if (samples.length < 2) return;

        stopPlayback();

        followLive = false;

        if (selectedIndex >= samples.length - 1) {
            selectedIndex = 0;
        }

        playing = true;
        renderSelection();

        playbackTimer = setTimeout(
            playbackStep,
            Number(elements.speed.value)
        );
    }

    function updateSamples(newSamples) {
        const previousTimestamp =
            samples[selectedIndex]?.timestamp ?? null;

        const unique = new Map();

        for (const point of newSamples) {
            if (validPosition(point)) {
                unique.set(point.timestamp, point);
            }
        }

        samples = [...unique.values()]
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-300);

        if (followLive) {
            selectedIndex = Math.max(0, samples.length - 1);
        } else if (previousTimestamp !== null) {
            const foundIndex = samples.findIndex(
                point => point.timestamp === previousTimestamp
            );

            selectedIndex = foundIndex === -1
                ? Math.min(selectedIndex, Math.max(0, samples.length - 1))
                : foundIndex;
        } else {
            selectedIndex = 0;
        }

        if (playing && samples.length < 2) {
            stopPlayback();
        }

        renderTrack();
        renderSelection(followLive);
    }

    async function refreshTimeline() {
        if (loading) return;

        loading = true;

        try {
            const liveResponse = await fetch("/api/iss", {
                cache: "no-store"
            });

            if (!liveResponse.ok) {
                throw new Error("Live telemetry unavailable");
            }

            const historyResponse = await fetch(
                "/api/iss/history?limit=300",
                {
                    cache: "no-store"
                }
            );

            if (!historyResponse.ok) {
                throw new Error("History API unavailable");
            }

            const data = await historyResponse.json();

            if (!Array.isArray(data)) {
                throw new Error("Invalid history response");
            }

            updateSamples(data);

            elements.status.textContent = "CONNECTED";
            elements.status.className =
                "text-xs font-semibold text-[#168259]";
        } catch (error) {
            console.error("Timeline update failed:", error);

            elements.status.textContent = "CONNECTION ERROR";
            elements.status.className =
                "text-xs font-semibold text-[#b45309]";
        } finally {
            loading = false;
        }
    }

    elements.slider.addEventListener("input", () => {
        stopPlayback();
        followLive = false;
        selectPosition(Number(elements.slider.value));
    });

    elements.back.addEventListener("click", () => {
        stopPlayback();
        followLive = false;
        selectPosition(selectedIndex - 1);
    });

    elements.next.addEventListener("click", () => {
        stopPlayback();
        followLive = false;
        selectPosition(selectedIndex + 1);
    });

    elements.play.addEventListener("click", () => {
        if (playing) {
            stopPlayback();
        } else {
            startPlayback();
        }
    });

    elements.live.addEventListener("click", () => {
        stopPlayback();
        followLive = true;
        selectPosition(samples.length - 1);
    });

    elements.replay.addEventListener("click", () => {
        stopPlayback();
        followLive = false;
        selectPosition(0);
        startPlayback();
    });

    elements.speed.addEventListener("change", () => {
        if (!playing) return;

        if (playbackTimer !== null) {
            clearTimeout(playbackTimer);
        }

        playbackTimer = setTimeout(
            playbackStep,
            Number(elements.speed.value)
        );
    });

    renderControls();
    refreshTimeline();
    setInterval(refreshTimeline, 5000);
})();
