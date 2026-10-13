package com.isstracker.services

import com.isstracker.models.IssPosition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class IssHistoryExporterTest {
    private fun sample(
        timestamp: Long = 0L,
        visibility: String = "daylight"
    ) = IssPosition(
        name = "iss",
        id = 25544,
        latitude = 52.1,
        longitude = 5.1,
        altitude = 420.5,
        velocity = 27600.0,
        visibility = visibility,
        footprint = 4500.0,
        timestamp = timestamp,
        units = "kilometers"
    )

    @Test
    fun `empty history contains only CSV header`() {
        val csv = IssHistoryExporter.toCsv(emptyList())
        val lines = csv.trimEnd().lines()

        assertEquals(1, lines.size)
        assertTrue(lines[0].startsWith("timestamp_utc,"))
    }

    @Test
    fun `CSV contains correct telemetry values`() {
        val csv = IssHistoryExporter.toCsv(
            listOf(sample())
        )

        assertTrue(csv.contains("1970-01-01T00:00:00Z"))
        assertTrue(csv.contains("52.1,5.1,420.5,27600.0"))
        assertTrue(csv.contains("\"daylight\""))
        assertEquals(2, csv.trimEnd().lines().size)
    }

    @Test
    fun `CSV escapes quoted visibility`() {
        val csv = IssHistoryExporter.toCsv(
            listOf(sample(visibility = "test\"value"))
        )

        assertTrue(csv.contains("\"test\"\"value\""))
    }

    @Test
    fun `CSV protects against formula injection`() {
        val csv = IssHistoryExporter.toCsv(
            listOf(sample(visibility = "=SUM(1,2)"))
        )

        assertTrue(csv.contains("\"'=SUM(1,2)\""))
    }

    @Test
    fun `multiple positions retain chronological order`() {
        val csv = IssHistoryExporter.toCsv(
            listOf(
                sample(timestamp = 10L),
                sample(timestamp = 20L)
            )
        )

        val lines = csv.trimEnd().lines()

        assertEquals(3, lines.size)
        assertTrue(lines[1].startsWith("1970-01-01T00:00:10Z"))
        assertTrue(lines[2].startsWith("1970-01-01T00:00:20Z"))
    }
}
