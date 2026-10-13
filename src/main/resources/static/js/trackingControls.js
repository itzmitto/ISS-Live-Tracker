(() => {
    const elements = {
        toggle: document.getElementById("tracking-toggle"),
        refresh: document.getElementById("tracking-refresh"),
        interval: document.getElementById("tracking-interval"),
        status: document.getElementById("tracking-control-status"),
        countdown: document.getElementById("tracking-countdown"),
        lastRequest: document.getElementById("tracking-last-request")
    };

    if (
        !Object.values(elements).every(Boolean) ||
        typeof window.fetchIssTelemetry !== "function"
    ) {
        console.error("Tracking controls could not initialize.");
        return;
    }

    let trackingActive = true;
    let intervalMs = 5000;
    let timerId = null;
    let nextRefreshAt = null;
    let currentRequest = null;

    function formatUtc(date) {
        return date.toLocaleTimeString("en-GB", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }) + " UTC";
    }

    function renderControls() {
        elements.toggle.textContent = trackingActive
            ? "Pause Tracking"
            : "Resume Tracking";

        elements.toggle.setAttribute(
            "aria-pressed",
            String(trackingActive)
        );

        elements.status.textContent = trackingActive
            ? "TRACKING ACTIVE"
            : "TRACKING PAUSED";

        elements.status.dataset.active = String(trackingActive);
        elements.refresh.disabled = currentRequest !== null;
    }

    function renderCountdown() {
        if (!trackingActive) {
            elements.countdown.textContent = "PAUSED";
            return;
        }

        if (currentRequest) {
            elements.countdown.textContent = "FETCHING";
            return;
        }

        if (nextRefreshAt === null) {
            elements.countdown.textContent = "WAITING";
            return;
        }

        const remaining = Math.max(
            0,
            Math.ceil((nextRefreshAt - Date.now()) / 1000)
        );

        elements.countdown.textContent =
            `00:${String(remaining).padStart(2, "0")}`;
    }

    function refreshNow() {
        if (currentRequest) {
            return currentRequest;
        }

        currentRequest = (async () => {
            await window.fetchIssTelemetry();

            elements.lastRequest.textContent =
                formatUtc(new Date());
        })().finally(() => {
            currentRequest = null;
            renderControls();
            renderCountdown();
        });

        renderControls();
        renderCountdown();

        return currentRequest;
    }

    function scheduleNext() {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }

        nextRefreshAt = null;

        if (!trackingActive) {
            renderCountdown();
            return;
        }

        nextRefreshAt = Date.now() + intervalMs;

        timerId = setTimeout(async () => {
            timerId = null;
            nextRefreshAt = null;

            try {
                await refreshNow();
            } catch (error) {
                console.error("Scheduled tracking failed:", error);
            } finally {
                scheduleNext();
            }
        }, intervalMs);

        renderCountdown();
    }

    elements.toggle.addEventListener("click", async () => {
        trackingActive = !trackingActive;

        if (trackingActive) {
            renderControls();

            try {
                await refreshNow();
            } finally {
                if (trackingActive) {
                    scheduleNext();
                }
            }
        } else {
            scheduleNext();
            renderControls();
        }
    });

    elements.refresh.addEventListener("click", async () => {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }

        try {
            await refreshNow();
        } finally {
            if (trackingActive) {
                scheduleNext();
            }
        }
    });

    elements.interval.addEventListener("change", () => {
        intervalMs = Number(elements.interval.value);

        if (trackingActive) {
            scheduleNext();
        }

        renderControls();
    });

    window.issTrackingControls = {
        isActive: () => trackingActive,
        getInterval: () => intervalMs,
        refresh: refreshNow
    };

    renderControls();
    setInterval(renderCountdown, 250);

    refreshNow()
        .catch(error => {
            console.error("Initial tracking failed:", error);
        })
        .finally(scheduleNext);
})();
