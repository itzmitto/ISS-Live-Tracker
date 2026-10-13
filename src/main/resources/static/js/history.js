const HISTORY_LIMIT = 30;
const positionHistory = [];

const historyBody = document.getElementById("history-body");
const historyCount = document.getElementById("history-count");
const historyLatest = document.getElementById("history-latest");

function formatUtc(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

function renderHistory() {
    if (!historyBody) return;

    historyBody.replaceChildren();

    for (const [index, point] of positionHistory.entries()) {
        const row = document.createElement("tr");

        row.className =
            "border-b border-[#19252c] hover:bg-[#101a21] transition-colors";

        const values = [
            String(index + 1).padStart(2, "0"),
            formatUtc(point.timestamp),
            `${point.latitude.toFixed(4)}°`,
            `${point.longitude.toFixed(4)}°`,
            `${point.altitude.toFixed(2)} KM`,
            `${Math.round(point.velocity)} KM/H`
        ];

        for (const [column, value] of values.entries()) {
            const cell = document.createElement("td");

            cell.className =
                "whitespace-nowrap px-5 py-3 font-mono text-[11px] " +
                (column === 0
                    ? "text-[#52636c]"
                    : column === 2 || column === 3
                        ? "text-[#8ed4f3]"
                        : "text-[#9daeb8]");

            cell.textContent = value;
            row.appendChild(cell);
        }

        historyBody.appendChild(row);
    }

    historyCount.textContent = String(positionHistory.length);

    historyLatest.textContent = positionHistory.length
        ? `${formatUtc(positionHistory[0].timestamp)} UTC`
        : "WAITING";
}

window.recordIssPosition = function (data) {
    if (
        !Number.isFinite(data.latitude) ||
        !Number.isFinite(data.longitude) ||
        !Number.isFinite(data.altitude) ||
        !Number.isFinite(data.velocity) ||
        !Number.isFinite(data.timestamp)
    ) {
        return;
    }

    if (
        positionHistory.length &&
        data.timestamp <= positionHistory[0].timestamp
    ) {
        return;
    }

    positionHistory.unshift({
        timestamp: data.timestamp,
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
        velocity: data.velocity
    });

    if (positionHistory.length > HISTORY_LIMIT) {
        positionHistory.pop();
    }

    renderHistory();
};

renderHistory();
