package com.isstracker.models

import kotlinx.serialization.Serializable

@Serializable
data class PredictedSkyPoint(
    val timestamp: Long,
    val azimuthDegrees: Double,
    val elevationDegrees: Double
)

@Serializable
data class PredictedPass(
    val startTimestamp: Long,
    val peakTimestamp: Long,
    val endTimestamp: Long,
    val durationSeconds: Long,
    val maxElevationDegrees: Double,
    val riseAzimuthDegrees: Double,
    val setAzimuthDegrees: Double,
    val track: List<PredictedSkyPoint>
)

@Serializable
data class PassPredictionReport(
    val latitude: Double,
    val longitude: Double,
    val hoursAhead: Int,
    val minimumElevation: Double,
    val generatedAt: Long,
    val tleEpoch: Long,
    val tleSource: String,
    val predictionModel: String,
    val passes: List<PredictedPass>
)
