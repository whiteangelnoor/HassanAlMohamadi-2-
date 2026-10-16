package com.falak.app

import android.os.Bundle
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

  /**
   * Passes the on-device ephemeris directory to the root component as the `ephePath` prop, or
   * `ephemerisError` if the files could not be installed.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle =
            Bundle().apply {
              try {
                putString("ephePath", EphemerisInstaller.install(this@MainActivity).absolutePath)
              } catch (e: Exception) {
                putString("ephemerisError", e.toString())
              }
            }
      }
}
