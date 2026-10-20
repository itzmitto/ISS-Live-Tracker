package com.isstracker.routes

import com.isstracker.services.IssService
import com.isstracker.services.TelemetryQualityService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.telemetryQualityRoutes(issService: IssService) {
    val analyzer = TelemetryQualityService()
    get("/api/iss/quality") {
        call.respond(analyzer.analyze(issService.getHistory(300)))
    }
}
