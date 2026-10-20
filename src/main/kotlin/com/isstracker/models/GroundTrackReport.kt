package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class GroundTrackLeg(
    val startTimestamp: Long,
    val endTimestamp: Long,
    val durationSeconds: Long,
    val distanceKm: Double,
    val averageGroundSpeedKmh: Double
)

@Serializable
data class GroundTrackReport(
    val samples: Int,
    val legCount: Int,
    val gapCount: Int,
    val recordedSeconds: Long,
    val totalDistanceKm: Double,
    val longestLegKm: Double,
    val legs: List<GroundTrackLeg>
)
