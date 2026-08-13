@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import kotlinx.coroutines.launch

@Composable
internal fun SankalpCreateSheet(session: NyasSession, onDismiss: () -> Unit, onCreated: () -> Unit) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf("") }
    var purpose by remember { mutableStateOf("") }
    var rules by remember { mutableStateOf("") }
    var budgetRequired by remember { mutableStateOf(true) }
    var budget by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    fun save(publish: Boolean) {
        if (title.trim().length < 2 || purpose.trim().length < 2) {
            error = "Add a clear title and purpose before saving."
            return
        }
        scope.launch {
            saving = true
            error = ""
            try {
                api.createSankalp(session, title, purpose, rules, budgetRequired, budget.toLongOrNull() ?: 0, publish)
                onCreated()
            } catch (exception: ApiException) {
                error = exception.message.orEmpty()
            } finally {
                saving = false
            }
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp).imePadding().navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("New Sankalp", style = MaterialTheme.typography.headlineSmall)
            Text("Start with the purpose. The team, estimate and milestones can be completed next.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(title, { title = it }, Modifier.fillMaxWidth(), label = { Text("Sankalp title") }, singleLine = true)
            OutlinedTextField(purpose, { purpose = it }, Modifier.fillMaxWidth(), label = { Text("Purpose") }, minLines = 3)
            OutlinedTextField(rules, { rules = it }, Modifier.fillMaxWidth(), label = { Text("Rules and scope (optional)") }, minLines = 3)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(budgetRequired, { budgetRequired = it })
                Text("This Sankalp needs a budget")
            }
            if (budgetRequired) OutlinedTextField(
                budget,
                { budget = it.filter(Char::isDigit) },
                Modifier.fillMaxWidth(),
                label = { Text("Tentative budget") },
                prefix = { Text("₹ ") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true
            )
            if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { save(false) }, enabled = !saving, modifier = Modifier.weight(1f)) { Text("Save draft") }
                Button(onClick = { save(true) }, enabled = !saving, modifier = Modifier.weight(1f)) { Text("Publish") }
            }
        }
    }
}
