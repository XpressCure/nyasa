@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.HowToVote
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.ThumbDown
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.ProposalList
import com.xpresscure.nyas.data.SankalpProposal
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@Composable
internal fun SabhaScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf(ProposalList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var creating by remember { mutableStateOf(false) }
    var voteTarget by remember { mutableStateOf<Pair<SankalpProposal, String>?>(null) }

    fun refresh() {
        scope.launch {
            loading = true
            error = ""
            try { data = api.proposals(session) } catch (e: Exception) { error = e.message ?: "Could not load Sankalp Sabha." }
            loading = false
        }
    }
    LaunchedEffect(session.familyId) { refresh() }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Sankalp Sabha", style = MaterialTheme.typography.headlineSmall)
                        Text("Ideas become shared decisions through one vote per eligible member", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = ::refresh) { Icon(Icons.Outlined.Refresh, "Refresh proposals") }
                }
            }
            if (!data.canVote && !loading) item {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text("Voting is available to living family members aged 15 and above.", Modifier.fillMaxWidth().padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (message.isNotBlank()) item {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
                    Text(message, Modifier.fillMaxWidth().padding(14.dp), color = Leaf)
                }
            }
            if (loading) item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            if (error.isNotBlank()) item {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.errorContainer) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(error, Modifier.weight(1f), color = MaterialTheme.colorScheme.onErrorContainer)
                        TextButton(onClick = ::refresh) { Text("Try again") }
                    }
                }
            }
            if (!loading && data.proposals.isEmpty() && error.isBlank()) item {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Outlined.HowToVote, null, Modifier.size(42.dp), tint = Gold)
                        Spacer(Modifier.height(10.dp))
                        Text("No proposals are open", style = MaterialTheme.typography.titleMedium)
                        Text("Share an idea the family can consider together.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            items(data.proposals, key = { it.id }) { proposal ->
                ProposalCard(proposal, canVote = data.canVote, onVote = { vote -> voteTarget = proposal to vote })
            }
        }
        FloatingActionButton(onClick = { creating = true }, Modifier.align(Alignment.BottomEnd).padding(20.dp), containerColor = Gold) {
            Icon(Icons.Outlined.Add, "Propose a Sankalp")
        }
    }

    if (creating) CreateProposalDialog(
        busy = loading,
        onDismiss = { creating = false },
        onSubmit = { title, description, category, impact, budget ->
            scope.launch {
                loading = true
                try {
                    api.createProposal(session, title, description, category, impact, budget)
                    creating = false
                    message = "Your Sankalp is now open for family voting."
                    data = api.proposals(session)
                } catch (e: ApiException) { error = e.message ?: "Could not create the proposal." }
                loading = false
            }
        }
    )

    voteTarget?.let { (proposal, vote) ->
        AlertDialog(
            onDismissRequest = { voteTarget = null },
            icon = { Icon(if (vote == "up") Icons.Outlined.ThumbUp else Icons.Outlined.ThumbDown, null) },
            title = { Text(if (vote == "up") "Support this Sankalp?" else "Do not support this Sankalp?") },
            text = { Text("Your vote for “${proposal.title}” can be submitted only once.") },
            confirmButton = {
                Button(onClick = {
                    voteTarget = null
                    scope.launch {
                        loading = true
                        try {
                            api.voteProposal(session, proposal.id, vote)
                            message = "Your vote has been recorded."
                            data = api.proposals(session)
                        } catch (e: ApiException) { error = e.message ?: "Could not record your vote." }
                        loading = false
                    }
                }) { Text("Confirm vote") }
            },
            dismissButton = { TextButton(onClick = { voteTarget = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun ProposalCard(proposal: SankalpProposal, canVote: Boolean, onVote: (String) -> Unit) {
    val currency = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    Card(shape = RoundedCornerShape(8.dp), elevation = CardDefaults.cardElevation(1.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text(proposal.title, style = MaterialTheme.typography.titleMedium)
                    Text(proposal.category.replace('_', ' ').replaceFirstChar(Char::uppercase), color = Leaf, style = MaterialTheme.typography.labelLarge)
                }
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                    Text("${proposal.votes.score}", Modifier.padding(horizontal = 12.dp, vertical = 7.dp), fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(proposal.description, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 4, overflow = TextOverflow.Ellipsis)
            if (proposal.expectedImpact.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text("Expected impact", style = MaterialTheme.typography.labelLarge)
                Text(proposal.expectedImpact, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
            }
            if (proposal.tentativeBudgetPaise > 0) {
                Spacer(Modifier.height(8.dp))
                Text("Tentative budget ${currency.format(proposal.tentativeBudgetPaise / 100.0)}", style = MaterialTheme.typography.labelLarge)
            }
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${proposal.votes.total} votes", Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (proposal.votes.myVote.isNotBlank()) {
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                        Text(if (proposal.votes.myVote == "up") "You supported" else "You opposed", Modifier.padding(horizontal = 12.dp, vertical = 7.dp), color = Leaf)
                    }
                } else if (canVote && proposal.status == "voting") {
                    OutlinedButton(onClick = { onVote("down") }) { Icon(Icons.Outlined.ThumbDown, "Vote down"); Spacer(Modifier.width(5.dp)); Text(proposal.votes.down.toString()) }
                    Spacer(Modifier.width(8.dp))
                    Button(onClick = { onVote("up") }) { Icon(Icons.Outlined.ThumbUp, "Vote up"); Spacer(Modifier.width(5.dp)); Text(proposal.votes.up.toString()) }
                }
            }
        }
    }
}

@Composable
private fun CreateProposalDialog(
    busy: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String, String, String, String, Long) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("community") }
    var impact by remember { mutableStateOf("") }
    var budget by remember { mutableStateOf("") }
    val valid = title.trim().length >= 3 && description.trim().length >= 10

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Propose a Sankalp") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { OutlinedTextField(title, { title = it }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
                item { OutlinedTextField(description, { description = it }, label = { Text("What should the family do?") }, minLines = 3, modifier = Modifier.fillMaxWidth()) }
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(listOf("community", "renovation", "education", "health", "research", "business_study", "other")) { item ->
                            FilterChip(selected = category == item, onClick = { category = item }, label = { Text(item.replace('_', ' ').replaceFirstChar(Char::uppercase)) })
                        }
                    }
                }
                item { OutlinedTextField(impact, { impact = it }, label = { Text("Expected impact (optional)") }, minLines = 2, modifier = Modifier.fillMaxWidth()) }
                item { OutlinedTextField(budget, { budget = it.filter(Char::isDigit) }, label = { Text("Tentative budget (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
            }
        },
        confirmButton = { TextButton(enabled = valid && !busy, onClick = { onSubmit(title, description, category, impact, budget.toLongOrNull() ?: 0) }) { Text("Open for voting") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
