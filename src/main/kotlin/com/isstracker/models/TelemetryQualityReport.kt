package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class TelemetryQualityReport(
    val totalSamples: Int,
    val validSamples: Int,
    val invalidSamples: Int,
    val duplicateTimestamps: Int,
    val gapCount: Int,
    val longestGapSeconds: Long,
    val averageIntervalSeconds: Double?,
    val latestTimestamp: Long?,
    val ageSeconds: Long?,
    val status: String
)
