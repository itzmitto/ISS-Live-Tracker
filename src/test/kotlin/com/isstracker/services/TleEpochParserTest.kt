package com.isstracker.services

import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class TleEpochParserTest {
    private fun line1(epoch: String): String {
        require(epoch.length == 14)

        return "1 25544U 98067A   $epoch  .00007779  00000+0  15107-3 0  9994"
    }

    @Test
    fun `parses start of 2026`() {
        val timestamp = TleEpochParser.parse(
            line1("26001.00000000")
        )

        assertEquals(
            Instant.parse("2026-01-01T00:00:00Z")
                .toEpochMilli(),
            timestamp
        )
    }

    @Test
    fun `parses fractional day`() {
        val timestamp = TleEpochParser.parse(
            line1("26001.50000000")
        )

        assertEquals(
            Instant.parse("2026-01-01T12:00:00Z")
                .toEpochMilli(),
            timestamp
        )
    }

    @Test
    fun `parses leap year day`() {
        val timestamp = TleEpochParser.parse(
            line1("24060.00000000")
        )

        assertEquals(
            Instant.parse("2024-02-29T00:00:00Z")
                .toEpochMilli(),
            timestamp
        )
    }

    @Test
    fun `rejects invalid day of year`() {
        assertFailsWith<Exception> {
            TleEpochParser.parse(
                line1("26367.00000000")
            )
        }
    }

    @Test
    fun `rejects short input`() {
        assertFailsWith<IllegalArgumentException> {
            TleEpochParser.parse("invalid")
        }
    }

    @Test
    fun `epoch progresses with fractional day`() {
        val morning = TleEpochParser.parse(
            line1("26010.25000000")
        )

        val evening = TleEpochParser.parse(
            line1("26010.75000000")
        )

        assertTrue(evening > morning)

        assertEquals(
            43_200_000L,
            evening - morning
        )
    }
}
