package com.isstracker.frontend

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

data class RadarPoint(
    val x: Double,
    val y: Double
)

data class SkyObservation(
    val timestamp: Double,
    val azimuthDegrees: Double,
    val elevationDegrees: Double
)

object PassRadar {
    private const val CENTER_X = 180.0
    private const val CENTER_Y = 180.0
    private const val RADIUS = 120.0

    fun project(
        azimuthDegrees: Double,
        elevationDegrees: Double
    ): RadarPoint {
        require(azimuthDegrees.isFinite())
        require(elevationDegrees.isFinite())

        val elevation = elevationDegrees.coerceIn(0.0, 90.0)
        val angle = azimuthDegrees * PI / 180.0
        val distance = (90.0 - elevation) / 90.0 * RADIUS

        return RadarPoint(
            x = CENTER_X + sin(angle) * distance,
            y = CENTER_Y - cos(angle) * distance
        )
    }

    fun projectTrack(
        observations: List<SkyObservation>
    ): List<RadarPoint> {
        return observations.map {
            project(
                azimuthDegrees = it.azimuthDegrees,
                elevationDegrees = it.elevationDegrees
            )
        }
    }

    fun formatDuration(seconds: Int): String {
        val value = seconds.coerceAtLeast(0)

        val hours = value / 3600
        val minutes = value % 3600 / 60
        val remaining = value % 60

        return listOf(hours, minutes, remaining)
            .joinToString(":") {
                it.toString().padStart(2, '0')
            }
    }

    fun findPeak(
        observations: List<SkyObservation>
    ): SkyObservation? {
        return observations.maxByOrNull {
            it.elevationDegrees
        }
    }

    fun calculateDuration(
        observations: List<SkyObservation>
    ): Int {
        if (observations.size < 2) return 0

        val start = observations.minOf { it.timestamp }
        val end = observations.maxOf { it.timestamp }

        return (end - start).coerceAtLeast(0.0).toInt()
    }
}
