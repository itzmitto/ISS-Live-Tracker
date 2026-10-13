const chartHistory = [];
const MAX_CHART_POINTS = 40;

const chartColors = {
    altitude: "#0a6ea8",
    velocity: "#b47732",
    grid: "#e1eaf1",
    text: "#587388"
};

function createTelemetryChart(canvasId, label, color, unit) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || !window.Chart) return null;

    return new Chart(canvas, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label,
                data: [],
                borderColor: color,
                backgroundColor: color + "18",
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 5,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.parsed.y.toFixed(2)} ${unit}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: chartColors.grid
                    },
                    ticks: {
                        color: chartColors.text,
                        maxTicksLimit: 6
                    }
                },
                y: {
                    grid: {
                        color: chartColors.grid
                    },
                    ticks: {
                        color: chartColors.text,
                        callback: value => `${value} ${unit}`
                    }
                }
            }
        }
    });
}

const altitudeChart = createTelemetryChart(
    "altitude-chart",
    "Orbital Altitude",
    chartColors.altitude,
    "km"
);

const velocityChart = createTelemetryChart(
    "velocity-chart",
    "Orbital Velocity",
    chartColors.velocity,
    "km/h"
);

window.recordIssChartSample = function(data) {
    if (
        !Number.isFinite(data.timestamp) ||
        !Number.isFinite(data.altitude) ||
        !Number.isFinite(data.velocity)
    ) {
        return;
    }

    const previous = chartHistory.at(-1);

    if (previous && data.timestamp <= previous.timestamp) {
        return;
    }

    chartHistory.push({
        timestamp: data.timestamp,
        altitude: data.altitude,
        velocity: data.velocity
    });

    if (chartHistory.length > MAX_CHART_POINTS) {
        chartHistory.shift();
    }

    const labels = chartHistory.map(point =>
        new Date(point.timestamp * 1000).toLocaleTimeString(
            "en-GB",
            {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        )
    );

    if (altitudeChart) {
        altitudeChart.data.labels = labels;
        altitudeChart.data.datasets[0].data =
            chartHistory.map(point => point.altitude);

        altitudeChart.update();
    }

    if (velocityChart) {
        velocityChart.data.labels = labels;
        velocityChart.data.datasets[0].data =
            chartHistory.map(point => point.velocity);

        velocityChart.update();
    }

    const count = document.getElementById("chart-points");

    if (count) {
        count.textContent = String(chartHistory.length);
    }
};
