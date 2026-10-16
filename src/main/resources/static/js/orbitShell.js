(() => {
    const body = document.body;
    const main = document.querySelector("main");
    const navigation = document.querySelector(".orbit-nav");

    if (!main) return;

    const currentPath = window.location.pathname;

    if (navigation) {
        for (const link of navigation.querySelectorAll("a")) {
            const path = new URL(link.href).pathname;

            if (path === currentPath) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        }
    }

    const toolbar = document.createElement("div");
    toolbar.className = "orbit-toolbar";

    toolbar.innerHTML = `
        <div class="orbit-toolbar-inner">
            <div class="orbit-toolbar-identity">
                <span class="orbit-toolbar-symbol" aria-hidden="true">◎</span>
                <span>MISSION CONTROL / EARTH OBSERVATION</span>
            </div>

            <div class="orbit-toolbar-right">
                <div class="orbit-utc">
                    <span>UTC</span>
                    <strong id="orbit-utc-clock">--:--:--</strong>
                </div>

                <div class="orbit-palette" role="group" aria-label="Light color palette">
                    <button type="button" data-orbit-option="ice" aria-pressed="true">
                        Polar Ice
                    </button>
                    <button type="button" data-orbit-option="sky" aria-pressed="false">
                        Arctic Blue
                    </button>
                </div>
            </div>
        </div>
    `;

    main.before(toolbar);

    const clock = document.getElementById("orbit-utc-clock");

    function updateUtcClock() {
        clock.textContent = new Date().toLocaleTimeString("en-GB", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });
    }

    function applyPalette(palette, save = false) {
        const selected = palette === "sky" ? "sky" : "ice";

        body.dataset.orbitPalette = selected;

        for (const button of toolbar.querySelectorAll("[data-orbit-option]")) {
            button.setAttribute(
                "aria-pressed",
                String(button.dataset.orbitOption === selected)
            );
        }

        if (save) {
            try {
                localStorage.setItem("iss-orbit-palette", selected);
            } catch (error) {
                console.warn("Palette preference could not be saved.", error);
            }
        }
    }

    let initialPalette = "ice";

    try {
        initialPalette = localStorage.getItem("iss-orbit-palette") || "ice";
    } catch (error) {
        console.warn("Palette preference unavailable.", error);
    }

    applyPalette(initialPalette);

    for (const button of toolbar.querySelectorAll("[data-orbit-option]")) {
        button.addEventListener("click", () => {
            applyPalette(button.dataset.orbitOption, true);
        });
    }

    updateUtcClock();
    setInterval(updateUtcClock, 1000);
})();
