package com.isstracker.routes

import com.isstracker.services.IssService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.issStatisticsRoutes(issService: IssService) {
    get("/api/iss/stats") {
        call.respond(issService.getStatistics())
    }
}
