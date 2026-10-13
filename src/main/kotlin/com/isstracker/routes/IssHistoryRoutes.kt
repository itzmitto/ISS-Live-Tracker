package com.isstracker.routes

import com.isstracker.services.IssService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.issHistoryRoutes(issService: IssService) {
    get("/api/iss/history") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()
            ?.coerceIn(1, 300)
            ?: 120

        call.respond(issService.getHistory(limit))
    }
}
