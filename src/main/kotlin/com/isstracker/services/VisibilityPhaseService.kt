package com.isstracker.services

import com.isstracker.models.IssPosition
import com.isstracker.models.VisibilityPhase
import com.isstracker.models.VisibilityPhaseDuration
import com.isstracker.models.VisibilityPhaseReport

class VisibilityPhaseService {
    private val categories = listOf("DAYLIGHT", "ECLIPSED", "VISIBLE", "UNKNOWN")

    fun analyze(
        positions: List<IssPosition>,
        maxGapSeconds: Long = 90
    ): VisibilityPhaseReport {
        require(maxGapSeconds > 0)
        val samples = positions.asSequence()
            .filter { it.timestamp > 0 }
            .sortedBy { it.timestamp }
            .distinctBy { it.timestamp }
            .toList()

        val phases = mutableListOf<VisibilityPhase>()
        var state: String? = null
        var first = 0L
        var last = 0L
        var count = 0
        var recorded = 0L
        var transitions = 0
        var gaps = 0

        fun finish() {
            val current = state ?: return
            phases.add(
                VisibilityPhase(
                    state = current,
                    startTimestamp = first,
                    endTimestamp = last,
                    sampleCount = count,
                    recordedSeconds = recorded
                )
            )
        }

        for (sample in samples) {
            val nextState = normalize(sample.visibility)
            val gap = state != null && sample.timestamp - last > maxGapSeconds
            val change = state != null && nextState != state

            if (gap) gaps++
            if (change && !gap) transitions++
            if (gap || change) {
                finish()
                state = null
            }

            if (state == null) {
                state = nextState
                first = sample.timestamp
                last = sample.timestamp
                count = 1
                recorded = 0
            } else {
                recorded += sample.timestamp - last
                last = sample.timestamp
                count++
            }
        }
        finish()

        val total = phases.sumOf { it.recordedSeconds }
        return VisibilityPhaseReport(
            samples = samples.size,
            phaseCount = phases.size,
            transitionCount = transitions,
            skippedGaps = gaps,
            totalRecordedSeconds = total,
            durationByState = categories.map { category ->
                val seconds = phases.filter { it.state == category }
                    .sumOf { it.recordedSeconds }
                VisibilityPhaseDuration(
                    state = category,
                    recordedSeconds = seconds,
                    percentage = if (total > 0) seconds * 100.0 / total else 0.0
                )
            },
            phases = phases
        )
    }

    fun normalize(label: String): String =
        label.trim().uppercase().takeIf { it in categories } ?: "UNKNOWN"
}
