package com.xpresscure.nyas.ui

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.BuildConfig
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.FamilyMemberProfile
import com.xpresscure.nyas.data.PasswordRecoveryGrant
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    session: NyasSession,
    onTokenChanged: (String) -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val preferences = remember { context.getSharedPreferences("nyas_preferences", android.content.Context.MODE_PRIVATE) }
    var familyAlerts by remember { mutableStateOf(preferences.getBoolean("family_alerts", true)) }
    var sankalpAlerts by remember { mutableStateOf(preferences.getBoolean("sankalp_alerts", true)) }
    var passwordDialog by remember { mutableStateOf(false) }
    var recoveryDialog by remember { mutableStateOf(false) }

    fun open(path: String) = CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context, Uri.parse(BuildConfig.WEB_BASE_URL + path))

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Card(shape = CircleShape, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)) {
                        Text(session.fullName.take(1).uppercase(), Modifier.padding(horizontal = 18.dp, vertical = 12.dp), color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.titleLarge)
                    }
                    Spacer(Modifier.size(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(session.fullName, style = MaterialTheme.typography.titleLarge)
                        Text(session.familyName, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(session.role.replace('_', ' ').replaceFirstChar(Char::uppercase), color = Leaf, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
        item {
            Text("Security", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            SettingsAction(Icons.Outlined.Lock, "Change password", "Use at least 8 characters") { passwordDialog = true }
            if (session.role == "owner") {
                HorizontalDivider()
                SettingsAction(Icons.Outlined.Key, "Help a member sign in", "Create a secure, one-time password recovery code") { recoveryDialog = true }
            }
            HorizontalDivider()
            SettingsInfo(Icons.Outlined.Security, "Protected on this device", "Your sign-in is encrypted using Android Keystore")
        }
        item {
            Text("Notifications", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            SettingsToggle(Icons.Outlined.Notifications, "Family reminders", "Birthdays, anniversaries and calendar events", familyAlerts) {
                familyAlerts = it; preferences.edit().putBoolean("family_alerts", it).apply()
            }
            HorizontalDivider()
            SettingsToggle(Icons.Outlined.Notifications, "Sankalp updates", "Funding, milestones and voting", sankalpAlerts) {
                sankalpAlerts = it; preferences.edit().putBoolean("sankalp_alerts", it).apply()
            }
        }
        item {
            Text("Trust and support", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            SettingsAction(Icons.Outlined.PrivacyTip, "Privacy policy", "How family data is protected") { open("/privacy") }
            HorizontalDivider()
            SettingsAction(Icons.Outlined.Gavel, "Terms and conditions", "Membership and Kosh rules") { open("/terms") }
        }
        item {
            TextButton(onClick = onLogout, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Icon(Icons.AutoMirrored.Outlined.Logout, null)
                Spacer(Modifier.size(8.dp))
                Text("Sign out")
            }
        }
    }

    if (passwordDialog) ChangePasswordDialog(session, onDismiss = { passwordDialog = false }, onChanged = {
        onTokenChanged(it); passwordDialog = false
    })
    if (recoveryDialog) PasswordRecoveryDialog(session, onDismiss = { recoveryDialog = false })
}

@Composable
private fun PasswordRecoveryDialog(session: NyasSession, onDismiss: () -> Unit) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("") }
    var members by remember { mutableStateOf<List<FamilyMemberProfile>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var workingMemberId by remember { mutableStateOf("") }
    var grant by remember { mutableStateOf<PasswordRecoveryGrant?>(null) }
    var error by remember { mutableStateOf("") }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        try {
            members = api.members(session).filter {
                it.status == "active" && it.livingStatus != "deceased" && it.hasLogin
            }
        } catch (exception: ApiException) {
            error = exception.message.orEmpty()
        } finally {
            loading = false
        }
    }

    AlertDialog(
        onDismissRequest = { if (workingMemberId.isBlank()) onDismiss() },
        title = { Text(if (grant == null) "Help a member sign in" else "Recovery code ready") },
        text = {
            if (grant != null) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Share this only with ${grant!!.memberName}. It works once and expires in 30 minutes.")
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                        SelectionContainer {
                            Text(
                                grant!!.recoveryCode,
                                Modifier.fillMaxWidth().padding(18.dp),
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Text("They should tap Use recovery code on the sign-in screen, enter this code, and choose a new password.")
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Choose the member whose password needs to be reset.")
                    OutlinedTextField(
                        query,
                        { query = it },
                        label = { Text("Search member") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (loading) CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
                    val visible = members.filter { it.displayName.contains(query.trim(), ignoreCase = true) }.take(8)
                    LazyColumn(Modifier.fillMaxWidth().heightIn(max = 300.dp)) {
                        items(visible.size) { index ->
                            val member = visible[index]
                            Card(
                                onClick = {
                                    scope.launch {
                                        workingMemberId = member.id
                                        error = ""
                                        try { grant = api.createPasswordRecoveryGrant(session, member.id) }
                                        catch (exception: ApiException) { error = exception.message.orEmpty() }
                                        finally { workingMemberId = "" }
                                    }
                                },
                                enabled = workingMemberId.isBlank(),
                                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)
                            ) {
                                Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(member.displayName, Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                                    if (workingMemberId == member.id) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                                    else Text("Create code", color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                    if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
                }
            }
        },
        confirmButton = {
            if (grant != null) Button(onClick = onDismiss) { Text("Done") }
        },
        dismissButton = {
            if (grant == null) TextButton(enabled = workingMemberId.isBlank(), onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
private fun SettingsAction(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Card(onClick = onClick, shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Leaf); Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.SemiBold); Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
            Icon(Icons.Outlined.ChevronRight, null)
        }
    }
}

@Composable
private fun SettingsInfo(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = Leaf); Spacer(Modifier.size(12.dp))
        Column { Text(title, fontWeight = FontWeight.SemiBold); Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun SettingsToggle(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String, checked: Boolean, onChecked: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = Leaf); Spacer(Modifier.size(12.dp))
        Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.SemiBold); Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
        Switch(checked, onChecked)
    }
}

@Composable
private fun ChangePasswordDialog(session: NyasSession, onDismiss: () -> Unit, onChanged: (String) -> Unit) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var current by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var passwordsVisible by remember { mutableStateOf(false) }
    var working by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = { if (!working) onDismiss() },
        title = { Text("Change password") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            val transformation = if (passwordsVisible) VisualTransformation.None else PasswordVisualTransformation()
            val visibilityIcon: @Composable () -> Unit = {
                IconButton(onClick = { passwordsVisible = !passwordsVisible }) {
                    Icon(if (passwordsVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, if (passwordsVisible) "Hide passwords" else "Show passwords")
                }
            }
            OutlinedTextField(current, { current = it }, label = { Text("Current password") }, visualTransformation = transformation, trailingIcon = visibilityIcon, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(password, { password = it }, label = { Text("New password") }, visualTransformation = transformation, trailingIcon = visibilityIcon, supportingText = { Text("At least 8 characters") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(confirm, { confirm = it }, label = { Text("Confirm new password") }, visualTransformation = transformation, trailingIcon = visibilityIcon, modifier = Modifier.fillMaxWidth())
            if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
        } },
        confirmButton = { Button(enabled = !working && current.isNotBlank() && password.length >= 8 && password == confirm, onClick = {
            scope.launch {
                working = true; error = ""
                try { onChanged(api.changePassword(session, current, password, confirm)) }
                catch (exception: ApiException) { error = exception.message.orEmpty() }
                finally { working = false }
            }
        }) { Text(if (working) "Updating..." else "Change password") } },
        dismissButton = { TextButton(enabled = !working, onClick = onDismiss) { Text("Cancel") } }
    )
}
