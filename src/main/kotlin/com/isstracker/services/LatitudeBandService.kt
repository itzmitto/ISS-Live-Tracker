package com.isstracker.services

import com.isstracker.models.IssPosition
import com.isstracker.models.LatitudeBandReport
import com.isstracker.models.LatitudeBandSummary

class LatitudeBandService {
    private val bandOrder = listOf(
        "NORTH_HIGH", "NORTH_MID", "EQUATORIAL", "SOUTH_MID", "SOUTH_HIGH"
    )

    fun analyze(
        positions: List<IssPosition>,
        maxGapSeconds: Long = 90
    ): LatitudeBandReport {
        require(maxGapSeconds > 0)
        val valid = positions.asSequence()
            .filter {
                it.timestamp > 0 && it.latitude.isFinite() &&
                    it.latitude in -90.0..90.0
            }
            .sortedBy { it.timestamp }
            .distinctBy { it.timestamp }
            .toList()

        val durations = bandOrder.associateWith { 0L }.toMutableMap()
        var intervals = 0
        var gaps = 0

        for ((before, after) in valid.zipWithNext()) {
            val seconds = after.timestamp - before.timestamp
            if (seconds > maxGapSeconds) {
                gaps++
                continue
            }
            if (seconds <= 0) continue

            val midpoint = (before.latitude + after.latitude) / 2.0
            val band = classify(midpoint)
            durations[band] = durations.getValue(band) + seconds
            intervals++
        }

        val observed = durations.values.sum()
        return LatitudeBandReport(
            samples = valid.size,
            intervalCount = intervals,
            gapCount = gaps,
            observedSeconds = observed,
            bands = bandOrder.map { band ->
                val seconds = durations.getValue(band)
                LatitudeBandSummary(
                    band = band,
                    observedSeconds = seconds,
                    percentage = if (observed > 0) {
                        seconds * 100.0 / observed
                    } else {
                        0.0
                    }
                )
            }
        )
    }

    fun classify(latitude: Double): String {
        require(latitude.isFinite() && latitude in -90.0..90.0)
        return when {
            latitude > 35.0 -> "NORTH_HIGH"
            latitude > 10.0 -> "NORTH_MID"
            latitude >= -10.0 -> "EQUATORIAL"
            latitude >= -35.0 -> "SOUTH_MID"
            else -> "SOUTH_HIGH"
        }
    }
}
