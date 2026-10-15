(() => {
    const fields = {
        status: document.getElementById("orbit-status"),
        updated: document.getElementById("orbit-updated"),
        period: document.getElementById("orbit-period"),
        perDay: document.getElementById("orbit-per-day"),
        circumference: document.getElementById("orbit-circumference"),
        altitude: document.getElementById("orbit-altitude"),
        observedVelocity: document.getElementById("orbit-observed-velocity"),
        circularVelocity: document.getElementById("orbit-circular-velocity"),
        radius: document.getElementById("orbit-radius"),
        horizonAngle: document.getElementById("orbit-horizon-angle"),
        horizonRadius: document.getElementById("orbit-horizon-radius")
    };

    const formatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    function format(value, unit) {
        if (!Number.isFinite(value)) return "--";
        return `${formatter.format(value)} ${unit}`;
    }

    function updateDisplay(data) {
        fields.period.textContent =
            format(data.estimatedPeriodMinutes, "MIN");

        fields.perDay.textContent =
            format(data.estimatedOrbitsPerDay, "ORBITS");

        fields.circumference.textContent =
            format(data.estimatedCircumferenceKm, "KM");

        fields.altitude.textContent =
            format(data.altitudeKm, "KM");

        fields.observedVelocity.textContent =
            format(data.observedVelocityKmh, "KM/H");

        fields.circularVelocity.textContent =
            format(data.estimatedCircularVelocityKmh, "KM/H");

        fields.radius.textContent =
            format(data.orbitalRadiusKm, "KM");

        fields.horizonAngle.textContent =
            format(data.horizonAngleDegrees, "°");

        fields.horizonRadius.textContent =
            format(data.horizonSurfaceRadiusKm, "KM");

        fields.updated.textContent =
            new Date(data.timestamp * 1000).toLocaleTimeString("en-GB", {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }) + " UTC";
    }

    let loading = false;

    async function refreshOrbit() {
        if (loading) return;

        loading = true;

        try {
            const response = await fetch("/api/iss/orbit", {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Orbital API error: ${response.status}`);
            }

            const data = await response.json();

            updateDisplay(data);

            fields.status.textContent = "LIVE DATA";
            fields.status.className =
                "text-xs font-semibold text-[#168259]";
        } catch (error) {
            console.error("Orbital analytics failed:", error);

            fields.status.textContent = "CONNECTION ERROR";
            fields.status.className =
                "text-xs font-semibold text-[#b45309]";
        } finally {
            loading = false;
        }
    }

    refreshOrbit();
    setInterval(refreshOrbit, 5000);
})();
