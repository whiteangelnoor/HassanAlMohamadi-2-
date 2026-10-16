// Over-the-air updates of the JavaScript bundle. AGPL-3.0-or-later.
package com.falak.app

import android.content.Context
import android.util.Log
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.zip.GZIPInputStream
import org.json.JSONObject

/**
 * The screens live in the JavaScript bundle, which the APK embeds. CI also
 * publishes every new bundle to a GitHub release; this class fetches it in the
 * background and the next launch runs it. Native code (the engine, Kotlin)
 * cannot change this way, so a bundle is only accepted when it was built for
 * the same native "runtime version" as the installed APK. When CI publishes an
 * APK with a newer runtime, the app is told so it can offer the download.
 *
 * Safety: a downloaded bundle must match its SHA-256 (of the uncompressed file). A new bundle that does
 * not stay up for HEALTHY_AFTER_MS on [MAX_ATTEMPTS] launches is discarded,
 * remembered as bad, and the app falls back to the embedded bundle.
 *
 * Layout under filesDir/ota: current/ (in use), pending/ (next launch).
 * Each holds index.android.bundle and meta.json {"build": N}.
 */
object OtaUpdater {
  private const val TAG = "OtaUpdater"
  private const val BUNDLE = "index.android.bundle"
  private const val META = "meta.json"
  private const val PREFS = "ota"
  private const val MAX_ATTEMPTS = 3
  const val HEALTHY_AFTER_MS = 5000L

  private val enabled: Boolean
    get() = BuildConfig.RUNTIME_VERSION != "dev" && BuildConfig.OTA_BASE_URL.isNotEmpty()

  @Volatile private var checkStarted = false

  private fun root(ctx: Context) = File(ctx.filesDir, "ota")

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun buildOf(dir: File): Int =
      try {
        JSONObject(File(dir, META).readText()).getInt("build")
      } catch (e: Exception) {
        -1
      }

  /** Build number of the bundle that will run: the embedded one or an update. */
  fun runningBuild(ctx: Context): Int {
    val b = buildOf(File(root(ctx), "current"))
    return if (b > BuildConfig.VERSION_CODE) b else BuildConfig.VERSION_CODE
  }

  /**
   * Called once while creating the React host. Returns the bundle file to run,
   * or null for the bundle embedded in the APK.
   */
  @Synchronized
  fun bundleForLaunch(ctx: Context): String? {
    if (!enabled) return null
    val root = root(ctx)
    val current = File(root, "current")
    val pending = File(root, "pending")
    val prefs = prefs(ctx)

    // A bundle from an older APK install, or not newer than the embedded one.
    if (prefs.getString("runtime", null) != BuildConfig.RUNTIME_VERSION) {
      root.deleteRecursively()
      prefs.edit().clear().putString("runtime", BuildConfig.RUNTIME_VERSION).apply()
    }

    if (File(pending, BUNDLE).isFile && buildOf(pending) > buildOf(current)) {
      current.deleteRecursively()
      if (pending.renameTo(current)) {
        prefs.edit().putBoolean("healthy", false).putInt("attempts", 0).apply()
      }
    }
    pending.deleteRecursively()

    val build = buildOf(current)
    if (!File(current, BUNDLE).isFile || build <= BuildConfig.VERSION_CODE) {
      current.deleteRecursively()
      return null
    }

    if (!prefs.getBoolean("healthy", false)) {
      val attempts = prefs.getInt("attempts", 0)
      if (attempts >= MAX_ATTEMPTS) {
        Log.w(TAG, "bundle $build did not start cleanly, rolling back")
        prefs.edit().putInt("badBuild", build).putInt("attempts", 0).apply()
        current.deleteRecursively()
        return null
      }
      prefs.edit().putInt("attempts", attempts + 1).apply()
    }
    return File(current, BUNDLE).absolutePath
  }

  /** The running bundle stayed up long enough: keep it. */
  fun markHealthy(ctx: Context) {
    prefs(ctx).edit().putBoolean("healthy", true).putInt("attempts", 0).apply()
  }

  /** Download URL of a newer APK found by an earlier check, if any. */
  fun apkUpdateUrl(ctx: Context): String? = prefs(ctx).getString("apkUrl", null)

  /** Looks for a newer bundle and a newer APK. Runs once per process. */
  fun checkInBackground(ctx: Context) {
    if (!enabled || checkStarted) return
    checkStarted = true
    val app = ctx.applicationContext
    Thread {
          try {
            check(app)
          } catch (e: Exception) {
            Log.i(TAG, "update check failed: $e")
          }
        }
        .apply { isDaemon = true }
        .start()
  }

  private fun check(ctx: Context) {
    val base = BuildConfig.OTA_BASE_URL
    val prefs = prefs(ctx)

    val apk = JSONObject(fetchText("$base/apk.json"))
    if (apk.getInt("build") > BuildConfig.VERSION_CODE &&
        apk.getString("runtime") != BuildConfig.RUNTIME_VERSION) {
      prefs.edit().putString("apkUrl", apk.getString("url")).apply()
    } else {
      prefs.edit().remove("apkUrl").apply()
    }

    val m = JSONObject(fetchText("$base/manifest-${BuildConfig.RUNTIME_VERSION}.json"))
    val build = m.getInt("build")
    val root = root(ctx)
    val newest =
        maxOf(BuildConfig.VERSION_CODE, buildOf(File(root, "current")), buildOf(File(root, "pending")))
    if (build <= newest || build == prefs.getInt("badBuild", -1)) return

    val tmp = File(root, "download")
    tmp.deleteRecursively()
    tmp.mkdirs()
    val file = File(tmp, BUNDLE)
    download(m.getString("url"), file)
    val sha = sha256(file)
    if (!sha.equals(m.getString("sha256"), ignoreCase = true)) {
      tmp.deleteRecursively()
      throw IllegalStateException("checksum mismatch for build $build")
    }
    File(tmp, META).writeText(JSONObject().put("build", build).toString())

    synchronized(this) {
      val pending = File(root, "pending")
      pending.deleteRecursively()
      if (!tmp.renameTo(pending)) tmp.deleteRecursively()
    }
    Log.i(TAG, "bundle $build ready for next launch")
  }

  private fun open(url: String): HttpURLConnection {
    val c = URL(url).openConnection() as HttpURLConnection
    c.connectTimeout = 15000
    c.readTimeout = 30000
    c.instanceFollowRedirects = true
    c.setRequestProperty("Cache-Control", "no-cache")
    if (c.responseCode != 200) {
      c.disconnect()
      throw IllegalStateException("HTTP ${c.responseCode} for $url")
    }
    return c
  }

  private fun fetchText(url: String): String {
    val c = open(url)
    try {
      return c.inputStream.bufferedReader().use { it.readText() }
    } finally {
      c.disconnect()
    }
  }

  /** Bundles are published gzip-compressed (about a third of the size). */
  private fun download(url: String, to: File) {
    val c = open(url)
    try {
      GZIPInputStream(c.inputStream).use { input -> to.outputStream().use { input.copyTo(it) } }
    } finally {
      c.disconnect()
    }
  }

  private fun sha256(f: File): String {
    val md = MessageDigest.getInstance("SHA-256")
    f.inputStream().use { input ->
      val buf = ByteArray(64 * 1024)
      while (true) {
        val n = input.read(buf)
        if (n < 0) break
        md.update(buf, 0, n)
      }
    }
    return md.digest().joinToString("") { "%02x".format(it) }
  }
}
