plugins {
    kotlin("multiplatform")
}

repositories {
    mavenCentral()
}

kotlin {
    js {
        browser {
            webpackTask {
                mainOutputFileName = "passAnalysisKotlin.js"
            }
        }

        binaries.executable()
    }
}
