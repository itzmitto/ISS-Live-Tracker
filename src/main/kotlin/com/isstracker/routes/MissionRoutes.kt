package com.isstracker.routes

import com.isstracker.models.MissionProfile
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.missionRoutes() {
    get("/api/mission") {
        call.respond(
            MissionProfile(
                name = "International Space Station",
                catalogId = 25544,
                inclination = 51.6,
                orbitalPeriodMinutes = 90,
                approximateAltitudeKm = 400,
                missionType = "Orbital Research Laboratory",
                status = "Operational",
                description = "International research laboratory in low Earth orbit."
            )
        )
    }
}
