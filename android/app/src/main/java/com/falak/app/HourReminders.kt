// Reminders for planetary hours: the JavaScript side computes the times, this
// keeps them and wakes for each one with the alarm service, so they arrive
// with the app closed and after a restart of the phone. AGPL-3.0-or-later.
package com.falak.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

object HourReminders {
  private const val PREFS = "falak_reminders"
  private const val KEY = "list"
  private const val CHANNEL = "hours"
  /** A reminder this late is still shown; older ones are dropped. */
  private const val GRACE_MS = 15 * 60 * 1000L

  data class Reminder(val at: Long, val title: String, val body: String)

  /** Replaces the stored reminders (a JSON array of {at, title, body}). */
  fun replace(context: Context, json: String) {
    val now = System.currentTimeMillis()
    val list = parse(json).filter { it.at > now }
    store(context, list)
    scheduleNext(context, list)
  }

  /** Called by the alarm: shows the reminders now due, then waits for the next. */
  fun fire(context: Context) {
    val now = System.currentTimeMillis()
    val list = load(context)
    val (due, later) = list.partition { it.at <= now + 60_000 }
    for (r in due) {
      if (r.at >= now - GRACE_MS) {
        notify(context, r)
      }
    }
    store(context, later)
    scheduleNext(context, later)
  }

  fun reschedule(context: Context) {
    val now = System.currentTimeMillis()
    val list = load(context).filter { it.at >= now - GRACE_MS }
    store(context, list)
    scheduleNext(context, list)
  }

  fun exactAllowed(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return am.canScheduleExactAlarms()
  }

  private fun scheduleNext(context: Context, list: List<Reminder>) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi =
        PendingIntent.getBroadcast(
            context,
            0,
            Intent(context, HourReminderReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    val next = list.minByOrNull { it.at }
    if (next == null) {
      am.cancel(pi)
      return
    }
    val at = maxOf(next.at, System.currentTimeMillis() + 1000)
    if (exactAllowed(context)) {
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    } else {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }
  }

  private fun notify(context: Context, r: Reminder) {
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
          NotificationChannel(CHANNEL, "الساعات الروحانية", NotificationManager.IMPORTANCE_HIGH))
    }
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val content =
        launch?.let {
          PendingIntent.getActivity(
              context, 1, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
    val n =
        NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(r.title)
            .setContentText(r.body.lineSequence().first())
            .setStyle(NotificationCompat.BigTextStyle().bigText(r.body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(content)
            .build()
    nm.notify((r.at / 1000 % Int.MAX_VALUE).toInt(), n)
  }

  private fun parse(json: String): List<Reminder> {
    val a = JSONArray(json)
    return (0 until a.length())
        .map { a.getJSONObject(it) }
        .map { Reminder(it.getLong("at"), it.getString("title"), it.getString("body")) }
        .sortedBy { it.at }
  }

  private fun load(context: Context): List<Reminder> =
      try {
        parse(prefs(context).getString(KEY, "[]") ?: "[]")
      } catch (e: Exception) {
        emptyList()
      }

  private fun store(context: Context, list: List<Reminder>) {
    val a = JSONArray()
    for (r in list) {
      a.put(JSONObject().put("at", r.at).put("title", r.title).put("body", r.body))
    }
    prefs(context).edit().putString(KEY, a.toString()).apply()
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

/** The alarm, and the phone restarting or the app being updated. */
class HourReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      null -> HourReminders.fire(context)
      else -> HourReminders.reschedule(context)
    }
  }
}
