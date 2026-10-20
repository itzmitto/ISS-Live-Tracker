package com.isstracker.services

import com.isstracker.models.IssPosition
import com.isstracker.models.TelemetryQualityReport

class TelemetryQualityService {
    fun analyze(
        observations: List<IssPosition>,
        nowSeconds: Long = System.currentTimeMillis() / 1000,
        maxGapSeconds: Long = 90,
        staleAfterSeconds: Long = 30
    ): TelemetryQualityReport {
        require(maxGapSeconds > 0 && staleAfterSeconds > 0)

        val valid = observations.filter(::isValid).sortedBy { it.timestamp }
        val unique = valid.distinctBy { it.timestamp }
        val intervals = unique.zipWithNext { a, b -> b.timestamp - a.timestamp }
        val gaps = intervals.count { it > maxGapSeconds }
        val age = unique.lastOrNull()?.let {
            (nowSeconds - it.timestamp).coerceAtLeast(0)
        }
        val duplicates = valid.size - unique.size
        val status = when {
            unique.isEmpty() && observations.isEmpty() -> "NO_DATA"
            valid.size != observations.size -> "INVALID"
            unique.isEmpty() -> "INVALID"
            age != null && age > staleAfterSeconds -> "STALE"
            gaps > 0 -> "GAPS"
            duplicates > 0 -> "DUPLICATES"
            else -> "HEALTHY"
        }

        return TelemetryQualityReport(
            totalSamples = observations.size,
            validSamples = valid.size,
            invalidSamples = observations.size - valid.size,
            duplicateTimestamps = duplicates,
            gapCount = gaps,
            longestGapSeconds = intervals.maxOrNull() ?: 0,
            averageIntervalSeconds = intervals.takeIf { it.isNotEmpty() }
                ?.map { it.toDouble() }?.average(),
            latestTimestamp = unique.lastOrNull()?.timestamp,
            ageSeconds = age,
            status = status
        )
    }

    private fun isValid(position: IssPosition): Boolean =
        position.id == 25544 &&
        position.timestamp > 0 &&
        position.latitude.isFinite() && position.latitude in -90.0..90.0 &&
        position.longitude.isFinite() && position.longitude in -180.0..180.0 &&
        position.altitude.isFinite() && position.altitude >= 0 &&
        position.velocity.isFinite() && position.velocity >= 0
}
