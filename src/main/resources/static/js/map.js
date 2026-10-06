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

const orbitPath = L.polyline([], {
    weight: 2,
    opacity: 0.7
}).addTo(map);

const trackedPositions = [];
let firstPosition = true;

function updateIssMap(latitude, longitude) {
    const position = [latitude, longitude];

    issMarker.setLatLng(position);

    trackedPositions.push(position);

    if (trackedPositions.length > 120) {
        trackedPositions.shift();
    }

    orbitPath.setLatLngs(trackedPositions);

    if (firstPosition) {
        map.setView(position, 3);
        firstPosition = false;
    }
}

window.updateIssMap = updateIssMap;
