package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class MissionProfile(
    val name: String,
    val catalogId: Int,
    val inclination: Double,
    val orbitalPeriodMinutes: Int,
    val approximateAltitudeKm: Int,
    val missionType: String,
    val status: String,
    val description: String
)
