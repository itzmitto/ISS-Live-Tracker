package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GroundTrackServiceTest {
    private val service = GroundTrackService()

    private fun point(time: Long, lat: Double = 0.0, lon: Double = 0.0) =
        IssPosition(
            name = "iss", id = 25544, latitude = lat, longitude = lon,
            altitude = 420.0, velocity = 27600.0, visibility = "daylight",
            footprint = 4500.0, timestamp = time, units = "kilometers"
        )

    @Test fun `empty observations have zero legs`() {
        val report = service.analyze(emptyList())
        assertEquals(0, report.legCount)
        assertEquals(0.0, report.totalDistanceKm)
    }

    @Test fun `stationary observer track has zero ground distance`() {
        val report = service.analyze(listOf(point(100), point(110)))
        assertEquals(1, report.legCount)
        assertEquals(0.0, report.totalDistanceKm)
        assertEquals(10L, report.recordedSeconds)
    }

    @Test fun `dateline crossing takes shortest great circle`() {
        val report = service.analyze(
            listOf(point(100, lon = 179.0), point(160, lon = -179.0))
        )
        assertTrue(report.totalDistanceKm in 220.0..225.0)
        assertEquals(1, report.legCount)
    }

    @Test fun `large recording gaps are not interpreted as continuous travel`() {
        val report = service.analyze(
            listOf(point(100), point(300, lon = 90.0))
        )
        assertEquals(1, report.gapCount)
        assertEquals(0, report.legCount)
        assertEquals(0.0, report.totalDistanceKm)
    }

    @Test fun `unsorted duplicates do not duplicate travel legs`() {
        val report = service.analyze(
            listOf(point(110, lon = 1.0), point(100), point(100))
        )
        assertEquals(2, report.samples)
        assertEquals(1, report.legCount)
        assertTrue(report.legs.single().averageGroundSpeedKmh > 0.0)
    }
}
