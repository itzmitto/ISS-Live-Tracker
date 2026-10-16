package com.isstracker.services

import com.isstracker.models.IssPosition
import com.isstracker.models.GroundStationReading
import com.isstracker.models.RecordedPass
import com.isstracker.models.RecordedPassReport

class PassAnalysisService {
    private val groundStation = GroundStationService()
    private val maxGapSeconds = 120L

    fun analyze(
        positions: List<IssPosition>,
        latitude: Double,
        longitude: Double
    ): RecordedPassReport {
        val readings = positions
            .filter {
                it.latitude.isFinite() &&
                it.longitude.isFinite() &&
                it.altitude.isFinite() &&
                it.latitude in -90.0..90.0 &&
                it.longitude in -180.0..180.0 &&
                it.altitude >= 0.0
            }
            .sortedBy { it.timestamp }
            .distinctBy { it.timestamp }
            .map {
                groundStation.calculate(it, latitude, longitude)
            }

        val passes = mutableListOf<RecordedPass>()
        val current = mutableListOf<GroundStationReading>()

        var partialStart = false

        fun finish(partialEnd: Boolean) {
            if (current.isEmpty()) return

            val first = current.first()
            val last = current.last()
            val peak = current.maxByOrNull {
                it.elevationDegrees
            } ?: first

            passes.add(
                RecordedPass(
                    startTimestamp = first.timestamp,
                    endTimestamp = last.timestamp,
                    peakTimestamp = peak.timestamp,
                    maxElevationDegrees = peak.elevationDegrees,
                    sampleCount = current.size,
                    durationSeconds = last.timestamp - first.timestamp,
                    partialAtStart = partialStart,
                    partialAtEnd = partialEnd,
                    points = current.toList()
                )
            )

            current.clear()
        }

        readings.forEachIndexed { index, reading ->
            val previous = readings.getOrNull(index - 1)

            val gap = previous != null &&
                reading.timestamp - previous.timestamp > maxGapSeconds

            if (gap) {
                finish(true)
            }

            if (!reading.aboveHorizon) {
                finish(false)
                return@forEachIndexed
            }

            if (current.isEmpty()) {
                partialStart = index == 0 || gap
            }

            current.add(reading)
        }

        finish(true)

        return RecordedPassReport(
            observerLatitude = latitude,
            observerLongitude = longitude,
            totalSamples = readings.size,
            aboveHorizonSamples = readings.count {
                it.aboveHorizon
            },
            passCount = passes.size,
            lastTimestamp = readings.lastOrNull()?.timestamp,
            passes = passes
        )
    }
}
