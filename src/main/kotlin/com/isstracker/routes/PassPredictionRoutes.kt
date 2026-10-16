package com.isstracker.routes

import com.isstracker.services.PassPredictionService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import kotlinx.coroutines.CancellationException

fun Route.passPredictionRoutes() {
    val service = PassPredictionService()

    get("/api/iss/predictions") {
        val latitude = call.request.queryParameters["lat"]
            ?.toDoubleOrNull()

        val longitude = call.request.queryParameters["lon"]
            ?.toDoubleOrNull()

        val hours = call.request.queryParameters["hours"]
            ?.toIntOrNull() ?: 24

        val minimumElevation =
            call.request.queryParameters["minElevation"]
                ?.toDoubleOrNull() ?: 10.0

        if (
            latitude == null ||
            longitude == null ||
            !latitude.isFinite() ||
            !longitude.isFinite() ||
            latitude !in -90.0..90.0 ||
            longitude !in -180.0..180.0 ||
            hours !in 1..48 ||
            !minimumElevation.isFinite() ||
            minimumElevation !in 0.0..90.0
        ) {
            call.respondText(
                "Invalid prediction parameters.",
                status = HttpStatusCode.BadRequest
            )
            return@get
        }

        try {
            call.respond(
                service.predict(
                    latitude = latitude,
                    longitude = longitude,
                    hoursAhead = hours,
                    minimumElevation = minimumElevation
                )
            )
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            System.err.println(
                "ISS prediction failed: ${error.message}"
            )

            call.respondText(
                "Predictions are temporarily unavailable. Check orbital data availability.",
                status = HttpStatusCode.ServiceUnavailable
            )
        }
    }
}
