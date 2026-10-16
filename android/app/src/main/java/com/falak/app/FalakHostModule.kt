// Storage, printing and reminders for the JavaScript side. AGPL-3.0-or-later.
package com.falak.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.falak.app.specs.NativeFalakHostSpec

class FalakHostModule(context: ReactApplicationContext) : NativeFalakHostSpec(context) {

  private val prefs = context.getSharedPreferences("falak_store", Context.MODE_PRIVATE)

  // Kept alive until the print job has taken the page.
  private var printView: WebView? = null

  override fun getName(): String = NAME

  override fun getItem(key: String): String? = prefs.getString(key, null)

  override fun setItem(key: String, value: String) {
    prefs.edit().putString(key, value).apply()
  }

  override fun removeItem(key: String) {
    prefs.edit().remove(key).apply()
  }

  /**
   * Lays the page out in an off-screen WebView (which shapes Arabic text
   * correctly) and hands it to the system print dialog, where the user can
   * choose "Save as PDF" or a printer.
   */
  override fun printHtml(html: String, jobName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "no visible screen to print from")
      return
    }
    activity.runOnUiThread {
      try {
        val view = WebView(activity)
        view.settings.javaScriptEnabled = false
        view.webViewClient =
            object : WebViewClient() {
              override fun onPageFinished(v: WebView, url: String?) {
                val pm = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
                pm.print(
                    jobName,
                    v.createPrintDocumentAdapter(jobName),
                    PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .build(),
                )
                promise.resolve(null)
              }
            }
        view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
        printView = view
      } catch (e: Exception) {
        promise.reject("PRINT_FAILED", e)
      }
    }
  }

  override fun scheduleReminders(json: String) {
    HourReminders.replace(reactApplicationContext, json)
  }

  override fun exactAlarmsAllowed(): Boolean = HourReminders.exactAllowed(reactApplicationContext)

  override fun openExactAlarmSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val intent =
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            .setData(Uri.parse("package:" + reactApplicationContext.packageName))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
  }

  companion object {
    const val NAME = "FalakHost"
  }
}
