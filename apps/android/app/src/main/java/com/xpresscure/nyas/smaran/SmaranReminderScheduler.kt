package com.xpresscure.nyas.smaran

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.xpresscure.nyas.MainActivity
import com.xpresscure.nyas.R
import java.time.ZonedDateTime

object SmaranReminderScheduler {
    const val CHANNEL_ID = "prabhat_smaran"
    private const val MORNING_REQUEST = 700
    private const val EVENING_REQUEST = 2000

    fun schedule(context: Context) {
        createChannel(context)
        scheduleAt(context, 7, MORNING_REQUEST)
        scheduleAt(context, 20, EVENING_REQUEST)
    }

    private fun scheduleAt(context: Context, hour: Int, requestCode: Int) {
        val now = ZonedDateTime.now()
        var next = now.withHour(hour).withMinute(0).withSecond(0).withNano(0)
        if (!next.isAfter(now)) next = next.plusDays(1)
        val intent = Intent(context, SmaranReminderReceiver::class.java).putExtra("hour", hour)
        val pending = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).setInexactRepeating(
            AlarmManager.RTC_WAKEUP,
            next.toInstant().toEpochMilli(),
            AlarmManager.INTERVAL_DAY,
            pending
        )
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Prabhat Smaran", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Morning and evening reminders for the family's shared Smaran Pat"
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}

class SmaranReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        SmaranReminderScheduler.schedule(context)
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) return
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val hour = intent.getIntExtra("hour", 7)
        val openIntent = Intent(context, MainActivity::class.java).apply {
            data = android.net.Uri.parse("nyas://smaran")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pending = PendingIntent.getActivity(context, 7700 + hour, openIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(context, SmaranReminderScheduler.CHANNEL_ID)
            .setSmallIcon(R.drawable.nyas_logo)
            .setContentTitle(if (hour < 12) "Prabhat Smaran" else "Aaj ka Smaran")
            .setContentText(if (hour < 12) "Start the day by writing Ram or Om with your Kul." else "Today's Smaran Pat is waiting for you.")
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        NotificationManagerCompat.from(context).notify(7700 + hour, notification)
    }
}
