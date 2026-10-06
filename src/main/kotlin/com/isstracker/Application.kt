package com.isstracker

import io.ktor.server.engine.embeddedServer
import io.ktor.server.http.content.staticResources
import io.ktor.server.netty.Netty
import io.ktor.server.routing.routing

fun main() {
    embeddedServer(
        factory = Netty,
        port = 8080,
        host = "0.0.0.0"
    ) {
        routing {
            staticResources("/", "static", index = "index.html")
        }
    }.start(wait = true)
}
