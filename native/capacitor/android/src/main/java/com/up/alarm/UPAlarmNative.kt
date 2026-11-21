package com.up.alarm

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

internal class UPAlarmStore(context: Context) {
    private val prefs = context.getSharedPreferences("up_native_alarms", Context.MODE_PRIVATE)
    fun put(id: String, json: String) { prefs.edit().putString(id, json).apply() }
    fun remove(id: String) { prefs.edit().remove(id).apply() }
    fun all(): Map<String, String> = prefs.all.mapNotNull { (key, value) -> if (value is String) key to value else null }.toMap()
}

internal object UPAlarmScheduling {
    fun schedule(context: Context, id: String, record: JSONObject) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val instant = Instant.parse(record.getString("nextOccurrence"))
        require(instant.isAfter(Instant.now())) { "The next alarm time must be in the future." }
        val trigger = PendingIntent.getBroadcast(context, id.hashCode(),
            Intent(context, UPAlarmReceiver::class.java).putExtra("alarmId", id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val alarmLabel = record.optString("label", "Time to get up")
        val show = PendingIntent.getActivity(context, id.hashCode(),
            Intent(context, UPAlarmActivity::class.java).putExtra("alarmId", id).putExtra("alarmLabel", alarmLabel),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(instant.toEpochMilli(), show), trigger)
    }

    fun cancel(context: Context, id: String) {
        val pending = PendingIntent.getBroadcast(context, id.hashCode(),
            Intent(context, UPAlarmReceiver::class.java).putExtra("alarmId", id),
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        if (pending != null) {
            (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending)
            pending.cancel()
        }
    }

    fun nextWeekly(record: JSONObject): Instant? {
        val days = record.optJSONArray("repeatDays") ?: return null
        if (days.length() == 0) return null
        val zone = ZoneId.of(record.optString("timeZone", ZoneId.systemDefault().id))
        val now = ZonedDateTime.now(zone)
        val base = now.withHour(record.optInt("hour", 7)).withMinute(record.optInt("minute", 0)).withSecond(0).withNano(0)
        for (offset in 0..7) {
            val candidate = base.plusDays(offset.toLong())
            val jsDay = candidate.dayOfWeek.value % 7
            var matches = false
            for (i in 0 until days.length()) if (days.optInt(i, -1) == jsDay) matches = true
            if (matches && candidate.isAfter(now)) return candidate.toInstant()
        }
        return null
    }

    fun refreshAfterClockChange(context: Context) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) return
        val store = UPAlarmStore(context)
        store.all().forEach { (id, raw) ->
            try {
                val record = JSONObject(raw)
                val weekly = nextWeekly(record)
                if (weekly != null) {
                    record.put("nextOccurrence", weekly.toString())
                    store.put(id, record.toString())
                    schedule(context, id, record)
                } else {
                    val next = Instant.parse(record.getString("nextOccurrence"))
                    if (next.isAfter(Instant.now())) schedule(context, id, record)
                    else { cancel(context, id); store.remove(id) }
                }
            } catch (_: Exception) { cancel(context, id); store.remove(id) }
        }
    }
}

class UPAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("alarmId") ?: return
        val raw = UPAlarmStore(context).all()[id] ?: return
        val record = JSONObject(raw)
        UPAlarmNotifications.show(context, id, record.optString("label", "UP alarm"))
        val next = UPAlarmScheduling.nextWeekly(record)
        if (next != null) {
            record.put("nextOccurrence", next.toString())
            record.put("ringing", false)
            UPAlarmStore(context).put(id, record.toString())
            UPAlarmScheduling.schedule(context, id, record)
        } else {
            // Keep the one-shot record available to the full-screen activity for
            // its selected sound and wake challenge. Stop removes it after dismissal.
            record.put("ringing", true)
            UPAlarmStore(context).put(id, record.toString())
        }
    }
}

class UPBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        UPAlarmScheduling.refreshAfterClockChange(context)
    }
}

internal object UPAlarmNotifications {
    private const val CHANNEL = "up_alarms"
    fun show(context: Context, id: String, label: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            if (manager.getNotificationChannel(CHANNEL) == null) {
                val channel = NotificationChannel(CHANNEL, "UP alarms", NotificationManager.IMPORTANCE_HIGH)
                channel.description = "Alarms created in UP"
                channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build())
                manager.createNotificationChannel(channel)
            }
        }
        val fullScreen = PendingIntent.getActivity(context, id.hashCode(),
            Intent(context, UPAlarmActivity::class.java).putExtra("alarmId", id).putExtra("alarmLabel", label),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = if (Build.VERSION.SDK_INT >= 26) {
            Notification.Builder(context, CHANNEL)
                .setSmallIcon(context.applicationInfo.icon)
                .setContentTitle(label.ifBlank { "Time to get up" })
                .setContentText("Your UP alarm is ringing.")
                .setCategory(Notification.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreen, true)
                .setAutoCancel(true).build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(context)
                .setSmallIcon(context.applicationInfo.icon)
                .setContentTitle(label.ifBlank { "Time to get up" })
                .setContentText("Your UP alarm is ringing.")
                .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
                .setAutoCancel(true).build()
        }
        manager.notify(id.hashCode(), notification)
    }
}
