package com.isstracker.routes

import com.isstracker.services.IssHistoryExporter
import com.isstracker.services.IssService
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.response.header
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import java.time.LocalDate
import java.time.ZoneOffset

fun Route.issHistoryRoutes(issService: IssService) {
    get("/api/iss/history") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()
            ?.coerceIn(1, 300)
            ?: 120

        call.respond(issService.getHistory(limit))
    }

    get("/api/iss/history/export") {
        val limit = call.request.queryParameters["limit"]
            ?.toIntOrNull()
            ?.coerceIn(1, 300)
            ?: 300

        val format = call.request.queryParameters["format"]
            ?.lowercase()
            ?: "csv"

        if (format !in setOf("csv", "json")) {
            call.respondText(
                "Supported formats: csv, json",
                status = HttpStatusCode.BadRequest
            )
            return@get
        }

        val positions = issService.getHistory(limit)
        val extension = format
        val date = LocalDate.now(ZoneOffset.UTC)

        call.response.header(
            HttpHeaders.ContentDisposition,
            "attachment; filename=\"iss-history-$date.$extension\""
        )

        when (format) {
            "csv" -> {
                call.respondText(
                    IssHistoryExporter.toCsv(positions),
                    contentType = ContentType.parse(
                        "text/csv; charset=utf-8"
                    )
                )
            }

            "json" -> {
                call.respond(positions)
            }
        }
    }
}
