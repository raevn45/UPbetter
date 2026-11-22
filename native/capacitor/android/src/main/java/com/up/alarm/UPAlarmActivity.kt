package com.up.alarm

import android.app.Activity
import android.content.Context
import android.media.MediaPlayer
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import kotlin.random.Random

class UPAlarmActivity : Activity() {
    private var player: MediaPlayer? = null
    private var record: JSONObject? = null
    private var alarmId: String? = null
    private var currentAnswer = ""
    private var completedRounds = 0
    private var totalRounds = 0
    private var challengeText: TextView? = null
    private var answerInput: EditText? = null
    private var feedbackText: TextView? = null
    private var stopButton: Button? = null
    private val handler = Handler(Looper.getMainLooper())
    private var fadeLevel = 0.05f
    private val fade = object : Runnable {
        override fun run() {
            val settings = record
            val target = (settings?.optDouble("volume", 0.8)?.toFloat() ?: 0.8f).coerceIn(0f, 1f)
            fadeLevel = (fadeLevel + 0.035f).coerceAtMost(target)
            player?.setVolume(fadeLevel, fadeLevel)
            if (fadeLevel < target) handler.postDelayed(this, 250)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (android.os.Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true); setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        alarmId = intent.getStringExtra("alarmId")
        record = alarmId?.let { UPAlarmStore(this).all()[it]?.let(::JSONObject) }
        val label = intent.getStringExtra("alarmLabel") ?: record?.optString("label") ?: "Time to get up"
        buildScreen(label)
        startAlarmAudio()
        startVibration()
        setupChallenge()
    }

    private fun buildScreen(label: String) {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(34, 48, 34, 48)
            setBackgroundColor(android.graphics.Color.rgb(16, 25, 27))
        }
        layout.addView(TextView(this).apply {
            text = "GOOD MORNING  ✦"
            textSize = 12f; setTextColor(android.graphics.Color.rgb(196, 154, 85))
            gravity = Gravity.CENTER
        })
        layout.addView(TextView(this).apply {
            text = label.ifBlank { "Time to get up" }; textSize = 30f
            setTextColor(android.graphics.Color.rgb(242, 239, 230))
            gravity = Gravity.CENTER; setPadding(0, 24, 0, 26)
        })
        challengeText = TextView(this).apply {
            textSize = 20f; setTextColor(android.graphics.Color.rgb(242, 239, 230))
            gravity = Gravity.CENTER; setPadding(0, 12, 0, 18)
        }
        layout.addView(challengeText)
        answerInput = EditText(this).apply {
            hint = "Your answer"; setSingleLine(true)
            setTextColor(android.graphics.Color.WHITE)
            setHintTextColor(android.graphics.Color.LTGRAY)
        }
        layout.addView(answerInput)
        feedbackText = TextView(this).apply {
            textSize = 14f; setTextColor(android.graphics.Color.rgb(196, 154, 85))
            gravity = Gravity.CENTER; setPadding(0, 10, 0, 10)
        }
        layout.addView(feedbackText)
        layout.addView(Button(this).apply {
            text = "Check answer / Complete step"
            setOnClickListener { checkChallenge() }
        })
        stopButton = Button(this).apply {
            text = "Stop alarm"
            isEnabled = false
            alpha = 0.45f
            setOnClickListener { stopAlarm() }
        }
        layout.addView(stopButton)
        layout.addView(Button(this).apply {
            text = "Emergency stop"
            contentDescription = "Stop the alarm immediately without completing a wake-up challenge"
            setOnClickListener { stopAlarm() }
        })
        setContentView(layout)
    }

    private fun startAlarmAudio() {
        val soundId = record?.optString("soundId", "") ?: ""
        val resourceName = when (soundId) {
            "classic-twinbell" -> "up_classic_twinbell"
            "classic-bedside" -> "up_classic_bedside"
            "classic-buzzer" -> "up_classic_buzzer"
            "rain-soft" -> "up_rain_soft"
            "rain-heavy" -> "up_rain_heavy"
            "rain-tin-roof" -> "up_rain_tin_roof"
            "rain-leaves" -> "up_rain_leaves"
            "water-stream" -> "up_water_stream"
            "water-river" -> "up_water_river"
            "water-surf" -> "up_water_surf"
            "wind-breeze" -> "up_wind_breeze"
            "wind-pines" -> "up_wind_pines"
            "nature-forest-day" -> "up_forest_day"
            "nature-jungle" -> "up_nature_jungle"
            "nature-meadow" -> "up_nature_meadow"
            "fire-camp" -> "up_fire_camp"
            "fire-stove" -> "up_fire_stove"
            "animals-cat" -> "up_cat_purr"
            "animals-owl" -> "up_animals_owl"
            "animals-frogs" -> "up_animals_frogs"
            "home-air-conditioner" -> "up_quiet_room"
            "city-distant-traffic" -> "up_city_traffic"
            "space-library" -> "up_space_library"
            "texture-clock" -> "up_texture_clock"
            "travel-airplane" -> "up_travel_airplane"
            else -> ""
        }
        val resourceId = if (resourceName.isNotEmpty()) resources.getIdentifier(resourceName, "raw", packageName) else 0
        val selectedDeviceUri = soundId.removePrefix("android-ringtone:")
        fun createPlayer(useSelectedSound: Boolean): MediaPlayer {
            return MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build())
                setWakeMode(this@UPAlarmActivity, android.os.PowerManager.PARTIAL_WAKE_LOCK)
                isLooping = true
                if (useSelectedSound && selectedDeviceUri != soundId && selectedDeviceUri.isNotBlank()) {
                    setDataSource(this@UPAlarmActivity, Uri.parse(selectedDeviceUri))
                } else if (useSelectedSound && resourceId != 0) {
                    resources.openRawResourceFd(resourceId).use { descriptor ->
                        setDataSource(descriptor.fileDescriptor, descriptor.startOffset, descriptor.length)
                    }
                } else {
                    val fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    setDataSource(this@UPAlarmActivity, fallback)
                }
                prepare()
            }
        }
        player = try {
            createPlayer(true)
        } catch (_: Exception) {
            // If a user-selected ringtone was moved or revoked, keep the alarm alive
            // with the phone's default alarm tone instead of crashing the ringing screen.
            try { createPlayer(false) } catch (_: Exception) { null }
        }
        val target = (record?.optDouble("volume", 0.8)?.toFloat() ?: 0.8f).coerceIn(0f, 1f)
        if (record?.optBoolean("gradualVolume", true) == true) {
            player?.setVolume(0.05f, 0.05f); player?.start(); handler.post(fade)
        } else {
            player?.setVolume(target, target); player?.start()
        }
    }

    private fun startVibration() {
        if (record?.optBoolean("vibration", true) == false) return
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (vibrator.hasVibrator()) {
            val pattern = longArrayOf(0, 450, 450, 650)
            if (android.os.Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            else @Suppress("DEPRECATION") vibrator.vibrate(pattern, 0)
        }
    }

    private fun setupChallenge() {
        val mission = record?.optJSONObject("mission")
        val kind = mission?.optString("kind", "none") ?: "none"
        val requiredKind = if (kind == "none" || kind.isBlank()) "random" else kind
        totalRounds = mission?.optInt("rounds", 3)?.coerceIn(3, 5) ?: 3
        completedRounds = 0
        nextChallenge(requiredKind, mission?.optString("difficulty", "hard") ?: "hard")
    }

    private fun nextChallenge(kind: String, difficulty: String) {
        answerInput?.setText("")
        val scale = when (difficulty) { "hard" -> 80; "medium" -> 30; else -> 10 }
        val actualKind = if (kind == "random") listOf("math", "memory", "sequence", "typing", "logic", "checklist", "movement").random() else kind
        when (actualKind) {
            "movement" -> {
                currentAnswer = "complete"
                challengeText?.text = "Take a comfortable moment to stand, stretch gently, or simply sit upright. Tap complete when you're ready."
                answerInput?.visibility = android.view.View.GONE
            }
            "checklist" -> {
                currentAnswer = "complete"
                challengeText?.text = "A small reset: sit up, switch on a light, and get some water if you want. Tap complete when ready."
                answerInput?.visibility = android.view.View.GONE
            }
            "typing" -> {
                currentAnswer = if (difficulty == "hard") "I am awake and ready to begin." else if (difficulty == "medium") "Today starts now." else "I am up."
                challengeText?.text = "Type this phrase: $currentAnswer"
                answerInput?.visibility = android.view.View.VISIBLE
            }
            "memory" -> {
                val digits = (1..if (difficulty == "hard") 5 else if (difficulty == "medium") 4 else 3).map { Random.nextInt(1, 10) }.joinToString("")
                currentAnswer = digits
                challengeText?.text = "Memorise this sequence, then type it: " + digits.toCharArray().joinToString("  ")
                answerInput?.visibility = android.view.View.VISIBLE
            }
            "sequence", "logic" -> {
                val start = Random.nextInt(1, 9)
                val step = if (difficulty == "hard") 5 else if (difficulty == "medium") 3 else 2
                currentAnswer = (start + step * 4).toString()
                challengeText?.text = "Find the next number: ${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, ?"
                answerInput?.visibility = android.view.View.VISIBLE
            }
            else -> {
                val a = Random.nextInt(2, scale + 2)
                val b = Random.nextInt(1, scale + 1)
                val subtract = Random.nextBoolean()
                val left = if (subtract) maxOf(a, b) else a
                val right = if (subtract) minOf(a, b) else b
                currentAnswer = (if (subtract) left - right else left + right).toString()
                challengeText?.text = "Quick one: $left ${if (subtract) "−" else "+"} $right = ?"
                answerInput?.visibility = android.view.View.VISIBLE
            }
        }
        feedbackText?.text = "Challenge ${completedRounds + 1} of $totalRounds"
    }

    private fun checkChallenge() {
        val input = if (answerInput?.visibility == android.view.View.GONE) "complete" else answerInput?.text?.toString()?.trim().orEmpty()
        if (!input.equals(currentAnswer, ignoreCase = true)) {
            feedbackText?.text = "Not quite. The alarm will keep ringing. Try again."
            return
        }
        completedRounds++
        if (completedRounds >= totalRounds) {
            challengeText?.text = "You're up. Take the morning at your own pace."
            answerInput?.visibility = android.view.View.GONE
            feedbackText?.text = "All challenges complete."
            enableStop("Stop alarm")
        } else {
            feedbackText?.text = "That's it. One more."
            val kind = record?.optJSONObject("mission")?.optString("kind", "math") ?: "math"
            val difficulty = record?.optJSONObject("mission")?.optString("difficulty", "easy") ?: "easy"
            nextChallenge(kind, difficulty)
        }
    }

    private fun enableStop(message: String) {
        challengeText?.text = message
        answerInput?.visibility = android.view.View.GONE
        stopButton?.isEnabled = true
        stopButton?.alpha = 1f
    }

    private fun stopAlarm() {
        alarmId?.let { id ->
            (getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager).cancel(id.hashCode())
            val days = record?.optJSONArray("repeatDays")
            if (days == null || days.length() == 0) {
                UPAlarmStore(this).markCompleted(id)
                UPAlarmStore(this).remove(id)
            } else {
                val next = UPAlarmScheduling.nextWeekly(record!!)
                if (next != null) {
                    record!!.put("nextOccurrence", next.toString())
                    record!!.put("ringing", false)
                    UPAlarmStore(this).put(id, record!!.toString())
                    UPAlarmScheduling.schedule(this, id, record!!)
                }
            }
        }
        finishWithoutSchedule()
    }

    private fun finishWithoutSchedule() {
        handler.removeCallbacks(fade)
        player?.stop(); player?.release(); player = null
        (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator).cancel()
        finish()
    }

    override fun onDestroy() {
        handler.removeCallbacks(fade)
        player?.release(); player = null
        (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator).cancel()
        super.onDestroy()
    }
}
