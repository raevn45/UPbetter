package com.up.alarm

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import org.json.JSONObject

@CapacitorPlugin(name = "UPAlarm", permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])])
class UPAlarmPlugin : Plugin() {
    @PluginMethod
    fun capabilities(call: PluginCall) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val exact = Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()
        val notifications = Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
        call.resolve(JSObject().apply {
            put("platform", "android")
            put("nativeAlarmSupported", true)
            put("exactScheduling", exact)
            put("requiresPermission", true)
            put("permissionGranted", exact && notifications)
            put("notes", JSArray().put("Exact alarm access and notification permission are required.").put("Full-screen alarm presentation depends on Android policy and user settings.").put("Reboot recovery is registered."))
        })
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
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback")
            return
        }
        call.resolve(permissionResult(true, "Alarm permissions are available."))
    }

    @PermissionCallback
    private fun notificationPermissionCallback(call: PluginCall) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val exact = Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()
        val notifications = Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
        call.resolve(permissionResult(exact && notifications,
            if (exact && notifications) "Alarm permissions are ready." else "Enable alarm and notification permissions in Android Settings."))
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
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                call.resolve(result("permission_required", "Enable notifications for UP in Android Settings.")); return
            }
            val id = alarm.getString("id") ?: throw IllegalArgumentException("Alarm ID is missing.")
            val record = JSONObject(alarm.toString()).put("nextOccurrence", next)
            UPAlarmStore(context).put(id, record.toString())
            UPAlarmScheduling.schedule(context, id, record)
            call.resolve(result("scheduled", "Scheduled with Android."))
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
    fun test(call: PluginCall) {
        try {
            val id = "up-native-test"
            val record = JSONObject().put("id", id).put("label", "UP test alarm")
                .put("soundId", "system-default").put("repeatDays", org.json.JSONArray())
                .put("timeZone", java.time.ZoneId.systemDefault().id)
                .put("nextOccurrence", java.time.Instant.now().plusSeconds(60).toString())
            UPAlarmStore(context).put(id, record.toString())
            UPAlarmScheduling.schedule(context, id, record)
            call.resolve()
        } catch (error: Exception) { call.reject(error.message ?: "Could not schedule test alarm.") }
    }

    private fun result(state: String, message: String) = JSObject().apply {
        put("state", state); put("message", message)
    }

    private fun permissionResult(granted: Boolean, note: String) = JSObject().apply {
        put("platform", "android"); put("nativeAlarmSupported", true)
        put("exactScheduling", granted); put("requiresPermission", true)
        put("permissionGranted", granted); put("notes", JSArray().put(note))
    }
}
