package com.isstracker.routes

import com.isstracker.services.EquatorCrossingService
import com.isstracker.services.IssService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.equatorCrossingRoutes(issService: IssService) {
    val analyzer = EquatorCrossingService()
    get("/api/iss/history/equator-crossings") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()?.coerceIn(1, 300) ?: 300
        call.respond(analyzer.analyze(issService.getHistory(limit)))
    }
}
