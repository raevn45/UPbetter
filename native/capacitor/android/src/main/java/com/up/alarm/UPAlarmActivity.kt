package com.up.alarm

import android.app.Activity
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class UPAlarmActivity : Activity() {
    private var ringtone: Ringtone? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (android.os.Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true); setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val id = intent.getStringExtra("alarmId")
        val label = intent.getStringExtra("alarmLabel") ?: id?.let { UPAlarmStore(this).all()[it]?.let { raw -> org.json.JSONObject(raw).optString("label") } }.orEmpty()
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(32, 32, 32, 32) }
        layout.addView(TextView(this).apply { text = label.ifBlank { "Time to get up" }; textSize = 30f; gravity = Gravity.CENTER })
        layout.addView(Button(this).apply {
            text = "Stop alarm"
            setOnClickListener {
                ringtone?.stop()
                val manager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
                if (id != null) manager.cancel(id.hashCode())
                finish()
            }
        })
        setContentView(layout)
        ringtone = RingtoneManager.getRingtone(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
        ringtone?.play()
        val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
        if (vibrator.hasVibrator()) {
            if (android.os.Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 500, 500), 0))
            else @Suppress("DEPRECATION") vibrator.vibrate(longArrayOf(0, 500, 500), 0)
        }
    }
    override fun onDestroy() {
        ringtone?.stop()
        (getSystemService(VIBRATOR_SERVICE) as Vibrator).cancel()
        super.onDestroy()
    }
}
