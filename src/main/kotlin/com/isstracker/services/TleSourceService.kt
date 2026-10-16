package com.isstracker.services

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import uk.me.g4dpz.satellite.TLE

data class TleSnapshot(
    val tle: TLE,
    val epochMillis: Long,
    val retrievedAtMillis: Long
)

class TleSourceService {
    companion object {
        private const val ISS_TLE_URL =
            "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"

        private const val DOWNLOAD_INTERVAL_MS =
            2L * 60L * 60L * 1000L

        private const val MAX_EPOCH_AGE_MS =
            3L * 24L * 60L * 60L * 1000L
    }

    private val client = HttpClient(CIO) {
        expectSuccess = false
    }

    private val mutex = Mutex()

    private var cached: TleSnapshot? = null
    private var nextDownloadAt = 0L

    suspend fun getSnapshot(): TleSnapshot = mutex.withLock {
        val now = System.currentTimeMillis()

        if (now >= nextDownloadAt) {
            nextDownloadAt = now + DOWNLOAD_INTERVAL_MS

            try {
                val response = client.get(ISS_TLE_URL)

                check(response.status.isSuccess()) {
                    "CelesTrak returned HTTP ${response.status.value}"
                }

                val lines = response.bodyAsText()
                    .lineSequence()
                    .map { it.trimEnd() }
                    .filter { it.isNotBlank() }
                    .toList()

                val first = lines.indexOfFirst {
                    it.startsWith("1 25544")
                }

                check(first >= 0 && first + 1 < lines.size) {
                    "ISS orbital elements not found."
                }

                val line1 = lines[first]
                val line2 = lines[first + 1]

                check(line2.startsWith("2 25544")) {
                    "Invalid ISS second element line."
                }

                val tle = TLE(
                    arrayOf("ISS (ZARYA)", line1, line2)
                )

                cached = TleSnapshot(
                    tle = tle,
                    epochMillis = TleEpochParser.parse(line1),
                    retrievedAtMillis = now
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                System.err.println(
                    "CelesTrak data unavailable: ${error.message}"
                )
            }
        }

        val snapshot = cached
            ?: error("ISS orbital elements are unavailable.")

        check(
            now - snapshot.epochMillis <= MAX_EPOCH_AGE_MS &&
            snapshot.epochMillis - now <= DOWNLOAD_INTERVAL_MS
        ) {
            "ISS orbital elements are too old for reliable predictions."
        }

        snapshot
    }
}
