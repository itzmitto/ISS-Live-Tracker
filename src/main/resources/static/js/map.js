const map = L.map("iss-map", {
    worldCopyJump: true,
    zoomControl: true,
    attributionControl: true,
    minZoom: 2
}).setView([20, 0], 2);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 7,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const issIcon = L.divIcon({
    className: "",
    html: `
        <div class="iss-marker">
            <div class="iss-marker-core"></div>
            <div class="iss-marker-ring"></div>
            <span>ISS</span>
        </div>
    `,
    iconSize: [60, 40],
    iconAnchor: [20, 20]
});

const issMarker = L.marker([0, 0], {
    icon: issIcon
}).addTo(map);

let trailSegments = [];
let currentTrail = L.polyline([], {
    weight: 2,
    opacity: 0.7,
    color: "#8ed4f3"
}).addTo(map);

let trailPositions = [];
let currentPosition = null;
let animationFrame = null;
let firstPosition = true;

function animateMarker(from, to, duration = 4500) {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }

    const startTime = performance.now();

    let targetLongitude = to[1];
    const longitudeDifference = targetLongitude - from[1];

    if (longitudeDifference > 180) {
        targetLongitude -= 360;
    } else if (longitudeDifference < -180) {
        targetLongitude += 360;
    }

    function animate(time) {
        const progress = Math.min((time - startTime) / duration, 1);
        const smoothProgress = progress * progress * (3 - 2 * progress);

        const latitude =
            from[0] + (to[0] - from[0]) * smoothProgress;

        let longitude =
            from[1] + (targetLongitude - from[1]) * smoothProgress;

        if (longitude > 180) {
            longitude -= 360;
        }

        if (longitude < -180) {
            longitude += 360;
        }

        issMarker.setLatLng([latitude, longitude]);

        if (progress < 1) {
            animationFrame = requestAnimationFrame(animate);
        }
    }

    animationFrame = requestAnimationFrame(animate);
}

function updateTrail(position) {
    const previousPosition =
        trailPositions.length > 0
            ? trailPositions[trailPositions.length - 1]
            : null;

    if (
        previousPosition &&
        Math.abs(position[1] - previousPosition[1]) > 180
    ) {
        trailSegments.push(currentTrail);

        trailPositions = [];

        currentTrail = L.polyline([], {
            weight: 2,
            opacity: 0.7,
            color: "#8ed4f3"
        }).addTo(map);
    }

    trailPositions.push(position);

    if (trailPositions.length > 120) {
        trailPositions.shift();
    }

    currentTrail.setLatLngs(trailPositions);
}

function updateIssMap(latitude, longitude) {
    const newPosition = [latitude, longitude];

    if (firstPosition) {
        currentPosition = newPosition;

        issMarker.setLatLng(newPosition);
        map.setView(newPosition, 3);

        updateTrail(newPosition);

        firstPosition = false;
        return;
    }

    animateMarker(currentPosition, newPosition);
    updateTrail(newPosition);

    currentPosition = newPosition;
}

window.updateIssMap = updateIssMap;
