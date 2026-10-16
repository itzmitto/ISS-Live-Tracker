package com.isstracker.routes

import com.isstracker.services.IssService
import com.isstracker.services.PassAnalysisService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.passAnalysisRoutes(issService: IssService) {
    val analyzer = PassAnalysisService()

    get("/api/iss/passes") {
        val latitude = call.request.queryParameters["lat"]
            ?.toDoubleOrNull()

        val longitude = call.request.queryParameters["lon"]
            ?.toDoubleOrNull()

        if (
            latitude == null ||
            longitude == null ||
            !latitude.isFinite() ||
            !longitude.isFinite() ||
            latitude !in -90.0..90.0 ||
            longitude !in -180.0..180.0
        ) {
            call.respond(
                HttpStatusCode.BadRequest,
                "Valid latitude and longitude are required."
            )
            return@get
        }

        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()
            ?.coerceIn(1, 300)
            ?: 300

        issService.getCurrentPosition()

        val positions = issService.getHistory(limit)

        call.respond(
            analyzer.analyze(
                positions,
                latitude,
                longitude
            )
        )
    }
}
