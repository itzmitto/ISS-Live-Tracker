package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EquatorCrossingServiceTest {
    private val service = EquatorCrossingService()

    private fun point(time: Long, lat: Double, lon: Double = 0.0) =
        IssPosition(
            name = "iss", id = 25544, latitude = lat, longitude = lon,
            altitude = 420.0, velocity = 27600.0, visibility = "daylight",
            footprint = 4500.0, timestamp = time, units = "kilometers"
        )

    @Test fun `crossing from south to north is ascending`() {
        val report = service.analyze(
            listOf(point(1000, -10.0, 5.0), point(1060, 10.0, 7.0))
        )
        assertEquals(1, report.crossingCount)
        assertEquals("ASCENDING", report.crossings.single().direction)
        assertEquals(1030L, report.crossings.single().timestamp)
        assertEquals(6.0, report.crossings.single().longitude, 0.001)
    }

    @Test fun `crossing from north to south is descending`() {
        val report = service.analyze(
            listOf(point(1000, 10.0), point(1060, -10.0))
        )
        assertEquals(1, report.descendingCount)
        assertEquals(0, report.ascendingCount)
    }

    @Test fun `crossing longitude uses shortest dateline path`() {
        val report = service.analyze(
            listOf(point(1000, -10.0, 179.0), point(1060, 10.0, -179.0))
        )
        assertTrue(abs(report.crossings.single().longitude) in 179.9..180.0)
    }

    @Test fun `same hemisphere has no crossings`() {
        val report = service.analyze(
            listOf(point(1000, 5.0), point(1060, 10.0))
        )
        assertEquals(0, report.crossingCount)
    }

    @Test fun `observation gap prevents false interpolation`() {
        val report = service.analyze(
            listOf(point(1000, -10.0), point(1200, 10.0))
        )
        assertEquals(0, report.crossingCount)
    }

    @Test fun `sample exactly on equator does not duplicate crossing`() {
        val report = service.analyze(
            listOf(point(1000, -10.0), point(1030, 0.0), point(1060, 10.0))
        )
        assertEquals(1, report.crossingCount)
        assertEquals(1030L, report.crossings.single().timestamp)
    }
}
