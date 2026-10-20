package com.isstracker.routes

import com.isstracker.services.IssService
import com.isstracker.services.LatitudeBandService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.latitudeBandRoutes(issService: IssService) {
    val service = LatitudeBandService()
    get("/api/iss/history/latitude-bands") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()?.coerceIn(1, 300) ?: 300
        call.respond(service.analyze(issService.getHistory(limit)))
    }
}
