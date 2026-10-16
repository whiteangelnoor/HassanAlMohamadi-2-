package com.falak.app

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Falak"

  private val handler = Handler(Looper.getMainLooper())
  private val markHealthy = Runnable { OtaUpdater.markHealthy(applicationContext) }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    OtaUpdater.checkInBackground(this)
  }

  override fun onResume() {
    super.onResume()
    handler.postDelayed(markHealthy, OtaUpdater.HEALTHY_AFTER_MS)
  }

  override fun onPause() {
    handler.removeCallbacks(markHealthy)
    super.onPause()
  }

  /**
   * Root component props: `ephePath` (on-device ephemeris directory) or `ephemerisError`, the
   * running `build` number, and `apkUpdateUrl` when a newer APK is published.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle =
            Bundle().apply {
              putInt("build", OtaUpdater.runningBuild(this@MainActivity))
              OtaUpdater.apkUpdateUrl(this@MainActivity)?.let { putString("apkUpdateUrl", it) }
              try {
                putString("ephePath", EphemerisInstaller.install(this@MainActivity).absolutePath)
              } catch (e: Exception) {
                putString("ephemerisError", e.toString())
              }
            }
      }
}
