package com.falak.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(FalakHostPackage())
        },
      // A downloaded update of the screens, or null for the embedded bundle.
      jsBundleFilePath = OtaUpdater.bundleForLaunch(applicationContext),
    )
  }

  override fun onCreate() {
    super.onCreate()
    // IBM Plex Sans Arabic in four weights, used as fontFamily "Plex".
    ReactFontManager.getInstance().addCustomFont(this, "Plex", R.font.plex_arabic)
    loadReactNative(this)
  }
}
