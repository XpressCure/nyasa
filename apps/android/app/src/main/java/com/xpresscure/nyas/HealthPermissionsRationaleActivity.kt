package com.xpresscure.nyas

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.ui.theme.NyasTheme

class HealthPermissionsRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NyasTheme {
                Column(
                    modifier = Modifier.fillMaxSize().padding(28.dp),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text("Your health data stays yours", style = MaterialTheme.typography.headlineMedium)
                    Text(
                        "Nyas reads steps, walking distance and exercise time only after your permission. Sharing with the Kul is off until you choose to enable it.",
                        modifier = Modifier.padding(vertical = 18.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Button(onClick = {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://nyasa.xpresscure.com/privacy")))
                    }) { Text("Read privacy policy") }
                }
            }
        }
    }
}
