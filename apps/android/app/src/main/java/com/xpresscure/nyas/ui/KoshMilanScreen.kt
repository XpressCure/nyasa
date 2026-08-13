@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.SyncAlt
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.KoshDeclaration
import com.xpresscure.nyas.data.KoshReconciliation
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.ui.theme.Forest
import com.xpresscure.nyas.ui.theme.Gold
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@Composable
fun KoshMilanScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    var data by remember { mutableStateOf(KoshReconciliation()) }
    var loading by remember { mutableStateOf(true) }
    var busyId by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var actualBalance by remember { mutableStateOf("") }
    var snapshotNote by remember { mutableStateOf("") }

    fun load() {
        scope.launch {
            loading = true
            error = ""
            try {
                data = api.koshReconciliation(session)
                if (actualBalance.isBlank()) actualBalance = data.latest?.actualBankBalanceRupees?.toString().orEmpty()
            } catch (exception: ApiException) {
                error = exception.message.orEmpty()
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(session.familyId) { load() }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Bank and Nyas, in agreement", style = MaterialTheme.typography.titleLarge)
                    Text("Match member declarations with the family bank statement.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = { load() }) { Icon(Icons.Outlined.Refresh, "Refresh") }
            }
        }
        if (loading) item { CircularProgressIndicator(color = Gold) }
        if (error.isNotBlank()) item { StatusMessage(error, true) }
        if (notice.isNotBlank()) item { StatusMessage(notice, false) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MilanMetric("Nyas expected", money.format(data.currentExpectedBankBalanceRupees), Modifier.weight(1f))
                MilanMetric("Last bank balance", money.format(data.latest?.actualBankBalanceRupees ?: 0), Modifier.weight(1f))
            }
        }
        item {
            val latest = data.latest
            val difference = latest?.differenceRupees ?: 0
            Card(
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (latest == null || difference == 0L) Color(0xFFE3F2E8) else MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (latest == null || difference == 0L) Icons.Outlined.CheckCircle else Icons.Outlined.SyncAlt, null)
                    Spacer(Modifier.padding(5.dp))
                    Column {
                        Text(
                            when {
                                latest == null -> "Bank snapshot needed"
                                difference == 0L -> "Balances match"
                                else -> "Difference to investigate"
                            },
                            fontWeight = FontWeight.Bold
                        )
                        Text(if (latest == null) "Enter the current bank balance below." else money.format(difference))
                    }
                }
            }
        }
        item {
            Card(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Record bank balance", style = MaterialTheme.typography.titleMedium)
                    OutlinedTextField(
                        value = actualBalance,
                        onValueChange = { actualBalance = it.filter(Char::isDigit).take(12) },
                        label = { Text("Actual bank balance") },
                        prefix = { Text("₹ ") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = snapshotNote,
                        onValueChange = { snapshotNote = it.take(300) },
                        label = { Text("Statement note (optional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = {
                            scope.launch {
                                busyId = "snapshot"
                                try {
                                    notice = api.recordKoshSnapshot(session, actualBalance.toLongOrNull() ?: 0, snapshotNote).message
                                    snapshotNote = ""
                                    load()
                                } catch (exception: ApiException) {
                                    error = exception.message.orEmpty()
                                } finally { busyId = "" }
                            }
                        },
                        enabled = actualBalance.isNotBlank() && busyId.isBlank(),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        if (busyId == "snapshot") CircularProgressIndicator(strokeWidth = 2.dp)
                        else Text("Save balance snapshot")
                    }
                }
            }
        }
        item {
            HorizontalDivider()
            Text("Member declarations", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 10.dp))
            Text("Confirm the amount found in the bank. Any difference adjusts the member's Kosh automatically.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (!loading && data.declarations.isEmpty()) item {
            Text("No member declarations are waiting in this Kosh.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(data.declarations, key = { it.id }) { declaration ->
            KoshDeclarationCard(
                declaration = declaration,
                money = money,
                busy = busyId == declaration.id,
                onConfirm = { amount, utr, note ->
                    scope.launch {
                        busyId = declaration.id
                        try {
                            notice = api.reconcileKoshDeclaration(session, declaration.id, amount, utr, note).message
                            load()
                        } catch (exception: ApiException) {
                            error = exception.message.orEmpty()
                        } finally { busyId = "" }
                    }
                }
            )
        }
    }
}

@Composable
private fun KoshDeclarationCard(
    declaration: KoshDeclaration,
    money: NumberFormat,
    busy: Boolean,
    onConfirm: (Long, String, String) -> Unit
) {
    var amount by remember(declaration.id, declaration.confirmedAmountRupees) {
        mutableStateOf((declaration.confirmedAmountRupees ?: declaration.declaredAmountRupees).toString())
    }
    var utr by remember(declaration.id, declaration.utr) { mutableStateOf(declaration.utr) }
    var note by remember(declaration.id, declaration.reconciliationNote) { mutableStateOf(declaration.reconciliationNote) }
    Card(shape = RoundedCornerShape(8.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row {
                Column(Modifier.weight(1f)) {
                    Text(declaration.memberName.ifBlank { "Sadasya" }, style = MaterialTheme.typography.titleMedium)
                    Text(declaration.paidAt.take(16).replace('T', ' '), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
                    Text(declaration.reconciliationStatus.replace('_', ' '), Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                }
            }
            Text("Declared ${money.format(declaration.declaredAmountRupees)}", fontWeight = FontWeight.Bold)
            Text(declaration.utr.ifBlank { declaration.paymentReference }, color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it.filter(Char::isDigit).take(12) },
                label = { Text("Amount found in bank") },
                prefix = { Text("₹ ") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = utr,
                onValueChange = { utr = it.filter(Char::isLetterOrDigit).take(40).uppercase() },
                label = { Text("Confirmed UTR") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = note,
                onValueChange = { note = it.take(500) },
                label = { Text("Reconciliation note") },
                modifier = Modifier.fillMaxWidth()
            )
            Button(
                onClick = { onConfirm(amount.toLongOrNull() ?: 0, utr, note) },
                enabled = !busy && amount.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (busy) CircularProgressIndicator(strokeWidth = 2.dp) else Text("Confirm bank amount")
            }
        }
    }
}

@Composable
private fun MilanMetric(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(8.dp)) {
        Column(Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun StatusMessage(message: String, error: Boolean) {
    Card(colors = CardDefaults.cardColors(containerColor = if (error) MaterialTheme.colorScheme.errorContainer else Color(0xFFE3F2E8))) {
        Text(message, Modifier.fillMaxWidth().padding(14.dp))
    }
}
