package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class HeadingLeg(
    val startTimestamp: Long,
    val endTimestamp: Long,
    val headingDegrees: Double,
    val compassDirection: String
)

@Serializable
data class CompassCount(
    val direction: String,
    val count: Int
)

@Serializable
data class HeadingReport(
    val samples: Int,
    val legCount: Int,
    val skippedGaps: Int,
    val stationaryIntervals: Int,
    val circularMeanDegrees: Double?,
    val compassCounts: List<CompassCount>,
    val legs: List<HeadingLeg>
)
