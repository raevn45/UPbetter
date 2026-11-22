package com.up.alarm

import android.content.Intent
import android.net.Uri
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.Scopes
import com.google.android.gms.common.api.Scope
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

@CapacitorPlugin(name = "UPGoogleAuth")
class UPGoogleAuthPlugin : Plugin() {
    @PluginMethod
    fun authorize(call: PluginCall) {
        val scopes = listOf(
            Scope(Scopes.OPEN_ID),
            Scope(Scopes.EMAIL),
            Scope(Scopes.PROFILE),
            Scope("https://www.googleapis.com/auth/calendar.events")
        )
        val request = AuthorizationRequest.builder()
            .setRequestedScopes(scopes)
            .build()

        Identity.getAuthorizationClient(activity)
            .authorize(request)
            .addOnSuccessListener { result ->
                if (result.hasResolution()) {
                    val pendingIntent = result.pendingIntent
                    if (pendingIntent == null) {
                        call.reject("Google authorization needs a sign-in step, but no authorization screen was provided.")
                        return@addOnSuccessListener
                    }
                    val intent = Intent(context, UPGoogleAuthActivity::class.java)
                        .putExtra(UPGoogleAuthActivity.EXTRA_PENDING_INTENT, pendingIntent)
                    startActivityForResult(call, intent, "googleAuthorizationResult")
                } else {
                    finishAuthorization(call, result.accessToken)
                }
            }
            .addOnFailureListener { error ->
                call.reject(error.message ?: "Google authorization failed.")
            }
    }

    @ActivityCallback
    private fun googleAuthorizationResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != android.app.Activity.RESULT_OK || result.data == null) {
            call.reject("Google sign-in was cancelled or not completed.")
            return
        }
        try {
            val authorization = Identity.getAuthorizationClient(activity)
                .getAuthorizationResultFromIntent(result.data)
            finishAuthorization(call, authorization.accessToken)
        } catch (error: Exception) {
            call.reject(error.message ?: "Google authorization could not be completed.")
        }
    }

    private fun finishAuthorization(call: PluginCall, accessToken: String?) {
        if (accessToken.isNullOrBlank()) {
            call.reject("Google did not return an access token.")
            return
        }
        Thread {
            var email = ""
            try {
                val connection = URL("https://www.googleapis.com/oauth2/v3/userinfo")
                    .openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $accessToken")
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                if (connection.responseCode in 200..299) {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    email = JSONObject(body).optString("email", "")
                }
                connection.disconnect()
            } catch (_: Exception) { }
            val response = JSObject()
                .put("accessToken", accessToken)
                .put("email", email)
            activity.runOnUiThread { call.resolve(response) }
        }.start()
    }
}
