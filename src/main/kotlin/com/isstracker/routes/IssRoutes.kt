package com.isstracker.routes

import com.isstracker.services.IssService
import io.ktor.http.HttpStatusCode
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.issRoutes(issService: IssService) {
    get("/api/iss") {
        try {
            val position = issService.getCurrentPosition()
            call.respond(position)
        } catch (exception: Exception) {
            call.respond(
                HttpStatusCode.BadGateway,
                mapOf("error" to "Unable to retrieve ISS data")
            )
        }
    }
}
