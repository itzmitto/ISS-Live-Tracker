package com.isstracker.services

import com.isstracker.models.IssPosition
import com.isstracker.models.IssStatistics
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

class IssStatisticsService {
    private val positions = ArrayDeque<IssPosition>()
    private val maxSamples = 300
    private val earthRadiusKm = 6371.0

    @Synchronized
    fun record(position: IssPosition) {
        val latest = positions.lastOrNull()

        if (latest != null && position.timestamp <= latest.timestamp) {
            return
        }

        positions.addLast(position)

        while (positions.size > maxSamples) {
            positions.removeFirst()
        }
    }

    @Synchronized
    fun snapshot(): IssStatistics {
        val samples = positions.toList()

        val groundDistance = samples
            .zipWithNext()
            .sumOf { (previous, current) ->
                distanceBetween(
                    previous.latitude,
                    previous.longitude,
                    current.latitude,
                    current.longitude
                )
            }

        return IssStatistics(
            samples = samples.size,
            trackedSeconds = if (samples.size > 1) {
                samples.last().timestamp - samples.first().timestamp
            } else {
                0L
            },
            minAltitudeKm = samples.minOfOrNull { it.altitude },
            maxAltitudeKm = samples.maxOfOrNull { it.altitude },
            averageAltitudeKm = if (samples.isEmpty()) {
                null
            } else {
                samples.map { it.altitude }.average()
            },
            minVelocityKmh = samples.minOfOrNull { it.velocity },
            maxVelocityKmh = samples.maxOfOrNull { it.velocity },
            averageVelocityKmh = if (samples.isEmpty()) {
                null
            } else {
                samples.map { it.velocity }.average()
            },
            groundDistanceKm = groundDistance,
            firstTimestamp = samples.firstOrNull()?.timestamp,
            lastTimestamp = samples.lastOrNull()?.timestamp
        )
    }

    private fun distanceBetween(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ): Double {
        val latitudeDifference = Math.toRadians(lat2 - lat1)
        val longitudeDifference = Math.toRadians(lon2 - lon1)

        val a = sin(latitudeDifference / 2).pow(2.0) +
            cos(Math.toRadians(lat1)) *
            cos(Math.toRadians(lat2)) *
            sin(longitudeDifference / 2).pow(2.0)

        return 2 * earthRadiusKm * asin(sqrt(min(1.0, a)))
    }
}
