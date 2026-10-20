package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals

class VisibilityPhaseServiceTest {
    private val service = VisibilityPhaseService()

    private fun point(time: Long, visibility: String) = IssPosition(
        name = "iss", id = 25544, latitude = 0.0, longitude = 0.0,
        altitude = 420.0, velocity = 27600.0, visibility = visibility,
        footprint = 4500.0, timestamp = time, units = "kilometers"
    )

    @Test fun `empty history has no phases`() {
        val result = service.analyze(emptyList())
        assertEquals(0, result.phaseCount)
        assertEquals(0, result.totalRecordedSeconds)
    }

    @Test fun `continuous daylight is one interval`() {
        val result = service.analyze(
            listOf(point(100, "daylight"), point(110, "daylight"))
        )
        assertEquals(1, result.phaseCount)
        assertEquals(10L, result.phases.single().recordedSeconds)
    }

    @Test fun `phase changes create distinct segments`() {
        val result = service.analyze(
            listOf(point(100, "daylight"), point(110, "eclipsed"))
        )
        assertEquals(2, result.phaseCount)
        assertEquals(1, result.transitionCount)
        assertEquals(0L, result.totalRecordedSeconds)
    }

    @Test fun `long gap does not count as a phase transition`() {
        val result = service.analyze(
            listOf(point(100, "daylight"), point(300, "eclipsed"))
        )
        assertEquals(1, result.skippedGaps)
        assertEquals(0, result.transitionCount)
        assertEquals(2, result.phaseCount)
    }

    @Test fun `provider state names are normalized`() {
        assertEquals("VISIBLE", service.normalize(" Visible "))
        assertEquals("ECLIPSED", service.normalize("eclipsed"))
    }

    @Test fun `unrecognized labels are classified unknown`() {
        assertEquals("UNKNOWN", service.normalize("mystery"))
        val result = service.analyze(listOf(point(100, "mystery")))
        assertEquals("UNKNOWN", result.phases.single().state)
    }

    @Test fun `out of order duplicate timestamps are ignored`() {
        val result = service.analyze(
            listOf(point(110, "daylight"), point(100, "daylight"), point(100, "daylight"))
        )
        assertEquals(2, result.samples)
        assertEquals(10L, result.totalRecordedSeconds)
    }

    @Test fun `recorded time distribution uses observed intervals`() {
        val result = service.analyze(
            listOf(
                point(100, "daylight"), point(110, "daylight"),
                point(120, "eclipsed"), point(150, "eclipsed")
            )
        )
        assertEquals(40L, result.totalRecordedSeconds)
        assertEquals(10L, result.durationByState.single { it.state == "DAYLIGHT" }.recordedSeconds)
        assertEquals(30L, result.durationByState.single { it.state == "ECLIPSED" }.recordedSeconds)
        assertEquals(100.0, result.durationByState.sumOf { it.percentage }, 0.0001)
    }
}
