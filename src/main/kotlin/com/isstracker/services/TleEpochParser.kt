package com.isstracker.services

import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.math.roundToLong

object TleEpochParser {
    fun parse(line1: String): Long {
        require(line1.length >= 32) {
            "TLE line is too short."
        }

        require(line1.startsWith("1 ")) {
            "Expected TLE line one."
        }

        val shortYear = line1.substring(18, 20).toInt()
        val year = if (shortYear >= 57) {
            1900 + shortYear
        } else {
            2000 + shortYear
        }

        val dayWithFraction = line1
            .substring(20, 32)
            .trim()
            .toDouble()

        require(dayWithFraction.isFinite())

        val day = dayWithFraction.toInt()
        val fraction = dayWithFraction - day

        val midnight = LocalDate
            .ofYearDay(year, day)
            .atStartOfDay()
            .toInstant(ZoneOffset.UTC)
            .toEpochMilli()

        return midnight + (fraction * 86_400_000.0).roundToLong()
    }
}
