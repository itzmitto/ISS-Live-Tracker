package com.isstracker.routes

import com.isstracker.services.HeadingService
import com.isstracker.services.IssService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.headingRoutes(issService: IssService) {
    val service = HeadingService()
    get("/api/iss/history/headings") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()?.coerceIn(1, 300) ?: 300
        call.respond(service.analyze(issService.getHistory(limit)))
    }
}
