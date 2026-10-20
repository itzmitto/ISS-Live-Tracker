package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class HeadingServiceTest {
    private val service = HeadingService()

    private fun point(time: Long, lat: Double = 0.0, lon: Double = 0.0) =
        IssPosition(
            name = "iss", id = 25544, latitude = lat, longitude = lon,
            altitude = 420.0, velocity = 27600.0, visibility = "daylight",
            footprint = 4500.0, timestamp = time, units = "kilometers"
        )

    @Test fun `empty track has no heading`() {
        val result = service.analyze(emptyList())
        assertEquals(0, result.legCount)
        assertNull(result.circularMeanDegrees)
    }

    @Test fun `movement north produces north compass sector`() {
        val result = service.analyze(listOf(point(100), point(110, lat = 1.0)))
        assertEquals("N", result.legs.single().compassDirection)
    }

    @Test fun `east along equator is 90 degrees`() {
        val result = service.analyze(listOf(point(100), point(110, lon = 1.0)))
        assertEquals(90.0, result.legs.single().headingDegrees, 0.0001)
        assertEquals("E", result.legs.single().compassDirection)
    }

    @Test fun `eastward date line crossing remains east`() {
        val result = service.analyze(
            listOf(point(100, lon = 179.0), point(110, lon = -179.0))
        )
        assertEquals("E", result.legs.single().compassDirection)
    }

    @Test fun `stationary samples are not assigned arbitrary heading`() {
        val result = service.analyze(listOf(point(100), point(110)))
        assertEquals(1, result.stationaryIntervals)
        assertEquals(0, result.legCount)
        assertNull(result.circularMeanDegrees)
    }

    @Test fun `long recording gap does not imply known direction`() {
        val result = service.analyze(listOf(point(100), point(300, lon = 30.0)))
        assertEquals(1, result.skippedGaps)
        assertEquals(0, result.legCount)
    }

    @Test fun `duplicates are removed and mean agrees with compass`() {
        val result = service.analyze(
            listOf(point(110, lon = 1.0), point(100), point(100))
        )
        assertEquals(2, result.samples)
        assertEquals(1, result.legCount)
        assertTrue(result.circularMeanDegrees!! in 89.0..91.0)
        assertEquals(1, result.compassCounts.single { it.direction == "E" }.count)
    }
}
