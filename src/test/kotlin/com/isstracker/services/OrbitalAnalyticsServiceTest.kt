package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class OrbitalAnalyticsServiceTest {
    private val service = OrbitalAnalyticsService()

    private fun position(altitude: Double = 420.0) = IssPosition(
        name = "iss",
        id = 25544,
        latitude = 52.0,
        longitude = 5.0,
        altitude = altitude,
        velocity = 27600.0,
        visibility = "daylight",
        footprint = 4500.0,
        timestamp = 1000L,
        units = "kilometers"
    )

    @Test
    fun `typical ISS altitude produces realistic orbital period`() {
        val analytics = service.analyze(position())

        assertTrue(analytics.estimatedPeriodMinutes in 85.0..100.0)
    }

    @Test
    fun `circular orbital speed is within expected range`() {
        val analytics = service.analyze(position())

        assertTrue(
            analytics.estimatedCircularVelocityKmh in 26000.0..29000.0
        )
    }

    @Test
    fun `estimated daily orbits are within expected range`() {
        val analytics = service.analyze(position())

        assertTrue(analytics.estimatedOrbitsPerDay in 14.0..17.0)
    }

    @Test
    fun `orbital radius includes Earth radius`() {
        val analytics = service.analyze(position())

        assertEquals(6791.0, analytics.orbitalRadiusKm)
    }

    @Test
    fun `higher orbit produces longer orbital period`() {
        val low = service.analyze(position(400.0))
        val high = service.analyze(position(500.0))

        assertTrue(
            high.estimatedPeriodMinutes > low.estimatedPeriodMinutes
        )
    }

    @Test
    fun `horizon surface radius grows with altitude`() {
        val low = service.analyze(position(400.0))
        val high = service.analyze(position(500.0))

        assertTrue(
            high.horizonSurfaceRadiusKm > low.horizonSurfaceRadiusKm
        )
    }

    @Test
    fun `observed speed comes from live position`() {
        val analytics = service.analyze(position())

        assertEquals(27600.0, analytics.observedVelocityKmh)
        assertEquals(1000L, analytics.timestamp)
    }

    @Test
    fun `negative altitude is rejected`() {
        assertFailsWith<IllegalArgumentException> {
            service.analyze(position(-1.0))
        }
    }
}
