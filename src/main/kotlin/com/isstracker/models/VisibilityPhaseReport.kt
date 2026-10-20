package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class VisibilityPhase(
    val state: String,
    val startTimestamp: Long,
    val endTimestamp: Long,
    val sampleCount: Int,
    val recordedSeconds: Long
)

@Serializable
data class VisibilityPhaseDuration(
    val state: String,
    val recordedSeconds: Long,
    val percentage: Double
)

@Serializable
data class VisibilityPhaseReport(
    val samples: Int,
    val phaseCount: Int,
    val transitionCount: Int,
    val skippedGaps: Int,
    val totalRecordedSeconds: Long,
    val durationByState: List<VisibilityPhaseDuration>,
    val phases: List<VisibilityPhase>
)
