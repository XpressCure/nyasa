@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
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
import com.xpresscure.nyas.data.FamilyMemberProfile
import com.xpresscure.nyas.data.ImmediateFamily
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
internal fun FamilyLinkSheet(
    session: NyasSession,
    current: ImmediateFamily,
    onDismiss: () -> Unit,
    onSaved: (ImmediateFamily) -> Unit
) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var relationship by remember { mutableStateOf("father") }
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<FamilyMemberProfile?>(null) }
    var results by remember { mutableStateOf(emptyList<FamilyMemberProfile>()) }
    var searching by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var gender by remember { mutableStateOf("prefer_not_to_say") }
    var dateOfBirth by remember { mutableStateOf("") }

    LaunchedEffect(query, relationship) {
        selected = null
        if (query.trim().length < 2) { results = emptyList(); return@LaunchedEffect }
        delay(300)
        searching = true
        results = runCatching { api.searchFamilyMembers(session, query) }
            .getOrDefault(emptyList())
            .filter { it.id != session.memberId }
        searching = false
    }

    ModalBottomSheet(onDismissRequest = onDismiss, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 20.dp, end = 20.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Connect immediate family", style = MaterialTheme.typography.headlineSmall)
            Text("Search before adding someone new. This prevents duplicate profiles and joins existing branches of the Kul Map.", color = MaterialTheme.colorScheme.onSurfaceVariant)

            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(listOf("father", "mother", "spouse", "child")) { item ->
                    FilterChip(
                        selected = relationship == item,
                        onClick = { relationship = item; query = ""; results = emptyList() },
                        label = { Text(item.replaceFirstChar(Char::uppercase)) }
                    )
                }
            }

            currentRelation(current, relationship)?.let { linked ->
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.CheckCircle, null, tint = Leaf)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Currently linked", style = MaterialTheme.typography.labelLarge)
                            Text(linked.displayName, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search by name or place") },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                trailingIcon = { if (searching) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) },
                singleLine = true
            )

            if (results.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Choose an existing family member", style = MaterialTheme.typography.labelLarge)
                    results.take(5).forEach { member ->
                        Surface(
                            onClick = { selected = member; query = member.displayName },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            color = if (selected?.id == member.id) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                MemberAvatar(member, session, 40)
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(member.displayName, fontWeight = FontWeight.SemiBold)
                                    Text(member.city.ifBlank { member.placeOfResidence }.ifBlank { "Family member" }, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                                if (selected?.id == member.id) Icon(Icons.Outlined.CheckCircle, null, tint = Leaf)
                            }
                        }
                    }
                }
            }

            if (query.trim().length >= 2 && selected == null && !searching) {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.PersonAdd, null, tint = Gold)
                            Spacer(Modifier.width(8.dp))
                            Text("Add \"${query.trim()}\" as a new profile", fontWeight = FontWeight.SemiBold)
                        }
                        Text("Gender", style = MaterialTheme.typography.labelLarge)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("male" to "Male", "female" to "Female", "prefer_not_to_say" to "Not set").forEach { option ->
                                FilterChip(selected = gender == option.first, onClick = { gender = option.first }, label = { Text(option.second) })
                            }
                        }
                        OutlinedTextField(dateOfBirth, { dateOfBirth = it.take(10) }, Modifier.fillMaxWidth(), label = { Text("Date of birth (optional, YYYY-MM-DD)") }, singleLine = true)
                    }
                }
            }

            if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)

            Button(
                onClick = {
                    scope.launch {
                        saving = true
                        error = ""
                        try {
                            val saved = api.saveImmediateRelative(
                                session = session,
                                relationship = relationship,
                                displayName = selected?.displayName ?: query,
                                existingMemberId = selected?.id.orEmpty(),
                                gender = selected?.gender ?: defaultGender(relationship, gender),
                                dateOfBirth = selected?.dateOfBirth.orEmpty().ifBlank { dateOfBirth }
                            )
                            onSaved(saved)
                        } catch (e: ApiException) { error = e.message ?: "Could not save this relationship." }
                        saving = false
                    }
                },
                enabled = !saving && (selected != null || query.trim().length >= 2),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                else Text(if (selected != null) "Link existing profile" else "Add and connect")
            }
            TextButton(onClick = onDismiss, Modifier.fillMaxWidth()) { Text("Cancel") }
        }
    }
}

private fun currentRelation(family: ImmediateFamily, relationship: String): FamilyMemberProfile? = when (relationship) {
    "father" -> family.father
    "mother" -> family.mother
    "spouse" -> family.spouse
    else -> null
}

private fun defaultGender(relationship: String, selected: String): String = when (relationship) {
    "father" -> "male"
    "mother" -> "female"
    else -> selected
}
