package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PassAnalysisServiceTest {
    private val service = PassAnalysisService()

    private fun position(
        timestamp: Long,
        latitude: Double,
        longitude: Double
    ) = IssPosition(
        name = "iss",
        id = 25544,
        latitude = latitude,
        longitude = longitude,
        altitude = 420.0,
        velocity = 27600.0,
        visibility = "daylight",
        footprint = 4500.0,
        timestamp = timestamp,
        units = "kilometers"
    )

    @Test
    fun `empty history produces no passes`() {
        val result = service.analyze(emptyList(), 0.0, 0.0)

        assertEquals(0, result.passCount)
        assertEquals(0, result.totalSamples)
    }

    @Test
    fun `below horizon samples produce no passes`() {
        val positions = listOf(
            position(100, 0.0, 180.0),
            position(110, 0.0, 170.0)
        )

        val result = service.analyze(positions, 0.0, 0.0)

        assertEquals(0, result.passCount)
        assertEquals(0, result.aboveHorizonSamples)
    }

    @Test
    fun `overhead samples form one recorded pass`() {
        val positions = listOf(
            position(100, 0.0, 0.0),
            position(110, 0.0, 1.0),
            position(120, 0.0, 2.0)
        )

        val result = service.analyze(positions, 0.0, 0.0)

        assertEquals(1, result.passCount)
        assertEquals(3, result.passes[0].sampleCount)
        assertEquals(20L, result.passes[0].durationSeconds)
        assertTrue(result.passes[0].maxElevationDegrees > 0)
        assertTrue(result.passes[0].partialAtStart)
        assertTrue(result.passes[0].partialAtEnd)
    }

    @Test
    fun `below horizon separates recorded passes`() {
        val positions = listOf(
            position(100, 0.0, 0.0),
            position(110, 0.0, 180.0),
            position(120, 0.0, 0.0)
        )

        val result = service.analyze(positions, 0.0, 0.0)

        assertEquals(2, result.passCount)
        assertFalse(result.passes[0].partialAtEnd)
        assertTrue(result.passes[1].partialAtEnd)
    }

    @Test
    fun `large time gap separates passes`() {
        val positions = listOf(
            position(100, 0.0, 0.0),
            position(500, 0.0, 0.0)
        )

        val result = service.analyze(positions, 0.0, 0.0)

        assertEquals(2, result.passCount)
        assertTrue(result.passes[0].partialAtEnd)
        assertTrue(result.passes[1].partialAtStart)
    }

    @Test
    fun `duplicate timestamps are excluded`() {
        val positions = listOf(
            position(100, 0.0, 0.0),
            position(100, 0.0, 0.0),
            position(110, 0.0, 0.0)
        )

        val result = service.analyze(positions, 0.0, 0.0)

        assertEquals(2, result.totalSamples)
        assertEquals(2, result.passes[0].sampleCount)
    }

    @Test
    fun `observations are sorted chronologically`() {
        val positions = listOf(
            position(130, 0.0, 0.0),
            position(100, 0.0, 0.0),
            position(120, 0.0, 0.0)
        )

        val result = service.analyze(positions, 0.0, 0.0)

        assertEquals(100L, result.passes[0].startTimestamp)
        assertEquals(130L, result.passes[0].endTimestamp)
    }
}
