package com.isstracker.services

import com.isstracker.models.CompassCount
import com.isstracker.models.HeadingLeg
import com.isstracker.models.HeadingReport
import com.isstracker.models.IssPosition
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class HeadingService {
    private val directions = listOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")

    fun analyze(
        observations: List<IssPosition>,
        maxGapSeconds: Long = 90
    ): HeadingReport {
        require(maxGapSeconds > 0)
        val points = observations.asSequence()
            .filter {
                it.timestamp > 0 && it.latitude.isFinite() &&
                    it.longitude.isFinite() && it.latitude in -90.0..90.0 &&
                    it.longitude in -180.0..180.0
            }
            .sortedBy { it.timestamp }
            .distinctBy { it.timestamp }
            .toList()

        val legs = mutableListOf<HeadingLeg>()
        var gaps = 0
        var stationary = 0
        var sineSum = 0.0
        var cosineSum = 0.0

        for ((before, after) in points.zipWithNext()) {
            val seconds = after.timestamp - before.timestamp
            if (seconds > maxGapSeconds) {
                gaps++
                continue
            }
            if (seconds <= 0) continue

            val bearing = bearingDegrees(before, after)
            if (bearing == null) {
                stationary++
                continue
            }
            val sector = compass(bearing)
            legs.add(
                HeadingLeg(
                    startTimestamp = before.timestamp,
                    endTimestamp = after.timestamp,
                    headingDegrees = bearing,
                    compassDirection = sector
                )
            )
            val angle = Math.toRadians(bearing)
            sineSum += sin(angle)
            cosineSum += cos(angle)
        }

        val magnitude = sqrt(sineSum * sineSum + cosineSum * cosineSum)
        val mean = if (legs.isEmpty() || magnitude < 1e-9) null else
            (Math.toDegrees(atan2(sineSum, cosineSum)) + 360.0) % 360.0

        return HeadingReport(
            samples = points.size,
            legCount = legs.size,
            skippedGaps = gaps,
            stationaryIntervals = stationary,
            circularMeanDegrees = mean,
            compassCounts = directions.map { direction ->
                CompassCount(direction, legs.count { it.compassDirection == direction })
            },
            legs = legs
        )
    }

    private fun bearingDegrees(before: IssPosition, after: IssPosition): Double? {
        val lat1 = Math.toRadians(before.latitude)
        val lat2 = Math.toRadians(after.latitude)
        val deltaLon = Math.toRadians(after.longitude - before.longitude)
        val east = sin(deltaLon) * cos(lat2)
        val north = cos(lat1) * sin(lat2) -
            sin(lat1) * cos(lat2) * cos(deltaLon)
        if (abs(east) + abs(north) < 1e-12) return null
        return (Math.toDegrees(atan2(east, north)) + 360.0) % 360.0
    }

    private fun compass(bearing: Double): String =
        directions[((bearing + 22.5) / 45.0).toInt() % directions.size]
}
