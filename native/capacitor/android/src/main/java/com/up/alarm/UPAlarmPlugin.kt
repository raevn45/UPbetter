package com.up.alarm

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

@CapacitorPlugin(name = "UPAlarm", permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])])
class UPAlarmPlugin : Plugin() {
    @PluginMethod
    fun capabilities(call: PluginCall) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val exact = Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()
        val notifications = Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        val fullScreen = Build.VERSION.SDK_INT < 34 || (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
        call.resolve(capabilityResult(exact, notifications, fullScreen))
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) {
            context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.parse("package:" + context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
            call.resolve(permissionResult(false, "Grant Alarms & reminders access, then return to UP."))
            return
        }
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback")
            return
        }
        if (Build.VERSION.SDK_INT >= 34 && !(context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()) {
            context.startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                data = Uri.parse("package:" + context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
            call.resolve(permissionResult(false, "Allow full-screen alarms in Android Settings, then return to UP."))
            return
        }
        call.resolve(permissionResult(true, "Alarm permissions are ready."))
    }

    @PermissionCallback
    private fun notificationPermissionCallback(call: PluginCall) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val exact = Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()
        val notifications = Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        val fullScreen = Build.VERSION.SDK_INT < 34 || (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
        call.resolve(permissionResult(exact && notifications && fullScreen,
            if (exact && notifications && fullScreen) "Alarm permissions are ready." else "Enable all alarm permissions in Android Settings."))
    }

    @PluginMethod
    fun schedule(call: PluginCall) {
        try {
            val alarm = call.getObject("alarm") ?: throw IllegalArgumentException("Missing alarm payload.")
            val next = call.getString("nextOccurrence") ?: throw IllegalArgumentException("Missing next occurrence.")
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) {
                call.resolve(result("permission_required", "Allow Alarms & reminders access in Android Settings.")); return
            }
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                call.resolve(result("permission_required", "Enable notifications for UP in Android Settings.")); return
            }
            if (Build.VERSION.SDK_INT >= 34 && !(context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()) {
                call.resolve(result("permission_required", "Allow full-screen alarms for UP in Android Settings.")); return
            }
            val id = alarm.getString("id") ?: throw IllegalArgumentException("Alarm ID is missing.")
            val record = org.json.JSONObject(alarm.toString()).put("nextOccurrence", next)
            UPAlarmStore(context).put(id, record.toString())
            UPAlarmScheduling.schedule(context, id, record)
            call.resolve(result("scheduled", "Scheduled with Android AlarmManager."))
        } catch (error: Exception) {
            call.resolve(result("failed", error.message ?: "Could not schedule alarm."))
        }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        val id = call.getString("alarmId")
        if (id.isNullOrBlank()) { call.reject("Alarm ID is required."); return }
        UPAlarmScheduling.cancel(context, id)
        UPAlarmStore(context).remove(id)
        call.resolve()
    }

    @PluginMethod
    fun scheduleTimer(call: PluginCall) {
        try {
            val id = call.getString("timerId") ?: throw IllegalArgumentException("Timer ID is missing.")
            val label = call.getString("label") ?: "UP timer"
            val endsAt = call.getString("endsAt") ?: throw IllegalArgumentException("Timer end time is missing.")
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) {
                call.resolve(result("permission_required", "Allow Alarms & reminders access to use native timers.")); return
            }
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                call.resolve(result("permission_required", "Enable notifications for UP to use native timers.")); return
            }
            if (Build.VERSION.SDK_INT >= 34 && !(context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()) {
                call.resolve(result("permission_required", "Allow full-screen alarms for UP to use native timers.")); return
            }
            val record = org.json.JSONObject()
                .put("id", id).put("label", label).put("soundId", "device-alarm")
                .put("repeatDays", org.json.JSONArray()).put("timeZone", java.time.ZoneId.systemDefault().id)
                .put("nextOccurrence", endsAt).put("volume", 1.0).put("gradualVolume", false)
                .put("vibration", true).put("snoozeMinutes", 5)
            UPAlarmStore(context).put(id, record.toString())
            UPAlarmScheduling.schedule(context, id, record)
            call.resolve(result("scheduled", "Timer scheduled with Android AlarmManager."))
        } catch (error: Exception) {
            call.resolve(result("failed", error.message ?: "Could not schedule native timer."))
        }
    }

    @PluginMethod
    fun cancelTimer(call: PluginCall) {
        val id = call.getString("timerId")
        if (id.isNullOrBlank()) { call.reject("Timer ID is required."); return }
        UPAlarmScheduling.cancel(context, id)
        UPAlarmStore(context).remove(id)
        call.resolve()
    }

    @PluginMethod
    fun test(call: PluginCall) {
        try {
            val id = "up-native-test"
            val record = org.json.JSONObject().put("id", id).put("label", "UP test alarm")
                .put("soundId", "rain-soft").put("repeatDays", org.json.JSONArray())
                .put("timeZone", java.time.ZoneId.systemDefault().id)
                .put("nextOccurrence", java.time.Instant.now().plusSeconds(60).toString())
            UPAlarmStore(context).put(id, record.toString())
            UPAlarmScheduling.schedule(context, id, record)
            call.resolve()
        } catch (error: Exception) { call.reject(error.message ?: "Could not schedule test alarm.") }
    }

    private fun result(state: String, message: String) = JSObject().apply { put("state", state); put("message", message) }
    private fun permissionResult(granted: Boolean, note: String) = JSObject().apply {
        put("platform", "android"); put("nativeAlarmSupported", true)
        put("exactScheduling", granted); put("requiresPermission", true)
        put("permissionGranted", granted); put("notes", JSArray().put(note))
    }
    private fun capabilityResult(exact: Boolean, notifications: Boolean, fullScreen: Boolean) = JSObject().apply {
        put("platform", "android"); put("nativeAlarmSupported", true)
        put("exactScheduling", exact); put("requiresPermission", true)
        put("permissionGranted", exact && notifications && fullScreen)
        put("notes", JSArray().put("Exact alarm: " + exact).put("Notifications: " + notifications).put("Full-screen alarm access: " + fullScreen))
    }
}
