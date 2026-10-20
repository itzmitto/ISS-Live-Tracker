package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TelemetryQualityServiceTest {
    private val service = TelemetryQualityService()

    private fun point(time: Long, lat: Double = 0.0) = IssPosition(
        name = "iss", id = 25544, latitude = lat, longitude = 0.0,
        altitude = 420.0, velocity = 27600.0, visibility = "daylight",
        footprint = 4500.0, timestamp = time, units = "kilometers"
    )

    @Test fun `empty history reports no data`() {
        val result = service.analyze(emptyList(), nowSeconds = 1000)
        assertEquals("NO_DATA", result.status)
        assertEquals(0, result.totalSamples)
        assertNull(result.averageIntervalSeconds)
    }

    @Test fun `regular samples are healthy`() {
        val result = service.analyze(
            listOf(point(990), point(995), point(1000)), nowSeconds = 1000
        )
        assertEquals("HEALTHY", result.status)
        assertEquals(5.0, result.averageIntervalSeconds)
        assertEquals(0, result.gapCount)
    }

    @Test fun `duplicate timestamps are reported`() {
        val result = service.analyze(
            listOf(point(995), point(995)), nowSeconds = 1000
        )
        assertEquals(1, result.duplicateTimestamps)
        assertEquals("DUPLICATES", result.status)
    }

    @Test fun `long gaps are detected`() {
        val result = service.analyze(
            listOf(point(800), point(1000)), nowSeconds = 1000
        )
        assertEquals(1, result.gapCount)
        assertEquals(200L, result.longestGapSeconds)
        assertEquals("GAPS", result.status)
    }

    @Test fun `stale data is reported`() {
        val result = service.analyze(listOf(point(900)), nowSeconds = 1000)
        assertEquals("STALE", result.status)
        assertEquals(100L, result.ageSeconds)
    }

    @Test fun `invalid coordinates are excluded`() {
        val result = service.analyze(
            listOf(point(995, 100.0), point(1000)), nowSeconds = 1000
        )
        assertEquals(1, result.invalidSamples)
        assertEquals("INVALID", result.status)
    }
}
