@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.BankContributionConfig
import com.xpresscure.nyas.data.KoshSummary
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.Sankalp
import com.xpresscure.nyas.ui.theme.Forest
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@Composable
fun KoshScreen(session: NyasSession, preferredProjectId: String? = null) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    var summary by remember { mutableStateOf(KoshSummary()) }
    var config by remember { mutableStateOf(BankContributionConfig()) }
    var projects by remember { mutableStateOf(emptyList<Sankalp>()) }
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var bankSheet by remember { mutableStateOf(false) }
    var allocationProject by remember { mutableStateOf<Sankalp?>(null) }
    var success by remember { mutableStateOf<Pair<String, Long>?>(null) }

    fun refresh() {
        scope.launch {
            loading = true
            error = ""
            try {
                val summaryRequest = async { api.koshSummary(session) }
                val projectRequest = async { api.sankalp(session) }
                val configRequest = async { api.bankContributionConfig(session) }
                summary = summaryRequest.await()
                projects = projectRequest.await().filter { it.status != "draft" && it.status != "archived" }
                    .sortedWith(compareBy<Sankalp> { it.fullyFunded }.thenByDescending { it.fundingPercent })
                config = configRequest.await()
                if (preferredProjectId != null) allocationProject = projects.firstOrNull { it.id == preferredProjectId }
            } catch (exception: ApiException) {
                error = exception.message.orEmpty()
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(session.familyId, preferredProjectId) { refresh() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Forest)) {
                Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Forest, Leaf))).padding(20.dp)) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.Savings, null, tint = Gold, modifier = Modifier.size(28.dp))
                            Spacer(Modifier.size(10.dp))
                            Text("Available in your Kosh", color = Color.White, style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.weight(1f))
                            IconButton(onClick = { refresh() }) { Icon(Icons.Outlined.Refresh, "Refresh", tint = Color.White) }
                        }
                        Text(money.format(summary.walletBalancePaise / 100.0), color = Color.White, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                        Text("Ready to allocate to a Sankalp", color = Color(0xFFDDE8E0))
                        Spacer(Modifier.height(18.dp))
                        Button(onClick = { bankSheet = true }, shape = RoundedCornerShape(8.dp)) {
                            Icon(Icons.Outlined.AccountBalance, null)
                            Spacer(Modifier.size(8.dp))
                            Text("Add money")
                        }
                    }
                }
            }
        }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = Gold) }
        if (error.isNotBlank()) item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(error, Modifier.weight(1f), color = MaterialTheme.colorScheme.onErrorContainer)
                    TextButton(onClick = { refresh() }) { Text("Try again") }
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Choose a Sankalp", style = MaterialTheme.typography.titleLarge)
                    Text("Allocate from your available Kosh", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        if (!loading && projects.none { !it.fullyFunded && it.budgetRequired }) item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
                Text("No Sankalp needs funding right now.", Modifier.padding(18.dp))
            }
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(end = 12.dp)) {
                items(projects.filter { !it.fullyFunded && it.budgetRequired }, key = { it.id }) { project ->
                    Card(
                        modifier = Modifier.fillParentMaxWidth(0.88f),
                        shape = RoundedCornerShape(8.dp),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(stageLabel(project.stage), color = Leaf, style = MaterialTheme.typography.labelLarge)
                            Text(project.title, style = MaterialTheme.typography.titleLarge)
                            Text(project.description, maxLines = 2, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            LinearProgressIndicator(
                                progress = { project.fundingPercent / 100f },
                                modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
                                color = Gold
                            )
                            Row {
                                Text("${project.fundingPercent}% funded", fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.weight(1f))
                                Text("${project.contributorCount} contributors", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (project.myAllocatedPaise > 0) {
                                Text("You contributed ${money.format(project.myAllocatedPaise / 100.0)}", color = Leaf, style = MaterialTheme.typography.labelLarge)
                            }
                            Button(onClick = { allocationProject = project }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) {
                                Text("Contribute")
                                Spacer(Modifier.size(8.dp))
                                Icon(Icons.AutoMirrored.Outlined.ArrowForward, null)
                            }
                        }
                    }
                }
            }
        }
        item {
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                KoshStat("Family Kosh", money.format(summary.treasuryBalancePaise / 100.0))
                KoshStat("Added this year", money.format(summary.contributionThisYearPaise / 100.0))
            }
        }
    }

    if (bankSheet) {
        BankContributionSheet(
            config = config,
            busy = busy,
            onDismiss = { if (!busy) bankSheet = false },
            onConfirm = { amount ->
                scope.launch {
                    busy = true
                    try {
                        val result = api.declareBankContribution(session, amount)
                        bankSheet = false
                        success = result.message to result.amountPaise
                        refresh()
                    } catch (exception: ApiException) {
                        error = exception.message.orEmpty()
                    } finally { busy = false }
                }
            }
        )
    }

    allocationProject?.let { project ->
        AllocationSheet(
            project = project,
            walletPaise = summary.walletBalancePaise,
            busy = busy,
            onDismiss = { if (!busy) allocationProject = null },
            onConfirm = { amount ->
                scope.launch {
                    busy = true
                    try {
                        val result = api.allocate(session, project.id, amount)
                        allocationProject = null
                        success = result.message to result.amountPaise
                        refresh()
                    } catch (exception: ApiException) {
                        error = exception.message.orEmpty()
                    } finally { busy = false }
                }
            }
        )
    }

    success?.let { (message, amountPaise) ->
        SuccessDialog(message, amountPaise) { success = null }
    }
}

@Composable
private fun BankContributionSheet(config: BankContributionConfig, busy: Boolean, onDismiss: () -> Unit, onConfirm: (Long) -> Unit) {
    val context = LocalContext.current
    var amount by remember { mutableStateOf(config.minimumAmountRupees.toString()) }
    var review by remember { mutableStateOf(false) }
    val parsed = amount.toLongOrNull() ?: 0
    ModalBottomSheet(onDismissRequest = onDismiss, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Add money to Kosh", style = MaterialTheme.typography.headlineSmall)
            Text("Send the money to the family account, then record the same amount here.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (config.qrImageUrl.isNotBlank()) {
                AsyncImage(config.qrImageUrl, "Payment QR", Modifier.size(180.dp).align(Alignment.CenterHorizontally))
            }
            Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.fillMaxWidth().padding(14.dp)) {
                    Text(config.accountName, fontWeight = FontWeight.Bold)
                    if (config.accountNumber.isNotBlank()) Text("Account: ${config.accountNumber}")
                    if (config.ifsc.isNotBlank()) Text("IFSC: ${config.ifsc}")
                    if (config.upiId.isNotBlank()) Text("UPI: ${config.upiId}")
                }
            }
            if (config.upiId.isNotBlank()) OutlinedButton(
                onClick = {
                    val uri = Uri.parse("upi://pay?pa=${Uri.encode(config.upiId)}&pn=${Uri.encode(config.accountName)}&am=$parsed&cu=INR&tn=${Uri.encode("Nyas Kul Kosh contribution")}")
                    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            ) { Text("Open UPI app") }
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it.filter(Char::isDigit).take(9) },
                label = { Text("Amount sent") },
                prefix = { Text("₹ ") },
                supportingText = { Text("Minimum ₹${config.minimumAmountRupees}") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Button(
                onClick = { review = true },
                enabled = !busy && parsed >= config.minimumAmountRupees,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(8.dp)
            ) { Text("Review and record") }
            Text("The Kosh team will reconcile this with the bank statement.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    if (review) AmountConfirmation(parsed, "I have sent this amount to the Nyas bank account.", busy, { review = false }) { onConfirm(parsed) }
}

@Composable
private fun AllocationSheet(project: Sankalp, walletPaise: Long, busy: Boolean, onDismiss: () -> Unit, onConfirm: (Long) -> Unit) {
    var amount by remember { mutableStateOf("") }
    var review by remember { mutableStateOf(false) }
    val parsed = amount.toLongOrNull() ?: 0
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    ModalBottomSheet(onDismissRequest = onDismiss, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("CONTRIBUTE TO SANKALP", color = Leaf, style = MaterialTheme.typography.labelLarge)
            Text(project.title, style = MaterialTheme.typography.headlineSmall)
            Text("Available ${money.format(walletPaise / 100.0)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it.filter(Char::isDigit).take(9) },
                label = { Text("Contribution amount") },
                prefix = { Text("₹ ") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Text("Nyas contribution limits and the remaining project need will be applied automatically.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(onClick = { review = true }, enabled = !busy && parsed > 0 && parsed * 100 <= walletPaise, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(8.dp)) {
                Text("Review contribution")
            }
        }
    }
    if (review) AmountConfirmation(parsed, "This amount will move from your Kosh to ${project.title}.", busy, { review = false }) { onConfirm(parsed) }
}

@Composable
private fun AmountConfirmation(amount: Long, detail: String, busy: Boolean, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Outlined.Payments, null, tint = Gold, modifier = Modifier.size(36.dp)) },
        title = { Text("Confirm this amount") },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text(money.format(amount), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                Text(amountInWords(amount), color = Leaf, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(12.dp))
                Text(detail)
            }
        },
        confirmButton = { Button(onClick = onConfirm, enabled = !busy) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Confirm") } },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("Change amount") } },
        shape = RoundedCornerShape(8.dp)
    )
}

@Composable
private fun SuccessDialog(message: String, amountPaise: Long, onDismiss: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }
    val scale by animateFloatAsState(if (visible) 1f else 0.65f, label = "success")
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Outlined.CheckCircle, null, tint = Leaf, modifier = Modifier.size(64.dp).scale(scale)) },
        title = { Text("Thank you", style = MaterialTheme.typography.headlineMedium) },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                if (amountPaise > 0) Text(money.format(amountPaise / 100.0), style = MaterialTheme.typography.headlineSmall, color = Forest)
                Spacer(Modifier.height(8.dp))
                Text(message)
                Spacer(Modifier.height(10.dp))
                Text("Trust • Transparency • Together", color = Gold, fontWeight = FontWeight.SemiBold)
            }
        },
        confirmButton = { Button(onClick = onDismiss) { Text("Done") } },
        shape = RoundedCornerShape(8.dp)
    )
}

@Composable
private fun KoshStat(label: String, value: String) {
    Column { Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value, style = MaterialTheme.typography.titleLarge) }
}

internal fun stageLabel(stage: String): String = when (stage) {
    "concept" -> "Concept"
    "research" -> "Research"
    "estimate_pending" -> "Estimate pending"
    "estimate_received" -> "Estimate received"
    "fundraising" -> "Funding"
    "ready_for_implementation" -> "Ready to begin"
    "implementation" -> "In progress"
    "completed" -> "Completed"
    "paused" -> "Paused"
    else -> stage.replace('_', ' ').replaceFirstChar(Char::uppercase)
}

private fun amountInWords(amount: Long): String {
    if (amount == 0L) return "Zero rupees"
    val parts = mutableListOf<String>()
    var remaining = amount
    val crore = remaining / 10_000_000; if (crore > 0) { parts += "$crore crore"; remaining %= 10_000_000 }
    val lakh = remaining / 100_000; if (lakh > 0) { parts += "$lakh lakh"; remaining %= 100_000 }
    val thousand = remaining / 1_000; if (thousand > 0) { parts += "$thousand thousand"; remaining %= 1_000 }
    if (remaining > 0) parts += remaining.toString()
    return parts.joinToString(" ") + " rupees"
}
