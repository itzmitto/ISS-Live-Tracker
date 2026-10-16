package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class RecordedPass(
    val startTimestamp: Long,
    val endTimestamp: Long,
    val peakTimestamp: Long,
    val maxElevationDegrees: Double,
    val sampleCount: Int,
    val durationSeconds: Long,
    val partialAtStart: Boolean,
    val partialAtEnd: Boolean,
    val points: List<GroundStationReading>
)

@Serializable
data class RecordedPassReport(
    val observerLatitude: Double,
    val observerLongitude: Double,
    val totalSamples: Int,
    val aboveHorizonSamples: Int,
    val passCount: Int,
    val lastTimestamp: Long?,
    val passes: List<RecordedPass>
)
