package com.up.alarm

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.app.Activity
import android.media.RingtoneManager
import android.media.MediaPlayer
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

@CapacitorPlugin(name = "UPAlarm", permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])])
class UPAlarmPlugin : Plugin() {
    private var soundPreviewPlayer: MediaPlayer? = null
    @PluginMethod
    fun pickAlarmSound(call: PluginCall) {
        val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
            putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
            putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Choose UP alarm sound")
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
            call.getString("existingUri")?.takeIf { it.isNotBlank() }?.let {
                putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(it))
            }
        }
        startActivityForResult(call, intent, "handleAlarmSoundPicked")
    }

    @ActivityCallback
    private fun handleAlarmSoundPicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK) {
            call.resolve(JSObject().put("cancelled", true))
            return
        }
        val uri = result.data?.getParcelableExtra<Uri>(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
        if (uri == null) {
            call.reject("Android did not return an alarm sound.")
            return
        }
        val title = RingtoneManager.getRingtone(context, uri)?.getTitle(context) ?: "Device alarm sound"
        call.resolve(JSObject().apply {
            put("cancelled", false)
            put("uri", uri.toString())
            put("title", title)
        })
    }

    @PluginMethod
    fun previewSound(call: PluginCall) {
        try {
            val soundId = call.getString("soundId") ?: throw IllegalArgumentException("Sound ID is missing.")
            val resourceName = when (soundId) {
                "classic-twinbell" -> "up_classic_twinbell"
                "classic-bedside" -> "up_classic_bedside"
                "classic-buzzer" -> "up_classic_buzzer"
                "device-alarm" -> ""
                else -> throw IllegalArgumentException("This sound has no native preview.")
            }
            val resourceId = context.resources.getIdentifier(resourceName, "raw", context.packageName)
            if (resourceId == 0 && soundId != "device-alarm") throw IllegalStateException("The selected sound is not bundled in this build.")
            stopPreviewPlayer()
            val player = MediaPlayer()
            player.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            if (soundId == "device-alarm") {
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                player.setDataSource(context, uri)
                player.isLooping = true
            } else {
                context.resources.openRawResourceFd(resourceId).use { descriptor ->
                    player.setDataSource(descriptor.fileDescriptor, descriptor.startOffset, descriptor.length)
                }
            }
            player.setOnCompletionListener { stopPreviewPlayer() }
            player.prepare()
            player.start()
            soundPreviewPlayer = player
            call.resolve()
        } catch (error: Exception) { call.reject(error.message ?: "Could not preview this sound.") }
    }

    @PluginMethod
    fun stopSoundPreview(call: PluginCall) {
        stopPreviewPlayer()
        call.resolve()
    }

    private fun stopPreviewPlayer() {
        soundPreviewPlayer?.let { player ->
            try { if (player.isPlaying) player.stop() } catch (_: Exception) {}
            player.release()
        }
        soundPreviewPlayer = null
    }

    @PluginMethod
    fun consumeCompleted(call: PluginCall) {
        val ids = UPAlarmStore(context).consumeCompleted()
        val array = JSArray()
        ids.forEach { array.put(it) }
        call.resolve(JSObject().put("alarmIds", array))
    }

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
                .put("soundId", "device-alarm").put("repeatDays", org.json.JSONArray())
                .put("timeZone", java.time.ZoneId.systemDefault().id)
                .put("nextOccurrence", java.time.Instant.now().plusSeconds(60).toString())
                .put("volume", 1.0).put("gradualVolume", false).put("vibration", true)
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
