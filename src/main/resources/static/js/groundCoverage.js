(() => {
    const mapApi = window.issMapApi;

    if (!window.L || !mapApi?.map) {
        console.error("Ground coverage requires the ISS map.");
        return;
    }

    const map = mapApi.map;
    const diameterElement = document.getElementById("coverage-diameter");
    const radiusElement = document.getElementById("coverage-radius");
    const areaElement = document.getElementById("coverage-area");
    const statusElement = document.getElementById("coverage-status");
    const toggleButton = document.getElementById("coverage-toggle");
    const focusButton = document.getElementById("coverage-focus");

    const EARTH_RADIUS_KM = 6371;
    let coverageCircle = null;
    let coverageVisible = true;

    function formatKm(value) {
        return value.toLocaleString("en-US", {
            maximumFractionDigits: 2
        });
    }

    function calculateArea(radiusKm) {
        const angle = radiusKm / EARTH_RADIUS_KM;

        return 2 * Math.PI * EARTH_RADIUS_KM ** 2 *
            (1 - Math.cos(angle));
    }

    function updateButton() {
        toggleButton.textContent = coverageVisible
            ? "Hide Coverage"
            : "Show Coverage";

        toggleButton.setAttribute(
            "aria-pressed",
            String(coverageVisible)
        );
    }

    function updateCoverage(data) {
        if (
            !Number.isFinite(data.latitude) ||
            !Number.isFinite(data.longitude) ||
            !Number.isFinite(data.footprint) ||
            data.footprint <= 0
        ) {
            return;
        }

        const diameterKm = data.footprint;
        const radiusKm = diameterKm / 2;
        const radiusMeters = radiusKm * 1000;

        const position = [
            data.latitude,
            data.longitude
        ];

        if (!coverageCircle) {
            coverageCircle = L.circle(position, {
                radius: radiusMeters,
                color: "#14689d",
                weight: 2,
                opacity: 0.85,
                fillColor: "#5ea5d4",
                fillOpacity: 0.14,
                interactive: false
            });

            if (coverageVisible) {
                coverageCircle.addTo(map);
            }
        } else {
            coverageCircle.setLatLng(position);
            coverageCircle.setRadius(radiusMeters);
        }

        diameterElement.textContent =
            `${formatKm(diameterKm)} KM`;

        radiusElement.textContent =
            `${formatKm(radiusKm)} KM`;

        areaElement.textContent =
            `${formatKm(calculateArea(radiusKm))} KM²`;

        statusElement.textContent =
            coverageVisible ? "VISIBLE" : "HIDDEN";
    }

    toggleButton.addEventListener("click", () => {
        coverageVisible = !coverageVisible;

        if (coverageCircle) {
            if (coverageVisible) {
                coverageCircle.addTo(map);
            } else {
                coverageCircle.remove();
            }
        }

        statusElement.textContent =
            coverageVisible ? "VISIBLE" : "HIDDEN";

        updateButton();
    });

    focusButton.addEventListener("click", () => {
        if (!coverageCircle) return;

        map.fitBounds(coverageCircle.getBounds(), {
            padding: [40, 40],
            maxZoom: 5,
            animate: true
        });
    });

    window.updateIssCoverage = updateCoverage;

    updateButton();
})();
