const latitudeElement = document.getElementById("latitude");
const longitudeElement = document.getElementById("longitude");
const altitudeElement = document.getElementById("altitude");
const velocityElement = document.getElementById("velocity");
const lastUpdateElement = document.getElementById("last-update");

async function updateIssTelemetry() {
    try {
        const response = await fetch("/api/iss", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`ISS API returned ${response.status}`);
        }

        const data = await response.json();

        latitudeElement.textContent = `${data.latitude.toFixed(4)}°`;
        longitudeElement.textContent = `${data.longitude.toFixed(4)}°`;
        altitudeElement.textContent = `${data.altitude.toFixed(2)} KM`;
        velocityElement.textContent = `${Math.round(data.velocity)} KM/H`;

        const timestamp = new Date(data.timestamp * 1000);

        lastUpdateElement.textContent = timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    } catch (error) {
        console.error("Unable to update ISS telemetry:", error);
        lastUpdateElement.textContent = "CONNECTION ERROR";
    }
}

updateIssTelemetry();
setInterval(updateIssTelemetry, 5000);
