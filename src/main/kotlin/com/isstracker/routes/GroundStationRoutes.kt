package com.isstracker.routes

import com.isstracker.services.GroundStationService
import com.isstracker.services.IssService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.groundStationRoutes(issService: IssService) {
    val service = GroundStationService()

    get("/api/iss/ground-station") {
        val lat = call.request.queryParameters["lat"]?.toDoubleOrNull()
        val lon = call.request.queryParameters["lon"]?.toDoubleOrNull()

        if (
            lat == null || !lat.isFinite() || lat !in -90.0..90.0 ||
            lon == null || !lon.isFinite() || lon !in -180.0..180.0
        ) {
            call.respond(HttpStatusCode.BadRequest, "Invalid observer coordinates.")
            return@get
        }

        val position = issService.getCurrentPosition()
        call.respond(service.calculate(position, lat, lon))
    }

    get("/api/iss/ground-station/history") {
        val lat = call.request.queryParameters["lat"]?.toDoubleOrNull()
        val lon = call.request.queryParameters["lon"]?.toDoubleOrNull()

        if (
            lat == null || !lat.isFinite() || lat !in -90.0..90.0 ||
            lon == null || !lon.isFinite() || lon !in -180.0..180.0
        ) {
            call.respond(HttpStatusCode.BadRequest, "Invalid observer coordinates.")
            return@get
        }

        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()
            ?.coerceIn(1, 300)
            ?: 120

        val readings = issService.getHistory(limit).map {
            service.calculate(it, lat, lon)
        }

        call.respond(readings)
    }
}
