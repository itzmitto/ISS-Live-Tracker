package com.isstracker.services

import com.isstracker.models.IssPosition
import java.time.Instant

object IssHistoryExporter {
    private val header = listOf(
        "timestamp_utc",
        "timestamp_unix",
        "latitude_deg",
        "longitude_deg",
        "altitude_km",
        "velocity_kmh",
        "visibility",
        "footprint_km"
    ).joinToString(",")

    fun toCsv(positions: List<IssPosition>): String = buildString {
        appendLine(header)

        positions.forEach { position ->
            appendLine(
                listOf(
                    Instant.ofEpochSecond(position.timestamp).toString(),
                    position.timestamp.toString(),
                    position.latitude.toString(),
                    position.longitude.toString(),
                    position.altitude.toString(),
                    position.velocity.toString(),
                    csvText(position.visibility),
                    position.footprint.toString()
                ).joinToString(",")
            )
        }
    }

    private fun csvText(value: String): String {
        val dangerousPrefix = value.firstOrNull() in listOf(
            '=', '+', '-', '@', '\t', '\r'
        )

        val safeValue = if (dangerousPrefix) {
            "'$value"
        } else {
            value
        }

        return "\"" + safeValue.replace("\"", "\"\"") + "\""
    }
}
