const latitudeElement = document.getElementById("latitude");
const longitudeElement = document.getElementById("longitude");
const altitudeElement = document.getElementById("altitude");
const velocityElement = document.getElementById("velocity");
const lastUpdateElement = document.getElementById("last-update");

const visibilityElement = document.getElementById("visibility");
const footprintElement = document.getElementById("footprint");
const apiLatencyElement = document.getElementById("api-latency");
const apiStatusElement = document.getElementById("api-status");

async function updateIssTelemetry() {
    const requestStarted = performance.now();

    try {
        const response = await fetch("/api/iss", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`ISS API returned ${response.status}`);
        }

        const data = await response.json();
        const latency = Math.round(performance.now() - requestStarted);

        if (window.updateIssMap) {
            window.updateIssMap(data.latitude, data.longitude);
        }

        latitudeElement.textContent = `${data.latitude.toFixed(4)}°`;
        longitudeElement.textContent = `${data.longitude.toFixed(4)}°`;
        altitudeElement.textContent = `${data.altitude.toFixed(2)} KM`;
        velocityElement.textContent = `${Math.round(data.velocity)} KM/H`;

        visibilityElement.textContent = data.visibility.toUpperCase();
        footprintElement.textContent = `${data.footprint.toFixed(2)} KM`;
        apiLatencyElement.textContent = `${latency} MS`;
        apiStatusElement.textContent = "ONLINE";

        const timestamp = new Date(data.timestamp * 1000);

        lastUpdateElement.textContent =
            `${timestamp.toLocaleTimeString("en-GB", {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            })} UTC`;
    } catch (error) {
        console.error("Unable to update ISS telemetry:", error);

        apiStatusElement.textContent = "ERROR";
        apiLatencyElement.textContent = "--";
        lastUpdateElement.textContent = "CONNECTION ERROR";
    }
}

updateIssTelemetry();
setInterval(updateIssTelemetry, 5000);
