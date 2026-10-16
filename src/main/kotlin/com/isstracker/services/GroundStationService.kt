package com.isstracker.services

import com.isstracker.models.GroundStationReading
import com.isstracker.models.IssPosition
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class GroundStationService {
    companion object {
        const val EARTH_RADIUS_KM = 6371.0
    }

    fun calculate(
        position: IssPosition,
        observerLatitude: Double,
        observerLongitude: Double
    ): GroundStationReading {
        require(observerLatitude.isFinite() && observerLatitude in -90.0..90.0)
        require(observerLongitude.isFinite() && observerLongitude in -180.0..180.0)
        require(position.latitude.isFinite() && position.latitude in -90.0..90.0)
        require(position.longitude.isFinite() && position.longitude in -180.0..180.0)
        require(position.altitude.isFinite() && position.altitude >= 0.0)

        val lat = Math.toRadians(observerLatitude)
        val lon = Math.toRadians(observerLongitude)
        val issLat = Math.toRadians(position.latitude)
        val issLon = Math.toRadians(position.longitude)

        val observerX = EARTH_RADIUS_KM * cos(lat) * cos(lon)
        val observerY = EARTH_RADIUS_KM * cos(lat) * sin(lon)
        val observerZ = EARTH_RADIUS_KM * sin(lat)

        val orbitalRadius = EARTH_RADIUS_KM + position.altitude

        val issX = orbitalRadius * cos(issLat) * cos(issLon)
        val issY = orbitalRadius * cos(issLat) * sin(issLon)
        val issZ = orbitalRadius * sin(issLat)

        val dx = issX - observerX
        val dy = issY - observerY
        val dz = issZ - observerZ

        val east = -sin(lon) * dx + cos(lon) * dy

        val north =
            -sin(lat) * cos(lon) * dx -
            sin(lat) * sin(lon) * dy +
            cos(lat) * dz

        val up =
            cos(lat) * cos(lon) * dx +
            cos(lat) * sin(lon) * dy +
            sin(lat) * dz

        val range = sqrt(east * east + north * north + up * up)

        val azimuth = if (range > 0.0) {
            (Math.toDegrees(atan2(east, north)) + 360.0) % 360.0
        } else {
            0.0
        }

        val elevation = if (range > 0.0) {
            Math.toDegrees(asin((up / range).coerceIn(-1.0, 1.0)))
        } else {
            90.0
        }

        val centralAngle = acos(
            (
                sin(lat) * sin(issLat) +
                cos(lat) * cos(issLat) * cos(issLon - lon)
            ).coerceIn(-1.0, 1.0)
        )

        val horizonAngle = acos(
            EARTH_RADIUS_KM / orbitalRadius
        )

        return GroundStationReading(
            timestamp = position.timestamp,
            observerLatitude = observerLatitude,
            observerLongitude = observerLongitude,
            issLatitude = position.latitude,
            issLongitude = position.longitude,
            altitudeKm = position.altitude,
            azimuthDegrees = azimuth,
            elevationDegrees = elevation,
            slantRangeKm = range,
            groundDistanceKm = EARTH_RADIUS_KM * centralAngle,
            horizonDistanceKm = EARTH_RADIUS_KM * horizonAngle,
            aboveHorizon = elevation > 0.0
        )
    }
}
