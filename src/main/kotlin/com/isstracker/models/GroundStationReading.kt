package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class GroundStationReading(
    val timestamp: Long,
    val observerLatitude: Double,
    val observerLongitude: Double,
    val issLatitude: Double,
    val issLongitude: Double,
    val altitudeKm: Double,
    val azimuthDegrees: Double,
    val elevationDegrees: Double,
    val slantRangeKm: Double,
    val groundDistanceKm: Double,
    val horizonDistanceKm: Double,
    val aboveHorizon: Boolean
)
