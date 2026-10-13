# ISS Live Tracker

**Real-Time International Space Station Tracking & Orbital Telemetry**

A real-time International Space Station (ISS) tracking website built with **Kotlin, Ktor, Tailwind CSS, and JavaScript**.

The application retrieves live orbital data from a public API and visualizes the ISS position on an interactive world map. It provides latitude, longitude, altitude, velocity, visibility, ground footprint, and recent tracking history.

Designed as an aerospace-inspired monitoring dashboard with a focus on real-time data visualization, clean architecture, and responsive interfaces.

---

## Features

### Live ISS Tracking

- Real-time ISS geographic coordinates
- Automatic telemetry updates every 5 seconds
- Live latitude and longitude
- Orbital altitude in kilometers
- Orbital velocity in km/h
- ISS visibility status
- Ground footprint information
- UTC telemetry timestamps
- API connection status and request latency

### Interactive World Map

- Interactive map powered by Leaflet
- OpenStreetMap geographical tiles
- Live ISS position marker
- Smooth marker movement between updates
- Ground-track visualization
- International Date Line handling
- Map zoom and navigation

### Orbit History

- Recent ISS position history
- UTC timestamps for recorded positions
- Latitude and longitude tracking
- Historical altitude and velocity readings
- Tracking point counter
- Latest 30 recorded positions per browser session

### Mission Control Interface

- Aerospace-inspired dashboard
- Dedicated orbital telemetry panels
- Live system status indicators
- Detailed spacecraft information
- Responsive layout foundations
- Light mission-control styling

---

## Technology Stack

| Technology            | Purpose                          |
| --------------------- | -------------------------------- |
| Kotlin                | Backend application              |
| Ktor                  | HTTP server and REST API         |
| Gradle                | Kotlin project build system      |
| Java 21               | JVM runtime                      |
| Tailwind CSS 4        | Interface styling                |
| HTML5                 | Application structure            |
| JavaScript            | Client-side tracking and updates |
| Leaflet               | Interactive map visualization    |
| OpenStreetMap         | Map tiles and geographic data    |
| Kotlinx Serialization | JSON serialization               |

---

## Project Structure

The project is organized into separate backend, frontend, and configuration files.

| File / Directory                                | Purpose                               |
| ----------------------------------------------- | ------------------------------------- |
| `build.gradle.kts`                              | Gradle dependencies and configuration |
| `settings.gradle.kts`                           | Project configuration                 |
| `src/main/kotlin/com/isstracker/Application.kt` | Ktor application entry point          |
| `models/IssPosition.kt`                         | ISS data model                        |
| `services/IssService.kt`                        | External ISS API communication        |
| `routes/IssRoutes.kt`                           | REST API routing                      |
| `src/main/resources/static/index.html`          | Main dashboard                        |
| `static/js/tracker.js`                          | Live telemetry updates                |
| `static/js/map.js`                              | Interactive map and ISS marker        |
| `static/js/history.js`                          | Position history management           |
| `static/css/styles.css`                         | Generated stylesheet                  |
| `src-tailwind/input.css`                        | Tailwind CSS source                   |
| `package.json`                                  | Frontend build dependencies           |
| `gradlew`                                       | Gradle wrapper for Linux/macOS        |

---

## Getting Started

### Requirements

Before running the project, install:

- Java Development Kit 21
- Node.js and npm
- Git

Gradle is managed through the included Gradle Wrapper.

### 1. Clone the Repository

`git clone https://github.com/itzmitto/ISS-Live-Tracker.git`

`cd ISS-Live-Tracker`

### 2. Install Frontend Dependencies

`npm install`

### 3. Build Tailwind CSS

`npx @tailwindcss/cli -i ./src-tailwind/input.css -o ./src/main/resources/static/css/styles.css`

### 4. Build the Kotlin Application

`./gradlew build`

### 5. Start the Application

`./gradlew run`

### 6. Open the Website

Open **http://127.0.0.1:8080** in your browser.

The local Ktor server runs on port `8080`.

---

## REST API

The Kotlin backend retrieves ISS coordinates from the Where The ISS At API.

**External endpoint:**

`https://api.wheretheiss.at/v1/satellites/25544`

**Local application endpoint:**

`GET /api/iss`

The endpoint returns JSON data containing:

| Field        | Description                             |
| ------------ | --------------------------------------- |
| `name`       | Satellite name                          |
| `id`         | Satellite catalog identifier            |
| `latitude`   | Geographic latitude                     |
| `longitude`  | Geographic longitude                    |
| `altitude`   | Altitude in kilometers                  |
| `velocity`   | Velocity in kilometers per hour         |
| `visibility` | Daylight or eclipsed visibility status  |
| `footprint`  | Ground footprint diameter in kilometers |
| `timestamp`  | Unix timestamp                          |
| `units`      | Measurement units                       |

Satellite catalog identifier: **25544 — International Space Station**.

The frontend automatically requests updated data from the Kotlin backend every five seconds.

---

## Architecture

The application uses a Kotlin backend with a browser-based frontend.

**Data flow:**

1. The browser requests `/api/iss`.
2. Ktor handles the HTTP request.
3. `IssService.kt` communicates with the external ISS API.
4. The API response is deserialized into the Kotlin data model.
5. Ktor returns JSON to the frontend.
6. JavaScript updates the telemetry dashboard.
7. Leaflet updates the ISS position on the world map.
8. The current position is added to the session history.

The application uses HTTP polling rather than a WebSocket connection.

---

## Development Workflow

Development follows a feature-branch and pull-request workflow.

Each major feature or improvement is developed in a separate Git branch, tested, reviewed, and merged into `main`.

Example branch names:

- `feature/iss-api`
- `feature/world-map`
- `feature/smooth-tracking`
- `feature/extended-telemetry`
- `feature/orbit-history`
- `feature/light-mission-theme`

This approach keeps changes isolated and improves project maintainability.

---

## Planned Improvements

- Interactive map controls
- Automatic ISS follow mode
- Fullscreen map
- Altitude and velocity charts
- Additional orbital analytics
- Persistent tracking history
- Improved error recovery
- Additional automated tests
- Mobile interface improvements
- Performance optimization and server-side API caching

---

## Data Sources and Attribution

ISS telemetry is retrieved using the public [Where The ISS At API](https://wheretheiss.at/).

Geographical map tiles are provided by [OpenStreetMap](https://www.openstreetmap.org/) and displayed using [Leaflet](https://leafletjs.com/).

Use of external services is subject to their respective terms, attribution requirements, and rate limits.

This is an independent educational and portfolio project. It is not affiliated with, endorsed by, or operated by NASA or any official space agency.

---

## Repository

**GitHub:** [itzmitto/ISS-Live-Tracker](https://github.com/itzmitto/ISS-Live-Tracker)

**Maintained by:** [@itzmitto](https://github.com/itzmitto)

Built with Kotlin, Ktor, Tailwind CSS, and live orbital telemetry.
