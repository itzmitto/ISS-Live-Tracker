package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class EquatorCrossing(
    val timestamp: Long,
    val longitude: Double,
    val direction: String,
    val beforeTimestamp: Long,
    val afterTimestamp: Long
)

@Serializable
data class EquatorCrossingsReport(
    val samples: Int,
    val crossingCount: Int,
    val ascendingCount: Int,
    val descendingCount: Int,
    val crossings: List<EquatorCrossing>
)
