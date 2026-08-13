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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import com.xpresscure.nyas.data.KoshLedgerEntry
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.Sankalp
import com.xpresscure.nyas.ui.theme.Forest
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import com.xpresscure.nyas.ui.theme.Sage
import com.xpresscure.nyas.ui.theme.Sunlight
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
    var ledger by remember { mutableStateOf(emptyList<KoshLedgerEntry>()) }
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var bankError by remember { mutableStateOf("") }
    var allocationError by remember { mutableStateOf("") }
    var bankSheet by remember { mutableStateOf(false) }
    var allocationProject by remember { mutableStateOf<Sankalp?>(null) }
    var success by remember { mutableStateOf<Pair<String, Long>?>(null) }
    var myYogdaanOpen by remember { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            loading = true
            error = ""
            try {
                val summaryRequest = async { api.koshSummary(session) }
                val projectRequest = async { api.sankalp(session) }
                val configRequest = async { api.bankContributionConfig(session) }
                val ledgerRequest = async { api.myKoshLedger(session) }
                summary = summaryRequest.await()
                projects = projectRequest.await().filter { it.status != "draft" && it.status != "archived" }
                    .sortedWith(compareBy<Sankalp> { it.fullyFunded }.thenByDescending { it.fundingPercent })
                config = configRequest.await()
                ledger = ledgerRequest.await()
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
            Card(
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = Sage),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Sage, Sunlight))).padding(20.dp)) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.Savings, null, tint = Gold, modifier = Modifier.size(28.dp))
                            Spacer(Modifier.size(10.dp))
                            Text("Available in your Kosh", color = Forest, style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.weight(1f))
                            Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.78f)) {
                                IconButton(onClick = { refresh() }) { Icon(Icons.Outlined.Refresh, "Refresh", tint = Forest) }
                            }
                        }
                        Text(money.format(summary.walletBalancePaise / 100.0), color = Forest, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                        Text("Ready to allocate to a Sankalp", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(18.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(onClick = { bankError = ""; bankSheet = true }, shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f)) {
                                Icon(Icons.Outlined.AccountBalance, null)
                                Spacer(Modifier.size(6.dp))
                                Text("धन जोड़ें")
                            }
                            OutlinedButton(onClick = { myYogdaanOpen = true }, shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f)) {
                                Icon(Icons.Outlined.Payments, null)
                                Spacer(Modifier.size(6.dp))
                                Text("मेरा योगदान")
                            }
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
                            Button(onClick = { allocationError = ""; allocationProject = project }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) {
                                Text("योगदान")
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
            error = bankError,
            onDismiss = { if (!busy) bankSheet = false },
            onConfirm = { amount, utr ->
                scope.launch {
                    busy = true
                    try {
                        bankError = ""
                        val result = api.declareBankContribution(session, amount, utr)
                        bankSheet = false
                        success = result.message to result.amountPaise
                        refresh()
                    } catch (exception: ApiException) {
                        bankError = exception.message.orEmpty()
                    } finally { busy = false }
                }
            }
        )
    }

    if (myYogdaanOpen) {
        MyYogdaanSheet(
            summary = summary,
            projects = projects,
            ledger = ledger,
            onDismiss = { myYogdaanOpen = false }
        )
    }

    allocationProject?.let { project ->
        AllocationSheet(
            project = project,
            walletPaise = summary.walletBalancePaise,
            busy = busy,
            error = allocationError,
            onDismiss = { if (!busy) allocationProject = null },
            onConfirm = { amount ->
                scope.launch {
                    busy = true
                    try {
                        allocationError = ""
                        val result = api.allocate(session, project.id, amount)
                        allocationProject = null
                        success = result.message to result.amountPaise
                        refresh()
                    } catch (exception: ApiException) {
                        allocationError = exception.message.orEmpty().ifBlank { "We could not complete this Yogdaan. Please check the amount and try again." }
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
private fun MyYogdaanSheet(summary: KoshSummary, projects: List<Sankalp>, ledger: List<KoshLedgerEntry>, onDismiss: () -> Unit) {
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    val allocatedPaise = projects.sumOf { it.myAllocatedPaise }
    val addedPaise = ledger.filter { it.type == "contribution" && it.direction == "credit" && it.status == "posted" }.sumOf { it.amountPaise }
    ModalBottomSheet(onDismissRequest = onDismiss, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth().navigationBarsPadding(),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("मेरा योगदान", style = MaterialTheme.typography.headlineSmall)
                Text("Your personal Kosh statement", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    KoshStat("Added", money.format(addedPaise / 100.0))
                    KoshStat("Allocated", money.format(allocatedPaise / 100.0))
                    KoshStat("Available", money.format(summary.walletBalancePaise / 100.0))
                }
            }
            val supported = projects.filter { it.myAllocatedPaise > 0 }
            if (supported.isNotEmpty()) {
                item { Text("संकल्प अनुसार", style = MaterialTheme.typography.titleMedium) }
                items(supported, key = { "project-${it.id}" }) { project ->
                    Card(colors = CardDefaults.cardColors(containerColor = Sage), shape = RoundedCornerShape(8.dp)) {
                        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(project.title, Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                            Text(money.format(project.myAllocatedPaise / 100.0), color = Leaf, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            item { Text("लेन-देन", style = MaterialTheme.typography.titleMedium) }
            if (ledger.isEmpty()) {
                item { Text("Your Kosh activity will appear here after you add or allocate money.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            } else {
                items(ledger, key = { "ledger-${it.id}" }) { entry ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(entry.projectTitle.ifBlank { ledgerTypeLabel(entry.type) }, fontWeight = FontWeight.SemiBold)
                            Text(entry.description.ifBlank { ledgerTypeLabel(entry.type) }, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall, maxLines = 2)
                            if (entry.createdAt.isNotBlank()) Text(entry.createdAt.take(10), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                        }
                        Text(
                            "${if (entry.direction == "credit") "+" else "−"}${money.format(entry.amountPaise / 100.0)}",
                            color = if (entry.direction == "credit") Leaf else Forest,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    HorizontalDivider()
                }
            }
            item { Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) { Text("Done") } }
        }
    }
}

private fun ledgerTypeLabel(type: String) = when (type) {
    "contribution" -> "Kosh added"
    "allocation" -> "Sankalp Yogdaan"
    "refund" -> "Returned to Kosh"
    "reversal" -> "Reversed entry"
    "adjustment" -> "Kosh adjustment"
    else -> "Kosh activity"
}

@Composable
private fun BankContributionSheet(
    config: BankContributionConfig,
    busy: Boolean,
    error: String,
    onDismiss: () -> Unit,
    onConfirm: (Long, String) -> Unit
) {
    val context = LocalContext.current
    var amount by remember { mutableStateOf(config.minimumAmountRupees.toString()) }
    var utr by remember { mutableStateOf("") }
    var review by remember { mutableStateOf(false) }
    var smsNotice by remember { mutableStateOf("") }
    var qrFailed by remember(config.qrImageUrl) { mutableStateOf(false) }
    val parsed = amount.toLongOrNull() ?: 0
    val usableUpiId = config.upiId.takeIf {
        it.contains('@') && !it.contains("YOUR_", ignoreCase = true) && !it.contains("PLACEHOLDER", ignoreCase = true)
    }.orEmpty()
    ModalBottomSheet(onDismissRequest = onDismiss, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .navigationBarsPadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (review) {
                Text("Confirm contribution", style = MaterialTheme.typography.headlineSmall)
                Text("Amount sent", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("₹${NumberFormat.getNumberInstance(Locale("en", "IN")).format(parsed)}", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, color = Forest)
                Text(amountInWords(parsed), color = Leaf, style = MaterialTheme.typography.titleMedium)
                Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = RoundedCornerShape(8.dp)) {
                    Text("I confirm that I sent this amount to the Nyas bank account. It will be visible to the Kosh team for reconciliation.", Modifier.padding(14.dp))
                }
                if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
                if (utr.isNotBlank()) Text("Reference: $utr", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Button(onClick = { onConfirm(parsed, utr) }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(8.dp)) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Confirm and add to Kosh")
                }
                TextButton(onClick = { review = false }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("Change amount") }
            } else {
                Text("कोष में धन जोड़ें", style = MaterialTheme.typography.headlineSmall)
                Text("1. Send money to the family account.  2. Record the same amount here.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (config.qrImageUrl.isNotBlank() && !qrFailed) {
                    AsyncImage(
                        model = config.qrImageUrl,
                        contentDescription = "Payment QR",
                        modifier = Modifier.fillMaxWidth(.78f).height(420.dp).align(Alignment.CenterHorizontally),
                        onError = { qrFailed = true }
                    )
                }
                Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(8.dp)) {
                    Column(Modifier.fillMaxWidth().padding(14.dp)) {
                        Text(config.accountName, fontWeight = FontWeight.Bold)
                        if (config.accountNumber.isNotBlank()) Text("Account: ${config.accountNumber}")
                        if (config.ifsc.isNotBlank()) Text("IFSC: ${config.ifsc}")
                        if (usableUpiId.isNotBlank()) Text("UPI: $usableUpiId")
                    }
                }
                if (usableUpiId.isNotBlank()) OutlinedButton(
                    onClick = {
                        val uri = Uri.parse("upi://pay?pa=${Uri.encode(usableUpiId)}&pn=${Uri.encode(config.accountName)}&am=$parsed&cu=INR&tn=${Uri.encode("Nyas Kul Kosh contribution")}")
                        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                            .onFailure { smsNotice = "No UPI app could open this payment request. Scan the QR or use the bank details below." }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) { Text("Open UPI app") }
                if (usableUpiId.isBlank()) {
                    Text(
                        "Pay using the bank details above. A direct UPI button will appear after the Kosh team configures its verified UPI ID.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    "Enter the amount and bank reference shown by your UPI or banking app. Nyas does not read your personal messages.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (smsNotice.isNotBlank()) {
                    Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = RoundedCornerShape(8.dp)) {
                        Text(smsNotice, Modifier.padding(12.dp), style = MaterialTheme.typography.bodySmall)
                    }
                }
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
                OutlinedTextField(
                    value = utr,
                    onValueChange = { utr = it.filter(Char::isLetterOrDigit).take(40).uppercase() },
                    label = { Text("UTR / transaction reference (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Button(
                    onClick = { review = true },
                    enabled = !busy && config.enabled && parsed >= config.minimumAmountRupees,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(8.dp)
                ) { Text("Review amount") }
                if (!config.enabled) Text("Bank contributions are not enabled for this family yet.", color = MaterialTheme.colorScheme.error)
                Text("The Kosh team will reconcile this with the bank statement.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun AllocationSheet(project: Sankalp, walletPaise: Long, busy: Boolean, error: String, onDismiss: () -> Unit, onConfirm: (Long) -> Unit) {
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
                label = { Text("योगदान राशि") },
                prefix = { Text("₹ ") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Text("Nyas contribution limits and the remaining project need will be applied automatically.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (error.isNotBlank()) {
                Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp)) {
                    Text(error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.fillMaxWidth().padding(12.dp))
                }
            }
            Button(onClick = { review = true }, enabled = !busy && parsed > 0 && parsed * 100 <= walletPaise, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(8.dp)) {
                Text("Review contribution")
            }
        }
    }
    if (review) AmountConfirmation(parsed, "This amount will move from your Kosh to ${project.title}.", busy, error, { review = false }) { onConfirm(parsed) }
}

@Composable
private fun AmountConfirmation(amount: Long, detail: String, busy: Boolean, error: String = "", onDismiss: () -> Unit, onConfirm: () -> Unit) {
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
                if (error.isNotBlank()) {
                    Spacer(Modifier.height(12.dp))
                    Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp)) {
                        Text(error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.fillMaxWidth().padding(12.dp))
                    }
                }
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
