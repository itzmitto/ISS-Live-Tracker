package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LatitudeBandServiceTest {
    private val service = LatitudeBandService()

    private fun point(time: Long, lat: Double) = IssPosition(
        name = "iss", id = 25544, latitude = lat, longitude = 5.0,
        altitude = 420.0, velocity = 27600.0, visibility = "daylight",
        footprint = 4500.0, timestamp = time, units = "kilometers"
    )

    private fun secondsFor(report: com.isstracker.models.LatitudeBandReport, band: String) =
        report.bands.single { it.band == band }.observedSeconds

    @Test fun `empty observations contain five zero bands`() {
        val result = service.analyze(emptyList())
        assertEquals(5, result.bands.size)
        assertEquals(0L, result.observedSeconds)
        assertTrue(result.bands.all { it.percentage == 0.0 })
    }

    @Test fun `equatorial sample interval has correct duration`() {
        val result = service.analyze(listOf(point(100, 0.0), point(120, 4.0)))
        assertEquals(20L, secondsFor(result, "EQUATORIAL"))
        assertEquals(100.0, result.bands.single { it.band == "EQUATORIAL" }.percentage)
    }

    @Test fun `latitude classes cover north and south`() {
        assertEquals("NORTH_HIGH", service.classify(50.0))
        assertEquals("NORTH_MID", service.classify(20.0))
        assertEquals("SOUTH_MID", service.classify(-20.0))
        assertEquals("SOUTH_HIGH", service.classify(-50.0))
    }

    @Test fun `boundary latitudes are deterministic`() {
        assertEquals("EQUATORIAL", service.classify(10.0))
        assertEquals("EQUATORIAL", service.classify(-10.0))
        assertEquals("SOUTH_MID", service.classify(-35.0))
        assertEquals("NORTH_MID", service.classify(35.0))
    }

    @Test fun `long gaps do not contribute observation time`() {
        val result = service.analyze(listOf(point(100, 0.0), point(300, 0.0)))
        assertEquals(1, result.gapCount)
        assertEquals(0, result.intervalCount)
        assertEquals(0L, result.observedSeconds)
    }

    @Test fun `out of order duplicates count once`() {
        val result = service.analyze(
            listOf(point(110, 0.0), point(100, 0.0), point(100, 0.0))
        )
        assertEquals(2, result.samples)
        assertEquals(10L, result.observedSeconds)
    }

    @Test fun `time weighted fractions total one hundred percent`() {
        val result = service.analyze(
            listOf(point(100, 0.0), point(110, 0.0), point(130, 40.0))
        )
        assertEquals(30L, result.observedSeconds)
        assertEquals(10L, secondsFor(result, "EQUATORIAL"))
        assertEquals(20L, secondsFor(result, "NORTH_MID"))
        assertEquals(100.0, result.bands.sumOf { it.percentage }, 0.00001)
    }
}
