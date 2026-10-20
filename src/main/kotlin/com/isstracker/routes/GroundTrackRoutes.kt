package com.isstracker.routes

import com.isstracker.services.GroundTrackService
import com.isstracker.services.IssService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.groundTrackRoutes(issService: IssService) {
    val analyzer = GroundTrackService()
    get("/api/iss/history/ground-track") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()?.coerceIn(1, 300) ?: 120
        call.respond(analyzer.analyze(issService.getHistory(limit)))
    }
}
