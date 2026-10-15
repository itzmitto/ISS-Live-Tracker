package com.isstracker.services

import com.isstracker.models.IssPosition
import com.isstracker.models.OrbitalAnalytics
import kotlin.math.PI
import kotlin.math.acos
import kotlin.math.sqrt

class OrbitalAnalyticsService {
    companion object {
        const val EARTH_RADIUS_KM = 6371.0
        const val EARTH_GRAVITATIONAL_PARAMETER = 398600.4418
    }

    fun analyze(position: IssPosition): OrbitalAnalytics {
        require(position.altitude.isFinite() && position.altitude >= 0.0) {
            "Altitude must be a non-negative finite value."
        }

        val radius = EARTH_RADIUS_KM + position.altitude
        val circumference = 2.0 * PI * radius
        val circularVelocity = sqrt(
            EARTH_GRAVITATIONAL_PARAMETER / radius
        )

        val periodSeconds = 2.0 * PI * sqrt(
            radius * radius * radius /
                EARTH_GRAVITATIONAL_PARAMETER
        )

        val horizonAngle = acos(EARTH_RADIUS_KM / radius)

        return OrbitalAnalytics(
            timestamp = position.timestamp,
            altitudeKm = position.altitude,
            observedVelocityKmh = position.velocity,
            orbitalRadiusKm = radius,
            estimatedCircumferenceKm = circumference,
            estimatedCircularVelocityKmh = circularVelocity * 3600.0,
            estimatedPeriodMinutes = periodSeconds / 60.0,
            estimatedOrbitsPerDay = 86400.0 / periodSeconds,
            horizonAngleDegrees = Math.toDegrees(horizonAngle),
            horizonSurfaceRadiusKm = EARTH_RADIUS_KM * horizonAngle
        )
    }
}
