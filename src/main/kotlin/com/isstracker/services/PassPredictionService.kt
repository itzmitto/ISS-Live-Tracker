package com.isstracker.services

import com.isstracker.models.PassPredictionReport
import com.isstracker.models.PredictedPass
import com.isstracker.models.PredictedSkyPoint
import java.util.Date
import kotlin.math.roundToLong
import uk.me.g4dpz.satellite.GroundStationPosition
import uk.me.g4dpz.satellite.PassPredictor
import uk.me.g4dpz.satellite.SatNotFoundException
import uk.me.g4dpz.satellite.SatelliteFactory
import uk.me.g4dpz.satellite.TLE

class PassPredictionService(
    private val tleSource: TleSourceService = TleSourceService()
) {
    suspend fun predict(
        latitude: Double,
        longitude: Double,
        hoursAhead: Int = 24,
        minimumElevation: Double = 10.0,
        nowMillis: Long = System.currentTimeMillis()
    ): PassPredictionReport {
        require(latitude.isFinite() && latitude in -90.0..90.0)
        require(longitude.isFinite() && longitude in -180.0..180.0)
        require(hoursAhead in 1..48)
        require(
            minimumElevation.isFinite() &&
            minimumElevation in 0.0..90.0
        )

        val snapshot = tleSource.getSnapshot()

        val observer = GroundStationPosition(
            latitude,
            longitude,
            0.0
        )

        val searchEndMillis =
            nowMillis + hoursAhead * 3_600_000L

        val passes = try {
            val predictor = PassPredictor(
                snapshot.tle,
                observer
            )

            predictor.getPasses(
                Date(nowMillis),
                hoursAhead,
                false
            )
                .asSequence()
                .filter {
                    it.startTime.time >= nowMillis &&
                    it.startTime.time < searchEndMillis
                }
                .filter {
                    it.maxEl >= minimumElevation
                }
                .map {
                    val start = it.startTime.time
                    val end = it.endTime.time

                    PredictedPass(
                        startTimestamp = start / 1000,
                        peakTimestamp = it.tca.time / 1000,
                        endTimestamp = end / 1000,
                        durationSeconds =
                            ((end - start) / 1000).coerceAtLeast(0),
                        maxElevationDegrees = it.maxEl,
                        riseAzimuthDegrees =
                            it.aosAzimuth.toDouble(),
                        setAzimuthDegrees =
                            it.losAzimuth.toDouble(),
                        track = sampleSkyTrack(
                            snapshot.tle,
                            observer,
                            start,
                            end
                        )
                    )
                }
                .toList()
        } catch (error: SatNotFoundException) {
            emptyList()
        }

        return PassPredictionReport(
            latitude = latitude,
            longitude = longitude,
            hoursAhead = hoursAhead,
            minimumElevation = minimumElevation,
            generatedAt = nowMillis / 1000,
            tleEpoch = snapshot.epochMillis / 1000,
            tleSource = "CelesTrak",
            predictionModel = "SGP4/SDP4",
            passes = passes
        )
    }

    private fun sampleSkyTrack(
        tle: TLE,
        observer: GroundStationPosition,
        startMillis: Long,
        endMillis: Long
    ): List<PredictedSkyPoint> {
        if (endMillis < startMillis) return emptyList()

        val satellite = SatelliteFactory.createSatellite(tle)
        val samples = mutableListOf<PredictedSkyPoint>()

        val timestamps = mutableListOf<Long>()
        var time = startMillis

        while (time < endMillis) {
            timestamps.add(time)
            time += 30_000L
        }

        timestamps.add(endMillis)

        for (timestamp in timestamps.distinct()) {
            val position = satellite.getPosition(
                observer,
                Date(timestamp)
            )

            val azimuth = Math.toDegrees(
                position.azimuth
            )

            val elevation = Math.toDegrees(
                position.elevation
            )

            if (
                !azimuth.isFinite() ||
                !elevation.isFinite()
            ) {
                continue
            }

            samples.add(
                PredictedSkyPoint(
                    timestamp = timestamp / 1000,
                    azimuthDegrees =
                        (azimuth + 360.0) % 360.0,
                    elevationDegrees = elevation
                )
            )
        }

        return samples
    }
}
