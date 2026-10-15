package com.isstracker.routes

import com.isstracker.services.IssService
import com.isstracker.services.OrbitalAnalyticsService
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.orbitalAnalyticsRoutes(issService: IssService) {
    val analyticsService = OrbitalAnalyticsService()

    get("/api/iss/orbit") {
        val position = issService.getCurrentPosition()
        call.respond(analyticsService.analyze(position))
    }
}
