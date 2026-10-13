(() => {
    const api = window.issMapApi;
    if (!api || typeof window.updateIssMap !== "function") {
        console.error("ISS map controls could not initialize.");
        return;
    }

    const { map, getCurrentPosition, getTrailLayers } = api;
    const followButton = document.getElementById("map-follow");
    const trailButton = document.getElementById("map-trail");
    const resetButton = document.getElementById("map-reset");
    const fullscreenButton = document.getElementById("map-fullscreen");
    const mapStage = document.getElementById("iss-map-stage");

    let following = false;
    let trailVisible = true;

    const originalUpdate = window.updateIssMap;

    function updateButtons() {
        followButton.textContent = following ? "Following ISS" : "Follow ISS";
        followButton.setAttribute("aria-pressed", String(following));

        trailButton.textContent = trailVisible ? "Hide Trail" : "Show Trail";
        trailButton.setAttribute("aria-pressed", String(trailVisible));
    }

    function centerOnIss() {
        const position = getCurrentPosition();
        if (!position) return;

        const difference = Math.abs(position[1] - map.getCenter().lng);

        if (difference > 180) {
            map.setView(position, map.getZoom(), { animate: false });
        } else {
            map.panTo(position, {
                animate: true,
                duration: 0.7
            });
        }
    }

    function updateTrailVisibility() {
        for (const layer of getTrailLayers()) {
            if (trailVisible) {
                if (!map.hasLayer(layer)) layer.addTo(map);
            } else {
                if (map.hasLayer(layer)) map.removeLayer(layer);
            }
        }
    }

    window.updateIssMap = function(latitude, longitude) {
        originalUpdate(latitude, longitude);

        if (!trailVisible) updateTrailVisibility();
        if (following) centerOnIss();
    };

    followButton.addEventListener("click", () => {
        following = !following;
        if (following) centerOnIss();
        updateButtons();
    });

    trailButton.addEventListener("click", () => {
        trailVisible = !trailVisible;
        updateTrailVisibility();
        updateButtons();
    });

    resetButton.addEventListener("click", () => {
        following = false;
        map.setView([15, 0], 2);
        updateButtons();
    });

    fullscreenButton.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement === mapStage) {
                await document.exitFullscreen();
            } else {
                await mapStage.requestFullscreen();
            }
        } catch (error) {
            console.error("Unable to change fullscreen mode:", error);
        }
    });

    document.addEventListener("fullscreenchange", () => {
        fullscreenButton.textContent =
            document.fullscreenElement === mapStage
                ? "Exit Fullscreen"
                : "Fullscreen";

        setTimeout(() => map.invalidateSize(), 150);
    });

    updateButtons();
})();
