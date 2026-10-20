package com.isstracker.services

import com.isstracker.models.EquatorCrossing
import com.isstracker.models.EquatorCrossingsReport
import com.isstracker.models.IssPosition
import kotlin.math.roundToLong

class EquatorCrossingService {
    fun analyze(
        observations: List<IssPosition>,
        maxGapSeconds: Long = 90
    ): EquatorCrossingsReport {
        require(maxGapSeconds > 0)

        val positions = observations
            .filter { it.timestamp > 0 && it.latitude.isFinite() &&
                it.longitude.isFinite() && it.latitude in -90.0..90.0 &&
                it.longitude in -180.0..180.0 }
            .sortedBy { it.timestamp }
            .distinctBy { it.timestamp }

        val crossings = mutableListOf<EquatorCrossing>()
        var previousNonzero: IssPosition? = null

        for (current in positions) {
            if (current.latitude == 0.0) continue
            val previous = previousNonzero
            if (previous != null) {
                val deltaTime = current.timestamp - previous.timestamp
                val oppositeHemispheres =
                    (previous.latitude < 0 && current.latitude > 0) ||
                    (previous.latitude > 0 && current.latitude < 0)

                if (oppositeHemispheres && deltaTime <= maxGapSeconds) {
                    val fraction = -previous.latitude /
                        (current.latitude - previous.latitude)
                    val deltaLongitude =
                        ((current.longitude - previous.longitude + 540.0) % 360.0) - 180.0
                    val longitude =
                        ((previous.longitude + fraction * deltaLongitude + 540.0) % 360.0) - 180.0
                    val timestamp = previous.timestamp +
                        (fraction * deltaTime).roundToLong()

                    crossings.add(
                        EquatorCrossing(
                            timestamp = timestamp,
                            longitude = longitude,
                            direction = if (current.latitude > 0) {
                                "ASCENDING"
                            } else {
                                "DESCENDING"
                            },
                            beforeTimestamp = previous.timestamp,
                            afterTimestamp = current.timestamp
                        )
                    )
                }
            }
            previousNonzero = current
        }

        return EquatorCrossingsReport(
            samples = positions.size,
            crossingCount = crossings.size,
            ascendingCount = crossings.count { it.direction == "ASCENDING" },
            descendingCount = crossings.count { it.direction == "DESCENDING" },
            crossings = crossings
        )
    }
}
