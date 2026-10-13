const statisticsElements = {
    status: document.getElementById("stats-status"),
    samples: document.getElementById("stats-samples"),
    duration: document.getElementById("stats-duration"),
    distance: document.getElementById("stats-distance"),
    updated: document.getElementById("stats-updated"),
    altitudeMin: document.getElementById("stats-alt-min"),
    altitudeMax: document.getElementById("stats-alt-max"),
    altitudeAverage: document.getElementById("stats-alt-avg"),
    velocityMin: document.getElementById("stats-vel-min"),
    velocityMax: document.getElementById("stats-vel-max"),
    velocityAverage: document.getElementById("stats-vel-avg")
};

function formatNumber(value, decimals = 2) {
    if (value === null || !Number.isFinite(value)) return "--";

    return value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;

    return [hours, minutes, remaining]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
}

function renderStatistics(data) {
    statisticsElements.samples.textContent = data.samples;
    statisticsElements.duration.textContent =
        formatDuration(data.trackedSeconds);

    statisticsElements.distance.textContent =
        `${formatNumber(data.groundDistanceKm)} KM`;

    statisticsElements.altitudeMin.textContent =
        `${formatNumber(data.minAltitudeKm)} KM`;

    statisticsElements.altitudeMax.textContent =
        `${formatNumber(data.maxAltitudeKm)} KM`;

    statisticsElements.altitudeAverage.textContent =
        `${formatNumber(data.averageAltitudeKm)} KM`;

    statisticsElements.velocityMin.textContent =
        `${formatNumber(data.minVelocityKmh)} KM/H`;

    statisticsElements.velocityMax.textContent =
        `${formatNumber(data.maxVelocityKmh)} KM/H`;

    statisticsElements.velocityAverage.textContent =
        `${formatNumber(data.averageVelocityKmh)} KM/H`;

    statisticsElements.updated.textContent = data.lastTimestamp
        ? new Date(data.lastTimestamp * 1000).toLocaleTimeString(
            "en-GB",
            {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        ) + " UTC"
        : "WAITING";
}

let statisticsLoading = false;

async function updateStatistics() {
    if (statisticsLoading) return;

    statisticsLoading = true;

    try {
        const liveResponse = await fetch("/api/iss", {
            cache: "no-store"
        });

        if (!liveResponse.ok) {
            throw new Error("ISS telemetry unavailable");
        }

        const response = await fetch("/api/iss/stats", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("ISS statistics unavailable");
        }

        const data = await response.json();

        renderStatistics(data);

        statisticsElements.status.textContent = "LIVE DATA";
        statisticsElements.status.className =
            "text-xs font-semibold text-[#168259]";
    } catch (error) {
        console.error("Statistics update failed:", error);

        statisticsElements.status.textContent = "CONNECTION ERROR";
        statisticsElements.status.className =
            "text-xs font-semibold text-[#b45309]";
    } finally {
        statisticsLoading = false;
    }
}

updateStatistics();
setInterval(updateStatistics, 5000);
