(() => {
    const $ = id => document.getElementById(id);

    const elements = {
        location: $("pp-location"),
        lat: $("pp-lat"),
        lon: $("pp-lon"),
        hours: $("pp-hours"),
        elevation: $("pp-elevation"),
        calculate: $("pp-calculate"),
        status: $("pp-status"),
        count: $("pp-count"),
        countdown: $("pp-countdown"),
        nextPeak: $("pp-next-peak"),
        model: $("pp-model"),
        list: $("pp-list"),
        track: $("pp-track"),
        start: $("pp-start-dot"),
        end: $("pp-end-dot"),
        message: $("pp-radar-message"),
        rise: $("pp-rise"),
        set: $("pp-set"),
        max: $("pp-max"),
        duration: $("pp-duration"),
        source: $("pp-source"),
        tle: $("pp-tle"),
        generated: $("pp-generated")
    };

    let passes = [];
    let selectedStart = null;

    function dateTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleString(
            "en-GB",
            {
                timeZone: "UTC",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }
        ) + " UTC";
    }

    function formatDuration(seconds) {
        const total = Math.max(0, Math.floor(seconds));

        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const remaining = total % 60;

        return [hours, minutes, remaining]
            .map(value => String(value).padStart(2, "0"))
            .join(":");
    }

    function polar(point) {
        const elevation = Math.max(
            0,
            Math.min(90, point.elevationDegrees)
        );

        const radius = (90 - elevation) / 90 * 125;
        const angle = point.azimuthDegrees * Math.PI / 180;

        return {
            x: 160 + Math.sin(angle) * radius,
            y: 160 - Math.cos(angle) * radius
        };
    }

    function setDot(element, point) {
        if (!point) {
            element.setAttribute("visibility", "hidden");
            return;
        }

        const position = polar(point);

        element.setAttribute("cx", String(position.x));
        element.setAttribute("cy", String(position.y));
        element.setAttribute("visibility", "visible");
    }

    function renderSelection() {
        const pass = passes.find(
            item => item.startTimestamp === selectedStart
        );

        if (!pass) {
            elements.track.setAttribute("points", "");
            setDot(elements.start, null);
            setDot(elements.end, null);
            elements.message.textContent =
                "No pass selected.";
            return;
        }

        const positions = pass.track.map(polar);

        elements.track.setAttribute(
            "points",
            positions.map(
                point => `${point.x},${point.y}`
            ).join(" ")
        );

        setDot(elements.start, pass.track[0]);
        setDot(elements.end, pass.track.at(-1));

        elements.rise.textContent =
            `${pass.riseAzimuthDegrees.toFixed(1)}°`;

        elements.set.textContent =
            `${pass.setAzimuthDegrees.toFixed(1)}°`;

        elements.max.textContent =
            `${pass.maxElevationDegrees.toFixed(1)}°`;

        elements.duration.textContent =
            formatDuration(pass.durationSeconds);

        elements.message.textContent =
            `PREDICTED PASS · ${dateTime(pass.startTimestamp)}`;
    }

    function renderPasses() {
        elements.list.replaceChildren();

        if (!passes.length) {
            const message = document.createElement("p");

            message.className = "pp-empty";
            message.textContent =
                "No passes meet these settings. Try a 48-hour forecast or lower the minimum elevation.";

            elements.list.appendChild(message);
            renderSelection();
            return;
        }

        passes.forEach((pass, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "pp-pass";

            button.setAttribute(
                "aria-pressed",
                String(pass.startTimestamp === selectedStart)
            );

            const main = document.createElement("div");
            main.className = "pp-pass-main";

            const title = document.createElement("strong");
            title.textContent = `Predicted Pass ${index + 1}`;

            const time = document.createElement("small");
            time.textContent =
                `${dateTime(pass.startTimestamp)} — ${dateTime(pass.endTimestamp)}`;

            const peak = document.createElement("span");
            peak.className = "pp-pass-peak";
            peak.textContent =
                `${pass.maxElevationDegrees.toFixed(1)}° MAX`;

            main.append(title, time);
            button.append(main, peak);

            button.addEventListener("click", () => {
                selectedStart = pass.startTimestamp;
                renderPasses();
            });

            elements.list.appendChild(button);
        });

        renderSelection();
    }

    function updateCountdown() {
        const now = Date.now() / 1000;

        const next = passes.find(
            pass => pass.endTimestamp > now
        );

        if (!next) {
            elements.countdown.textContent = "--:--:--";
            elements.nextPeak.textContent = "--";
            return;
        }

        elements.nextPeak.textContent =
            `${next.maxElevationDegrees.toFixed(1)}°`;

        if (now >= next.startTimestamp) {
            elements.countdown.textContent = "IN PROGRESS";
            return;
        }

        elements.countdown.textContent = formatDuration(
            next.startTimestamp - now
        );
    }

    async function calculate() {
        const latitudeText = elements.lat.value.trim();
        const longitudeText = elements.lon.value.trim();

        const latitude = Number(latitudeText);
        const longitude = Number(longitudeText);

        if (
            !latitudeText ||
            !longitudeText ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            elements.status.textContent = "INVALID LOCATION";
            elements.status.dataset.state = "error";
            return;
        }

        elements.calculate.disabled = true;
        elements.status.textContent = "CALCULATING";

        try {
            const query = new URLSearchParams({
                lat: String(latitude),
                lon: String(longitude),
                hours: elements.hours.value,
                minElevation: elements.elevation.value
            });

            const response = await fetch(
                `/api/iss/predictions?${query}`,
                { cache: "no-store" }
            );

            if (!response.ok) {
                throw new Error(`API error ${response.status}`);
            }

            const report = await response.json();

            passes = Array.isArray(report.passes)
                ? report.passes
                : [];

            selectedStart =
                passes[0]?.startTimestamp ?? null;

            elements.count.textContent =
                String(passes.length);

            elements.model.textContent =
                report.predictionModel;

            elements.source.textContent =
                report.tleSource;

            elements.tle.textContent =
                dateTime(report.tleEpoch);

            elements.generated.textContent =
                dateTime(report.generatedAt);

            elements.status.textContent =
                "PREDICTIONS READY";

            elements.status.dataset.state = "live";

            renderPasses();
            updateCountdown();
        } catch (error) {
            console.error(error);

            elements.status.textContent =
                "PREDICTION ERROR";

            elements.status.dataset.state = "error";

            elements.list.replaceChildren();

            const message = document.createElement("p");
            message.className = "pp-empty";
            message.textContent =
                "Predictions are unavailable. Check the Kotlin server and CelesTrak connection.";

            elements.list.appendChild(message);
        } finally {
            elements.calculate.disabled = false;
        }
    }

    elements.location.addEventListener("change", () => {
        if (elements.location.value === "custom") return;

        const [lat, lon] = elements.location.value.split(",");

        elements.lat.value = lat;
        elements.lon.value = lon;
        calculate();
    });

    for (const input of [elements.lat, elements.lon]) {
        input.addEventListener("input", () => {
            elements.location.value = "custom";
        });
    }

    elements.calculate.addEventListener("click", calculate);

    setInterval(updateCountdown, 1000);

    calculate();
})();
