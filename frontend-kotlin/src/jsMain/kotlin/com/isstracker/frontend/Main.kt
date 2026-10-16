package com.isstracker.frontend

import kotlin.math.abs

fun main() {
    val north = PassRadar.project(0.0, 0.0)
    val east = PassRadar.project(90.0, 0.0)
    val zenith = PassRadar.project(180.0, 90.0)

    check(abs(north.x - 180.0) < 0.001)
    check(abs(north.y - 60.0) < 0.001)
    check(abs(east.x - 300.0) < 0.001)
    check(abs(east.y - 180.0) < 0.001)
    check(abs(zenith.x - 180.0) < 0.001)
    check(abs(zenith.y - 180.0) < 0.001)

    val bridge = js("({})")

    bridge.project = { azimuth: Double, elevation: Double ->
        val point = PassRadar.project(azimuth, elevation)
        val result = js("({})")

        result.x = point.x
        result.y = point.y
        result
    }

    bridge.trackString = {
        azimuths: Array<Double>,
        elevations: Array<Double> ->

        PassRadar.trackString(
            azimuths.toList(),
            elevations.toList()
        )
    }

    bridge.chartCoordinates = { elevations: Array<Double> ->
        val coordinates = PassRadar.chartCoordinates(
            elevations.toList()
        )

        val result = js("[]")

        for (point in coordinates) {
            val entry = js("({})")

            entry.x = point.x
            entry.y = point.y

            result.push(entry)
        }

        result
    }

    bridge.formatDuration = { seconds: Int ->
        PassRadar.formatDuration(seconds)
    }

    js("globalThis").issPassRadar = bridge

    console.log("Kotlin/JS Pass Analysis initialized.")
}
