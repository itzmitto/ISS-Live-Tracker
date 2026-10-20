package com.isstracker.services

import com.isstracker.models.GroundTrackLeg
import com.isstracker.models.GroundTrackReport
import com.isstracker.models.IssPosition
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

class GroundTrackService {
    companion object {
        const val EARTH_RADIUS_KM = 6371.0
    }

    fun analyze(
        observations: List<IssPosition>,
        maxGapSeconds: Long = 90
    ): GroundTrackReport {
        require(maxGapSeconds > 0)

        val positions = observations
            .filter { it.timestamp > 0 && it.latitude.isFinite() &&
                it.longitude.isFinite() && it.latitude in -90.0..90.0 &&
                it.longitude in -180.0..180.0 }
            .sortedBy { it.timestamp }
            .distinctBy { it.timestamp }

        var gaps = 0
        val legs = mutableListOf<GroundTrackLeg>()

        for (index in 1 until positions.size) {
            val a = positions[index - 1]
            val b = positions[index]
            val duration = b.timestamp - a.timestamp
            if (duration > maxGapSeconds) {
                gaps++
                continue
            }

            val distance = distanceKm(
                a.latitude, a.longitude, b.latitude, b.longitude
            )
            legs.add(
                GroundTrackLeg(
                    startTimestamp = a.timestamp,
                    endTimestamp = b.timestamp,
                    durationSeconds = duration,
                    distanceKm = distance,
                    averageGroundSpeedKmh = distance * 3600.0 / duration
                )
            )
        }

        return GroundTrackReport(
            samples = positions.size,
            legCount = legs.size,
            gapCount = gaps,
            recordedSeconds = legs.sumOf { it.durationSeconds },
            totalDistanceKm = legs.sumOf { it.distanceKm },
            longestLegKm = legs.maxOfOrNull { it.distanceKm } ?: 0.0,
            legs = legs
        )
    }

    private fun distanceKm(
        latitude1: Double,
        longitude1: Double,
        latitude2: Double,
        longitude2: Double
    ): Double {
        val dLat = Math.toRadians(latitude2 - latitude1)
        val dLon = Math.toRadians(longitude2 - longitude1)
        val a = sin(dLat / 2).pow(2) +
            cos(Math.toRadians(latitude1)) *
            cos(Math.toRadians(latitude2)) * sin(dLon / 2).pow(2)
        return 2 * EARTH_RADIUS_KM * asin(sqrt(min(1.0, a)))
    }
}
