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
            project(it.azimuthDegrees, it.elevationDegrees)
        }
    }

    fun trackString(
        azimuths: List<Double>,
        elevations: List<Double>
    ): String {
        require(azimuths.size == elevations.size)

        return azimuths.indices.joinToString(" ") { index ->
            val point = project(
                azimuths[index],
                elevations[index]
            )

            "${point.x},${point.y}"
        }
    }

    fun chartCoordinates(
        elevations: List<Double>,
        width: Double = 600.0,
        height: Double = 190.0,
        padding: Double = 12.0
    ): List<RadarPoint> {
        require(width > padding * 2)
        require(height > padding * 2)
        require(elevations.all { it.isFinite() })

        if (elevations.isEmpty()) return emptyList()

        val drawableWidth = width - padding * 2
        val drawableHeight = height - padding * 2

        return elevations.mapIndexed { index, elevation ->
            val x = if (elevations.size == 1) {
                width / 2
            } else {
                padding + index.toDouble() /
                    (elevations.size - 1) * drawableWidth
            }

            val y = height - padding -
                elevation.coerceIn(0.0, 90.0) /
                90.0 * drawableHeight

            RadarPoint(x, y)
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
