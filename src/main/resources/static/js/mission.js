const missionFields = {
    name: document.getElementById("mission-name"),
    description: document.getElementById("mission-description"),
    catalog: document.getElementById("mission-catalog"),
    inclination: document.getElementById("mission-inclination"),
    period: document.getElementById("mission-period"),
    status: document.getElementById("mission-status"),
    type: document.getElementById("mission-type"),
    latitude: document.getElementById("mission-latitude"),
    longitude: document.getElementById("mission-longitude"),
    altitude: document.getElementById("mission-altitude"),
    velocity: document.getElementById("mission-velocity"),
    visibility: document.getElementById("mission-visibility"),
    updated: document.getElementById("mission-updated"),
    link: document.getElementById("mission-link-status")
};

async function fetchMissionData() {
    try {
        const response = await fetch("/api/mission", {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("Mission API unavailable");

        const data = await response.json();

        missionFields.name.textContent = data.name;
        missionFields.description.textContent = data.description;
        missionFields.catalog.textContent = data.catalogId;
        missionFields.inclination.textContent = `${data.inclination}°`;
        missionFields.period.textContent = `~${data.orbitalPeriodMinutes} MIN`;
        missionFields.status.textContent = data.status;
        missionFields.type.textContent = data.missionType;
    } catch (error) {
        console.error("Mission information unavailable:", error);
    }
}

let missionRequestPending = false;

async function updateMissionTelemetry() {
    if (missionRequestPending) return;

    missionRequestPending = true;

    try {
        const response = await fetch("/api/iss", {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("Telemetry unavailable");

        const data = await response.json();

        missionFields.latitude.textContent =
            `${data.latitude.toFixed(4)}°`;

        missionFields.longitude.textContent =
            `${data.longitude.toFixed(4)}°`;

        missionFields.altitude.textContent =
            `${data.altitude.toFixed(2)} KM`;

        missionFields.velocity.textContent =
            `${Math.round(data.velocity).toLocaleString("en-US")} KM/H`;

        missionFields.visibility.textContent =
            data.visibility.toUpperCase();

        missionFields.updated.textContent =
            new Date(data.timestamp * 1000).toLocaleTimeString("en-GB", {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }) + " UTC";

        missionFields.link.textContent = "LIVE CONNECTION";
        missionFields.link.className =
            "text-xs font-semibold text-[#168259]";
    } catch (error) {
        console.error("Mission telemetry error:", error);

        missionFields.link.textContent = "CONNECTION ERROR";
        missionFields.link.className =
            "text-xs font-semibold text-[#b45309]";
    } finally {
        missionRequestPending = false;
    }
}

fetchMissionData();
updateMissionTelemetry();
setInterval(updateMissionTelemetry, 5000);
