package com.isstracker.services

import com.isstracker.models.IssPosition
import com.isstracker.models.IssStatistics
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json

class IssService {
    private val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
            })
        }
    }

    private val statistics = IssStatisticsService()
    private val requestMutex = Mutex()

    private var cachedPosition: IssPosition? = null
    private var cachedAt = 0L

    suspend fun getCurrentPosition(): IssPosition = requestMutex.withLock {
        val now = System.currentTimeMillis()
        val cached = cachedPosition

        if (cached != null && now - cachedAt < 4500L) {
            return@withLock cached
        }

        val position: IssPosition = client
            .get("https://api.wheretheiss.at/v1/satellites/25544")
            .body()

        cachedPosition = position
        cachedAt = System.currentTimeMillis()

        statistics.record(position)

        position
    }

    fun getStatistics(): IssStatistics {
        return statistics.snapshot()
    }
}
