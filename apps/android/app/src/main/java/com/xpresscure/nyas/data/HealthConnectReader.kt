package com.xpresscure.nyas.data

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Duration
import java.time.LocalDate
import java.time.ZoneId

class HealthConnectReader(private val context: Context) {
    companion object {
        val permissions = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class)
        )

        fun permissionContract() = PermissionController.createRequestPermissionResultContract()
    }

    val status: Int get() = HealthConnectClient.getSdkStatus(context)
    private val client by lazy { HealthConnectClient.getOrCreate(context) }

    suspend fun hasPermissions(): Boolean = status == HealthConnectClient.SDK_AVAILABLE &&
        client.permissionController.getGrantedPermissions().containsAll(permissions)

    suspend fun readLastSevenDays(): List<FitnessDay> {
        if (!hasPermissions()) return emptyList()
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        return (6 downTo 0).map { offset ->
            val date = today.minusDays(offset.toLong())
            val start = date.atStartOfDay(zone).toInstant()
            val end = date.plusDays(1).atStartOfDay(zone).toInstant()
            val aggregate = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL, DistanceRecord.DISTANCE_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            val sessions = client.readRecords(
                ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            ).records
            FitnessDay(
                date = date.toString(),
                steps = aggregate[StepsRecord.COUNT_TOTAL] ?: 0,
                activeMinutes = sessions.sumOf { Duration.between(it.startTime, it.endTime).toMinutes() }.toInt(),
                distanceMetres = aggregate[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
            )
        }
    }
}
