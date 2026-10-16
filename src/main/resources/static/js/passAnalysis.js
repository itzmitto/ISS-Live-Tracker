(() => {
    const elements = {
        status: document.getElementById("pa-status"),
        location: document.getElementById("pa-location"),
        latitude: document.getElementById("pa-latitude"),
        longitude: document.getElementById("pa-longitude"),
        apply: document.getElementById("pa-apply"),
        refresh: document.getElementById("pa-refresh"),
        passCount: document.getElementById("pa-pass-count"),
        samples: document.getElementById("pa-total-samples"),
        aboveCount: document.getElementById("pa-above-count"),
        peak: document.getElementById("pa-peak"),
        mode: document.getElementById("pa-mode"),
        passList: document.getElementById("pa-pass-list"),
        radarMessage: document.getElementById("pa-radar-message"),
        completeTrack: document.getElementById("pa-complete-track"),
        progressTrack: document.getElementById("pa-progress-track"),
        dot: document.getElementById("pa-position-dot"),
        azimuth: document.getElementById("pa-azimuth"),
        elevation: document.getElementById("pa-elevation"),
        range: document.getElementById("pa-range"),
        time: document.getElementById("pa-time"),
        playbackStatus: document.getElementById("pa-playback-status"),
        slider: document.getElementById("pa-slider"),
        start: document.getElementById("pa-start-time"),
        current: document.getElementById("pa-current-time"),
        end: document.getElementById("pa-end-time"),
        previous: document.getElementById("pa-previous"),
        play: document.getElementById("pa-play"),
        next: document.getElementById("pa-next"),
        restart: document.getElementById("pa-restart"),
        speed: document.getElementById("pa-speed"),
        chart: document.getElementById("pa-elevation-chart"),
        chartStart: document.getElementById("pa-chart-start"),
        chartEnd: document.getElementById("pa-chart-end"),
        chartPeak: document.getElementById("pa-chart-peak")
    };

    const state = {
        observer: { lat: 52.3676, lon: 4.9041 },
        passes: [],
        selectedStart: null,
        selectedIndex: 0,
        playing: false,
        timer: null,
        loading: false
    };

    const svgNamespace = "http://www.w3.org/2000/svg"\;

    function formatTime(timestamp) {
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

    function formatNumber(value, digits = 2) {
        return value.toLocaleString("en-US", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function selectedPass() {
        return state.passes.find(
            item => item.startTimestamp === state.selectedStart
        ) || null;
    }

    function radarPoint(point) {
        const radius =
            (90 - Math.max(0, Math.min(90, point.elevationDegrees))) /
            90 * 120;

        const angle = point.azimuthDegrees * Math.PI / 180;

        return [
            180 + Math.sin(angle) * radius,
            180 - Math.cos(angle) * radius
        ];
    }

    function trackString(points) {
        return points.map(point => {
            const [x, y] = radarPoint(point);
            return `${x},${y}`;
        }).join(" ");
    }

    function stopPlayback() {
        state.playing = false;

        if (state.timer !== null) {
            clearTimeout(state.timer);
            state.timer = null;
        }
    }

    function createSvgElement(tag, attributes = {}) {
        const element = document.createElementNS(
            svgNamespace,
            tag
        );

        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, String(value));
        }

        return element;
    }

    function renderElevationChart(pass) {
        elements.chart.replaceChildren();

        if (!pass?.points.length) return;

        const points = pass.points;
        const width = 600;
        const height = 190;
        const padding = 12;

        for (const elevation of [0, 30, 60, 90]) {
            const y = height - padding -
                elevation / 90 * (height - padding * 2);

            elements.chart.appendChild(
                createSvgElement("line", {
                    x1: padding,
                    y1: y,
                    x2: width - padding,
                    y2: y,
                    stroke: "#dceaf3",
                    "stroke-width": 1
                })
            );
        }

        const coordinates = points.map((point, index) => {
            const x = points.length === 1
                ? width / 2
                : padding + index / (points.length - 1) *
                    (width - padding * 2);

            const y = height - padding -
                Math.max(0, point.elevationDegrees) / 90 *
                    (height - padding * 2);

            return [x, y];
        });

        const selected = coordinates[state.selectedIndex];

        elements.chart.appendChild(
            createSvgElement("polyline", {
                points: coordinates.map(
                    ([x, y]) => `${x},${y}`
                ).join(" "),
                fill: "none",
                stroke: "#147eaf",
                "stroke-width": 3,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "vector-effect": "non-scaling-stroke"
            })
        );

        elements.chart.appendChild(
            createSvgElement("circle", {
                cx: selected[0],
                cy: selected[1],
                r: 5,
                fill: "#f0a640",
                stroke: "#ffffff",
                "stroke-width": 2
            })
        );

        elements.chartStart.textContent =
            formatTime(points[0].timestamp);

        elements.chartEnd.textContent =
            formatTime(points.at(-1).timestamp);

        elements.chartPeak.textContent =
            `MAX ${formatNumber(pass.maxElevationDegrees)}°`;
    }

    function renderSelection() {
        const pass = selectedPass();

        if (!pass) {
            elements.mode.textContent = "NO RECORDED PASS";
            elements.playbackStatus.textContent = "STANDBY";
            elements.radarMessage.textContent =
                "No above-horizon pass recorded for this location.";
            elements.completeTrack.setAttribute("points", "");
            elements.progressTrack.setAttribute("points", "");
            elements.dot.setAttribute("visibility", "hidden");
            elements.chart.replaceChildren();
            elements.peak.textContent = "--";
            elements.azimuth.textContent = "--";
            elements.elevation.textContent = "--";
            elements.range.textContent = "--";
            elements.time.textContent = "--";
            elements.start.textContent = "--";
            elements.current.textContent = "--";
            elements.end.textContent = "--";
            elements.chartStart.textContent = "--";
            elements.chartEnd.textContent = "--";
            elements.chartPeak.textContent = "MAX --";
            elements.slider.disabled = true;
            elements.previous.disabled = true;
            elements.play.disabled = true;
            elements.next.disabled = true;
            elements.restart.disabled = true;
            return;
        }

        const points = pass.points;

        state.selectedIndex = Math.max(
            0,
            Math.min(state.selectedIndex, points.length - 1)
        );

        const point = points[state.selectedIndex];
        const [x, y] = radarPoint(point);

        elements.dot.setAttribute("cx", String(x));
        elements.dot.setAttribute("cy", String(y));
        elements.dot.setAttribute("visibility", "visible");

        elements.completeTrack.setAttribute(
            "points",
            trackString(points)
        );

        elements.progressTrack.setAttribute(
            "points",
            trackString(points.slice(0, state.selectedIndex + 1))
        );

        elements.mode.textContent = state.playing
            ? "REPLAYING"
            : "RECORDED PASS";

        elements.playbackStatus.textContent = state.playing
            ? "PLAYING"
            : "PAUSED";

        elements.radarMessage.textContent =
            `SAMPLE ${state.selectedIndex + 1} / ${points.length}`;

        elements.azimuth.textContent =
            `${formatNumber(point.azimuthDegrees)}°`;

        elements.elevation.textContent =
            `${formatNumber(point.elevationDegrees)}°`;

        elements.range.textContent =
            `${formatNumber(point.slantRangeKm, 0)} KM`;

        elements.time.textContent =
            formatTime(point.timestamp);

        elements.peak.textContent =
            `${formatNumber(pass.maxElevationDegrees)}°`;

        elements.start.textContent =
            formatTime(pass.startTimestamp);

        elements.current.textContent =
            formatTime(point.timestamp);

        elements.end.textContent =
            formatTime(pass.endTimestamp);

        elements.slider.max = String(points.length - 1);
        elements.slider.value = String(state.selectedIndex);
        elements.slider.disabled = false;

        elements.previous.disabled = state.selectedIndex === 0;
        elements.next.disabled =
            state.selectedIndex >= points.length - 1;

        elements.play.disabled = points.length < 2;
        elements.restart.disabled = points.length < 2;
        elements.play.textContent = state.playing ? "Pause" : "Play Replay";

        renderElevationChart(pass);
    }

    function renderPassList() {
        elements.passList.replaceChildren();

        if (!state.passes.length) {
            const message = document.createElement("p");
            message.className = "pa-empty";
            message.textContent =
                "No recorded above-horizon passes yet. Keep the Kotlin server running to collect observations.";
            elements.passList.appendChild(message);
            return;
        }

        state.passes.forEach((pass, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "pa-pass-item";

            button.setAttribute(
                "aria-pressed",
                String(pass.startTimestamp === state.selectedStart)
            );

            const top = document.createElement("div");
            top.className = "pa-pass-item-top";

            const name = document.createElement("strong");
            name.textContent = `Recorded Pass ${index + 1}`;

            const count = document.createElement("span");
            count.textContent = `${pass.sampleCount} SAMPLES`;

            top.append(name, count);

            const peak = document.createElement("div");
            peak.className = "pa-pass-peak";
            peak.textContent =
                `${formatNumber(pass.maxElevationDegrees)}° MAX ELEVATION`;

            const bottom = document.createElement("div");
            bottom.className = "pa-pass-item-bottom";

            const times = document.createElement("span");
            times.textContent =
                `${formatTime(pass.startTimestamp)} — ${formatTime(pass.endTimestamp)}`;

            const flag = document.createElement("span");
            flag.className = "pa-pass-flag";
            flag.textContent =
                pass.partialAtStart || pass.partialAtEnd
                    ? "PARTIAL RECORD"
                    : "RECORDED SEGMENT";

            bottom.append(times, flag);
            button.append(top, peak, bottom);

            button.addEventListener("click", () => {
                stopPlayback();
                state.selectedStart = pass.startTimestamp;
                state.selectedIndex = 0;
                renderPassList();
                renderSelection();
            });

            elements.passList.appendChild(button);
        });
    }

    function playbackStep() {
        state.timer = null;

        if (!state.playing) return;

        const pass = selectedPass();

        if (!pass) {
            stopPlayback();
            renderSelection();
            return;
        }

        if (state.selectedIndex >= pass.points.length - 1) {
            stopPlayback();
            renderSelection();
            return;
        }

        state.selectedIndex++;
        renderSelection();

        if (state.selectedIndex >= pass.points.length - 1) {
            stopPlayback();
            renderSelection();
            return;
        }

        state.timer = setTimeout(
            playbackStep,
            Number(elements.speed.value)
        );
    }

    function startPlayback() {
        const pass = selectedPass();

        if (!pass || pass.points.length < 2) return;

        stopPlayback();

        if (state.selectedIndex >= pass.points.length - 1) {
            state.selectedIndex = 0;
        }

        state.playing = true;
        renderSelection();

        state.timer = setTimeout(
            playbackStep,
            Number(elements.speed.value)
        );
    }

    async function refresh() {
        if (state.loading) return;

        state.loading = true;
        elements.refresh.disabled = true;
        elements.apply.disabled = true;

        const observer = { ...state.observer };

        try {
            const query = new URLSearchParams({
                lat: String(observer.lat),
                lon: String(observer.lon),
                limit: "300"
            });

            const response = await fetch(
                `/api/iss/passes?${query}`,
                { cache: "no-store" }
            );

            if (!response.ok) {
                throw new Error(`Pass API: ${response.status}`);
            }

            const data = await response.json();

            if (
                observer.lat !== state.observer.lat ||
                observer.lon !== state.observer.lon
            ) {
                return;
            }

            const previousPass = selectedPass();
            const previousTimestamp =
                previousPass?.points[state.selectedIndex]?.timestamp;

            state.passes = Array.isArray(data.passes)
                ? data.passes
                : [];

            if (
                !state.passes.some(
                    pass => pass.startTimestamp === state.selectedStart
                )
            ) {
                state.selectedStart =
                    state.passes.at(-1)?.startTimestamp ?? null;

                state.selectedIndex = 0;
                stopPlayback();
            } else if (previousTimestamp !== undefined) {
                const pass = selectedPass();

                const index = pass.points.findIndex(
                    point => point.timestamp === previousTimestamp
                );

                if (index >= 0) {
                    state.selectedIndex = index;
                }
            }

            elements.passCount.textContent =
                String(data.passCount);

            elements.samples.textContent =
                String(data.totalSamples);

            elements.aboveCount.textContent =
                String(data.aboveHorizonSamples);

            elements.status.textContent = "DATA CONNECTED";
            elements.status.dataset.state = "live";

            renderPassList();
            renderSelection();
        } catch (error) {
            console.error("Pass Analysis failed:", error);

            elements.status.textContent = "CONNECTION ERROR";
            elements.status.dataset.state = "error";
        } finally {
            state.loading = false;
            elements.refresh.disabled = false;
            elements.apply.disabled = false;
        }
    }

    function applyLocation() {
        if (
            !elements.latitude.value.trim() ||
            !elements.longitude.value.trim()
        ) {
            return;
        }

        const lat = Number(elements.latitude.value);
        const lon = Number(elements.longitude.value);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 ||
            lat > 90 ||
            lon < -180 ||
            lon > 180
        ) {
            elements.status.textContent = "INVALID LOCATION";
            elements.status.dataset.state = "error";
            return;
        }

        state.observer = { lat, lon };
        state.passes = [];
        state.selectedStart = null;
        state.selectedIndex = 0;

        stopPlayback();
        renderPassList();
        renderSelection();
        refresh();
    }

    elements.location.addEventListener("change", () => {
        if (elements.location.value === "custom") return;

        const [lat, lon] = elements.location.value.split(",");

        elements.latitude.value = lat;
        elements.longitude.value = lon;
        applyLocation();
    });

    for (const input of [
        elements.latitude,
        elements.longitude
    ]) {
        input.addEventListener("input", () => {
            elements.location.value = "custom";
        });
    }

    elements.apply.addEventListener("click", applyLocation);
    elements.refresh.addEventListener("click", refresh);

    elements.slider.addEventListener("input", () => {
        stopPlayback();
        state.selectedIndex = Number(elements.slider.value);
        renderSelection();
    });

    elements.previous.addEventListener("click", () => {
        stopPlayback();
        state.selectedIndex--;
        renderSelection();
    });

    elements.next.addEventListener("click", () => {
        stopPlayback();
        state.selectedIndex++;
        renderSelection();
    });

    elements.play.addEventListener("click", () => {
        if (state.playing) {
            stopPlayback();
            renderSelection();
        } else {
            startPlayback();
        }
    });

    elements.restart.addEventListener("click", () => {
        stopPlayback();
        state.selectedIndex = 0;
        startPlayback();
    });

    elements.speed.addEventListener("change", () => {
        if (!state.playing) return;

        clearTimeout(state.timer);

        state.timer = setTimeout(
            playbackStep,
            Number(elements.speed.value)
        );
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopPlayback();
            renderSelection();
        }
    });

    renderSelection();
    refresh();
    setInterval(refresh, 5000);
})();
