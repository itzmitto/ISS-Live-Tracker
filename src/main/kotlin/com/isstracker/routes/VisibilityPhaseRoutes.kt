package com.isstracker.routes

import com.isstracker.services.IssService
import com.isstracker.services.VisibilityPhaseService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.visibilityPhaseRoutes(issService: IssService) {
    val service = VisibilityPhaseService()
    get("/api/iss/history/visibility-phases") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()?.coerceIn(1, 300) ?: 300
        call.respond(service.analyze(issService.getHistory(limit)))
    }
}
