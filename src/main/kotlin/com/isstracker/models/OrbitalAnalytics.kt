package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class OrbitalAnalytics(
    val timestamp: Long,
    val altitudeKm: Double,
    val observedVelocityKmh: Double,
    val orbitalRadiusKm: Double,
    val estimatedCircumferenceKm: Double,
    val estimatedCircularVelocityKmh: Double,
    val estimatedPeriodMinutes: Double,
    val estimatedOrbitsPerDay: Double,
    val horizonAngleDegrees: Double,
    val horizonSurfaceRadiusKm: Double,
    val model: String = "Approximate circular Earth orbit"
)
