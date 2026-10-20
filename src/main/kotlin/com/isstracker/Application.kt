package com.isstracker
import com.isstracker.routes.visibilityPhaseRoutes
import com.isstracker.routes.headingRoutes
import com.isstracker.routes.latitudeBandRoutes
import com.isstracker.routes.equatorCrossingRoutes
import com.isstracker.routes.groundTrackRoutes
import com.isstracker.routes.telemetryQualityRoutes

import com.isstracker.routes.issRoutes
import com.isstracker.routes.passPredictionRoutes
import com.isstracker.routes.passAnalysisRoutes
import com.isstracker.routes.groundStationRoutes
import com.isstracker.routes.orbitalAnalyticsRoutes
import com.isstracker.routes.issHistoryRoutes
import com.isstracker.routes.issStatisticsRoutes
import com.isstracker.routes.missionRoutes
import com.isstracker.services.IssService
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.http.content.staticResources
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json

fun main() {
    embeddedServer(
        factory = Netty,
        port = 8080,
        host = "0.0.0.0"
    ) {
        install(ContentNegotiation) {
            json(
                Json {
                    prettyPrint = true
                    ignoreUnknownKeys = true
                }
            )
        }

        val issService = IssService()

        routing {
            issRoutes(issService)
            visibilityPhaseRoutes(issService)
            headingRoutes(issService)
            latitudeBandRoutes(issService)
            equatorCrossingRoutes(issService)
            groundTrackRoutes(issService)
            telemetryQualityRoutes(issService)
            passPredictionRoutes()
            passAnalysisRoutes(issService)
            groundStationRoutes(issService)
            orbitalAnalyticsRoutes(issService)
            issHistoryRoutes(issService)
            issStatisticsRoutes(issService)
            missionRoutes()
            staticResources("/", "static", index = "index.html")
        }
    }.start(wait = true)
}
