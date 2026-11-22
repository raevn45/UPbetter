package com.up.alarm

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.app.PendingIntent

class UPGoogleAuthActivity : Activity() {
    companion object {
        const val EXTRA_PENDING_INTENT = "up_google_pending_intent"
        private const val REQUEST_AUTHORIZATION = 7412
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pendingIntent = intent.getParcelableExtra<PendingIntent>(EXTRA_PENDING_INTENT)
        if (pendingIntent == null) {
            setResult(RESULT_CANCELED)
            finish()
            return
        }
        try {
            startIntentSenderForResult(
                pendingIntent.intentSender,
                REQUEST_AUTHORIZATION,
                null,
                0,
                0,
                0
            )
        } catch (_: Exception) {
            setResult(RESULT_CANCELED)
            finish()
        }
    }

    @Deprecated("Deprecated in Android API; retained for broad device compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_AUTHORIZATION) {
            setResult(resultCode, data)
            finish()
        }
    }
}
