package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class IssStatistics(
    val samples: Int,
    val trackedSeconds: Long,
    val minAltitudeKm: Double?,
    val maxAltitudeKm: Double?,
    val averageAltitudeKm: Double?,
    val minVelocityKmh: Double?,
    val maxVelocityKmh: Double?,
    val averageVelocityKmh: Double?,
    val groundDistanceKm: Double,
    val firstTimestamp: Long?,
    val lastTimestamp: Long?
)
