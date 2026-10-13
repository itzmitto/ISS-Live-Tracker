const historyElements = {
    status: document.getElementById("history-status"),
    total: document.getElementById("history-total"),
    window: document.getElementById("history-window"),
    first: document.getElementById("history-first"),
    last: document.getElementById("history-last"),
    body: document.getElementById("history-table-body"),
    refresh: document.getElementById("history-refresh")
};

function historyUtc(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

function historyDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;

    return [hours, minutes, remaining]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
}

function createHistoryChart(id, label, color, unit) {
    if (!window.Chart) return null;

    return new Chart(document.getElementById(id), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label,
                data: [],
                borderColor: color,
                backgroundColor: color + "18",
                borderWidth: 2,
                tension: 0.25,
                pointRadius: 2,
                pointHoverRadius: 5,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.parsed.y.toFixed(2)} ${unit}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#587388",
                        maxTicksLimit: 6
                    },
                    grid: {
                        color: "#e2ebf1"
                    }
                },
                y: {
                    ticks: {
                        color: "#587388"
                    },
                    grid: {
                        color: "#e2ebf1"
                    }
                }
            }
        }
    });
}

const altitudeHistoryChart = createHistoryChart(
    "history-altitude-chart",
    "Altitude",
    "#0a6ea8",
    "km"
);

const velocityHistoryChart = createHistoryChart(
    "history-velocity-chart",
    "Velocity",
    "#b47732",
    "km/h"
);

function updateHistoryChart(chart, samples, field) {
    if (!chart) return;

    chart.data.labels = samples.map(point =>
        historyUtc(point.timestamp)
    );

    chart.data.datasets[0].data = samples.map(point =>
        point[field]
    );

    chart.update("none");
}

function renderHistoryTable(samples) {
    historyElements.body.replaceChildren();

    const recent = [...samples].reverse().slice(0, 60);

    if (!recent.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className =
            "px-5 py-8 text-center text-sm text-[#587388]";
        cell.textContent = "Waiting for telemetry records...";

        row.appendChild(cell);
        historyElements.body.appendChild(row);
        return;
    }

    for (const [index, point] of recent.entries()) {
        const row = document.createElement("tr");

        row.className =
            "border-b border-[#e2ebf1] hover:bg-[#f3f8fc]";

        const values = [
            String(index + 1).padStart(2, "0"),
            historyUtc(point.timestamp),
            `${point.latitude.toFixed(4)}°`,
            `${point.longitude.toFixed(4)}°`,
            `${point.altitude.toFixed(2)} KM`,
            `${Math.round(point.velocity)} KM/H`,
            point.visibility.toUpperCase()
        ];

        for (const [column, value] of values.entries()) {
            const cell = document.createElement("td");

            cell.className =
                "whitespace-nowrap px-5 py-4 font-mono text-xs " +
                ([2, 3].includes(column)
                    ? "text-[#0a6ea8]"
                    : "text-[#36576e]");

            cell.textContent = value;
            row.appendChild(cell);
        }

        historyElements.body.appendChild(row);
    }
}

function renderHistory(samples) {
    historyElements.total.textContent = samples.length;

    if (!samples.length) {
        historyElements.window.textContent = "00:00:00";
        historyElements.first.textContent = "--";
        historyElements.last.textContent = "--";
    } else {
        const first = samples[0];
        const last = samples.at(-1);

        historyElements.window.textContent = historyDuration(
            Math.max(0, last.timestamp - first.timestamp)
        );

        historyElements.first.textContent =
            `${historyUtc(first.timestamp)} UTC`;

        historyElements.last.textContent =
            `${historyUtc(last.timestamp)} UTC`;
    }

    updateHistoryChart(
        altitudeHistoryChart,
        samples,
        "altitude"
    );

    updateHistoryChart(
        velocityHistoryChart,
        samples,
        "velocity"
    );

    renderHistoryTable(samples);
}

let historyLoading = false;

async function refreshHistoricalTelemetry() {
    if (historyLoading) return;

    historyLoading = true;
    historyElements.status.textContent = "UPDATING";

    try {
        const liveResponse = await fetch("/api/iss", {
            cache: "no-store"
        });

        if (!liveResponse.ok) {
            throw new Error("Live ISS telemetry unavailable.");
        }

        const response = await fetch("/api/iss/history?limit=120", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Historical telemetry unavailable.");
        }

        const samples = await response.json();

        if (!Array.isArray(samples)) {
            throw new Error("Invalid history response.");
        }

        renderHistory(samples);

        historyElements.status.textContent = "LIVE HISTORY";
        historyElements.status.className =
            "text-xs font-semibold text-[#168259]";
    } catch (error) {
        console.error("History update failed:", error);

        historyElements.status.textContent = "CONNECTION ERROR";
        historyElements.status.className =
            "text-xs font-semibold text-[#b45309]";
    } finally {
        historyLoading = false;
    }
}

historyElements.refresh.addEventListener(
    "click",
    refreshHistoricalTelemetry
);

refreshHistoricalTelemetry();
setInterval(refreshHistoricalTelemetry, 5000);
