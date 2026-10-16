package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class GroundStationServiceTest {
    private val service = GroundStationService()

    private fun position(
        latitude: Double,
        longitude: Double,
        altitude: Double = 420.0
    ) = IssPosition(
        name = "iss",
        id = 25544,
        latitude = latitude,
        longitude = longitude,
        altitude = altitude,
        velocity = 27600.0,
        visibility = "daylight",
        footprint = 4500.0,
        timestamp = 1000L,
        units = "kilometers"
    )

    @Test
    fun `ISS directly overhead has 90 degree elevation`() {
        val result = service.calculate(
            position(52.0, 5.0),
            52.0,
            5.0
        )

        assertTrue(result.aboveHorizon)
        assertEquals(90.0, result.elevationDegrees, 0.001)
        assertEquals(420.0, result.slantRangeKm, 0.001)
        assertEquals(0.0, result.groundDistanceKm, 0.001)
    }

    @Test
    fun `ISS on opposite side of Earth is below horizon`() {
        val result = service.calculate(
            position(0.0, 180.0),
            0.0,
            0.0
        )

        assertFalse(result.aboveHorizon)
        assertTrue(result.elevationDegrees < 0)
    }

    @Test
    fun `ISS east of observer has approximately eastern azimuth`() {
        val result = service.calculate(
            position(0.0, 1.0),
            0.0,
            0.0
        )

        assertEquals(90.0, result.azimuthDegrees, 0.1)
    }

    @Test
    fun `ISS north of observer has approximately northern azimuth`() {
        val result = service.calculate(
            position(1.0, 0.0),
            0.0,
            0.0
        )

        assertTrue(
            result.azimuthDegrees < 1.0 ||
            result.azimuthDegrees > 359.0
        )
    }

    @Test
    fun `horizon radius grows with altitude`() {
        val lower = service.calculate(
            position(0.0, 0.0, 400.0),
            0.0,
            0.0
        )

        val higher = service.calculate(
            position(0.0, 0.0, 500.0),
            0.0,
            0.0
        )

        assertTrue(higher.horizonDistanceKm > lower.horizonDistanceKm)
    }

    @Test
    fun `invalid observer latitude is rejected`() {
        assertFailsWith<IllegalArgumentException> {
            service.calculate(position(0.0, 0.0), 91.0, 0.0)
        }
    }

    @Test
    fun `invalid longitude is rejected`() {
        assertFailsWith<IllegalArgumentException> {
            service.calculate(position(0.0, 0.0), 0.0, 181.0)
        }
    }
}
