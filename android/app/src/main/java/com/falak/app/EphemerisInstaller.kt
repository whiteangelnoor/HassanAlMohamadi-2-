// Copies the bundled Swiss Ephemeris files out of the APK on first launch.
// AGPL-3.0-or-later.
package com.falak.app

import android.content.Context
import java.io.File

/**
 * The engine reads its tables from a real directory, but APK assets are not
 * files. On first launch (and after every app update) the files under
 * assets/ephe are copied to <filesDir>/ephe. The copy goes to a temporary
 * directory first and is renamed only when complete, so an interrupted copy
 * never leaves a half-filled directory that looks valid.
 */
object EphemerisInstaller {
  private const val ASSET_DIR = "ephe"
  private const val MARKER = ".installed"

  fun install(context: Context): File {
    val target = File(context.filesDir, ASSET_DIR)
    val stamp = installStamp(context)
    val marker = File(target, MARKER)
    if (marker.isFile && marker.readText() == stamp) {
      return target
    }

    val tmp = File(context.filesDir, "$ASSET_DIR.tmp")
    tmp.deleteRecursively()
    tmp.mkdirs()
    val names = context.assets.list(ASSET_DIR).orEmpty()
    check(names.isNotEmpty()) { "no ephemeris files bundled under assets/$ASSET_DIR" }
    for (name in names) {
      context.assets.open("$ASSET_DIR/$name").use { input ->
        File(tmp, name).outputStream().use { output -> input.copyTo(output) }
      }
    }
    File(tmp, MARKER).writeText(stamp)

    target.deleteRecursively()
    check(tmp.renameTo(target)) { "could not move ephemeris files into place" }
    return target
  }

  /** Changes on every install or update, so new tables replace old ones. */
  private fun installStamp(context: Context): String {
    val info = context.packageManager.getPackageInfo(context.packageName, 0)
    return info.lastUpdateTime.toString()
  }
}
