package com.xpresscure.nyas

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.xpresscure.nyas.ui.NyasApp
import com.xpresscure.nyas.ui.theme.NyasTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NyasTheme {
                NyasApp(deepLink = intent?.data)
            }
        }
    }
}
