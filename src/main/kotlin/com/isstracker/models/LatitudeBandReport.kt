package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class LatitudeBandSummary(
    val band: String,
    val observedSeconds: Long,
    val percentage: Double
)

@Serializable
data class LatitudeBandReport(
    val samples: Int,
    val intervalCount: Int,
    val gapCount: Int,
    val observedSeconds: Long,
    val bands: List<LatitudeBandSummary>
)
