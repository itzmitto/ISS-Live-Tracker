package com.isstracker.frontend

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.roundToInt

object PredictionDashboard {
    private var passes: Array<dynamic> = emptyArray()
    private var selectedStart: Double? = null
    private var requestVersion = 0

    private fun element(id: String): dynamic {
        val document: dynamic = js("document")
        return document.getElementById(id)
    }

    private fun create(tag: String): dynamic {
        val document: dynamic = js("document")
        return document.createElement(tag)
    }

    private fun text(id: String, value: String) {
        element(id).textContent = value
    }

    private fun value(id: String): String {
        return element(id).value as String
    }

    private fun decimal(value: Double): String {
        return (value * 10.0).roundToInt()
            .div(10.0)
            .toString()
    }

    private fun utc(timestamp: Double): String {
        val date: dynamic = js("new Date()")
        date.setTime(timestamp * 1000.0)

        val options: dynamic = js(
            """({
                timeZone: "UTC",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            })"""
        )

        val formatted = date.toLocaleString(
            "en-GB",
            options
        ) as String

        return "$formatted UTC"
    }

    private fun duration(seconds: Double): String {
        val total = seconds.coerceAtLeast(0.0).toInt()
        val hours = total / 3600
        val minutes = total % 3600 / 60
        val remaining = total % 60

        return listOf(hours, minutes, remaining)
            .joinToString(":") {
                it.toString().padStart(2, '0')
            }
    }

    private fun polar(
        azimuth: Double,
        elevation: Double
    ): RadarPoint {
        val angle = azimuth * PI / 180.0
        val radius =
            (90.0 - elevation.coerceIn(0.0, 90.0)) /
            90.0 * 125.0

        return RadarPoint(
            x = 160.0 + sin(angle) * radius,
            y = 160.0 - cos(angle) * radius
        )
    }

    private fun setDot(
        id: String,
        observation: dynamic
    ) {
        val dot = element(id)

        if (observation == null) {
            dot.setAttribute("visibility", "hidden")
            return
        }

        val point = polar(
            observation.azimuthDegrees as Double,
            observation.elevationDegrees as Double
        )

        dot.setAttribute("cx", point.x.toString())
        dot.setAttribute("cy", point.y.toString())
        dot.setAttribute("visibility", "visible")
    }

    private fun currentPass(): dynamic {
        for (pass in passes) {
            val start = pass.startTimestamp as Double

            if (start == selectedStart) {
                return pass
            }
        }

        return null
    }

    private fun renderRadar() {
        val pass = currentPass()

        if (pass == null) {
            element("pp-track").setAttribute("points", "")
            setDot("pp-start-dot", null)
            setDot("pp-end-dot", null)

            text("pp-radar-message", "No pass selected.")
            text("pp-rise", "--")
            text("pp-set", "--")
            text("pp-max", "--")
            text("pp-duration", "--")
            return
        }

        val observations = pass.track as Array<dynamic>

        val coordinates = observations.joinToString(" ") {
            val point = polar(
                it.azimuthDegrees as Double,
                it.elevationDegrees as Double
            )

            "${point.x},${point.y}"
        }

        element("pp-track").setAttribute(
            "points",
            coordinates
        )

        setDot(
            "pp-start-dot",
            observations.firstOrNull()
        )

        setDot(
            "pp-end-dot",
            observations.lastOrNull()
        )

        text(
            "pp-rise",
            "${decimal(pass.riseAzimuthDegrees as Double)}°"
        )

        text(
            "pp-set",
            "${decimal(pass.setAzimuthDegrees as Double)}°"
        )

        text(
            "pp-max",
            "${decimal(pass.maxElevationDegrees as Double)}°"
        )

        text(
            "pp-duration",
            duration(pass.durationSeconds as Double)
        )

        text(
            "pp-radar-message",
            "PREDICTED PASS · ${utc(pass.startTimestamp as Double)}"
        )
    }

    private fun renderPasses() {
        val container = element("pp-list")
        container.replaceChildren()

        if (passes.isEmpty()) {
            val message = create("p")
            message.className = "pp-empty"
            message.textContent =
                "No passes meet these settings. Try a 48-hour forecast or lower the minimum elevation."

            container.appendChild(message)
            renderRadar()
            return
        }

        for ((index, pass) in passes.withIndex()) {
            val start = pass.startTimestamp as Double

            val button = create("button")
            button.type = "button"
            button.className = "pp-pass"

            button.setAttribute(
                "aria-pressed",
                (start == selectedStart).toString()
            )

            val main = create("div")
            main.className = "pp-pass-main"

            val title = create("strong")
            title.textContent =
                "Predicted Pass ${index + 1}"

            val time = create("small")
            time.textContent =
                "${utc(start)} — ${utc(pass.endTimestamp as Double)}"

            val peak = create("span")
            peak.className = "pp-pass-peak"
            peak.textContent =
                "${decimal(pass.maxElevationDegrees as Double)}° MAX"

            main.appendChild(title)
            main.appendChild(time)

            button.appendChild(main)
            button.appendChild(peak)

            button.addEventListener(
                "click",
                { _: dynamic ->
                    selectedStart = start
                    renderPasses()
                }
            )

            container.appendChild(button)
        }

        renderRadar()
    }

    private fun updateCountdown() {
        val now = (js("Date.now()") as Double) / 1000.0

        var next: dynamic = null

        for (pass in passes) {
            if ((pass.endTimestamp as Double) > now) {
                next = pass
                break
            }
        }

        if (next == null) {
            text("pp-countdown", "--:--:--")
            text("pp-next-peak", "--")
            return
        }

        text(
            "pp-next-peak",
            "${decimal(next.maxElevationDegrees as Double)}°"
        )

        val start = next.startTimestamp as Double

        if (now >= start) {
            text("pp-countdown", "IN PROGRESS")
        } else {
            text(
                "pp-countdown",
                duration(start - now)
            )
        }
    }

    private fun setStatus(
        message: String,
        status: String
    ) {
        val node = element("pp-status")
        node.textContent = message
        node.dataset.state = status
    }

    private fun finishRequest() {
        element("pp-calculate").disabled = false
    }

    private fun showFailure() {
        passes = emptyArray()
        selectedStart = null

        text("pp-count", "--")
        setStatus("PREDICTION ERROR", "error")

        val container = element("pp-list")
        container.replaceChildren()

        val message = create("p")
        message.className = "pp-empty"
        message.textContent =
            "Predictions are unavailable. Check the Kotlin server and orbital data connection."

        container.appendChild(message)

        renderRadar()
        updateCountdown()
        finishRequest()
    }

    private fun showReport(report: dynamic) {
        val arrays: dynamic = js("Array")

        passes = if (
            arrays.isArray(report.passes) as Boolean
        ) {
            report.passes as Array<dynamic>
        } else {
            emptyArray()
        }

        selectedStart = if (passes.isNotEmpty()) {
            passes[0].startTimestamp as Double
        } else {
            null
        }

        text("pp-count", passes.size.toString())
        text(
            "pp-model",
            report.predictionModel as String
        )
        text(
            "pp-source",
            report.tleSource as String
        )
        text(
            "pp-tle",
            utc(report.tleEpoch as Double)
        )
        text(
            "pp-generated",
            utc(report.generatedAt as Double)
        )

        setStatus("PREDICTIONS READY", "live")

        renderPasses()
        updateCountdown()
        finishRequest()
    }

    private fun calculate() {
        val latitude = value("pp-lat").trim()
            .toDoubleOrNull()

        val longitude = value("pp-lon").trim()
            .toDoubleOrNull()

        val hours = value("pp-hours").toIntOrNull()

        val minimumElevation = value("pp-elevation")
            .toDoubleOrNull()

        if (
            latitude == null ||
            longitude == null ||
            !latitude.isFinite() ||
            !longitude.isFinite() ||
            latitude !in -90.0..90.0 ||
            longitude !in -180.0..180.0 ||
            hours == null ||
            hours !in 1..48 ||
            minimumElevation == null ||
            !minimumElevation.isFinite() ||
            minimumElevation !in 0.0..90.0
        ) {
            setStatus("INVALID PARAMETERS", "error")
            return
        }

        requestVersion++
        val version = requestVersion

        element("pp-calculate").disabled = true
        setStatus("CALCULATING", "")

        val url =
            "/api/iss/predictions" +
            "?lat=$latitude" +
            "&lon=$longitude" +
            "&hours=$hours" +
            "&minElevation=$minimumElevation"

        val fetchFunction: dynamic = js("fetch")
        val options: dynamic = js(
            """({ cache: "no-store" })"""
        )

        val request = fetchFunction(url, options)

        request.then(
            { response: dynamic ->
                if (response.ok as Boolean) {
                    response.json().then(
                        { report: dynamic ->
                            if (version == requestVersion) {
                                showReport(report)
                            }
                        },
                        { _: dynamic ->
                            if (version == requestVersion) {
                                showFailure()
                            }
                        }
                    )
                } else if (version == requestVersion) {
                    showFailure()
                }
            },
            { _: dynamic ->
                if (version == requestVersion) {
                    showFailure()
                }
            }
        )
    }

    fun verifyGeometry() {
        val north = polar(0.0, 0.0)
        val east = polar(90.0, 0.0)
        val zenith = polar(180.0, 90.0)

        check(kotlin.math.abs(north.x - 160.0) < 0.001)
        check(kotlin.math.abs(north.y - 35.0) < 0.001)
        check(kotlin.math.abs(east.x - 285.0) < 0.001)
        check(kotlin.math.abs(east.y - 160.0) < 0.001)
        check(kotlin.math.abs(zenith.x - 160.0) < 0.001)
        check(kotlin.math.abs(zenith.y - 160.0) < 0.001)
        check(duration(3661.0) == "01:01:01")
    }

    fun mount() {
        val noDocument =
            js("typeof document === 'undefined'") as Boolean

        if (noDocument) return
        if (element("pp-calculate") == null) return

        element("pp-location").addEventListener(
            "change",
            { _: dynamic ->
                val selected = value("pp-location")

                if (selected != "custom") {
                    val coordinates = selected.split(",")

                    if (coordinates.size == 2) {
                        element("pp-lat").value = coordinates[0]
                        element("pp-lon").value = coordinates[1]
                        calculate()
                    }
                }
            }
        )

        for (id in listOf("pp-lat", "pp-lon")) {
            element(id).addEventListener(
                "input",
                { _: dynamic ->
                    element("pp-location").value = "custom"
                }
            )
        }

        element("pp-calculate").addEventListener(
            "click",
            { _: dynamic -> calculate() }
        )

        val global: dynamic = js("globalThis")

        global.setInterval(
            { updateCountdown() },
            1000
        )

        calculate()
    }
}
