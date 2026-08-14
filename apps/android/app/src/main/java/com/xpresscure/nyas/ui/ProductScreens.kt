@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Landscape
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.FamilyMembership
import com.xpresscure.nyas.data.FamilyMoment
import com.xpresscure.nyas.data.FinancialAccountOverview
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.RuralAsset
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import java.time.LocalDate

@Composable
private fun ProductIntro(title: String, subtitle: String, icon: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        icon(); Spacer(Modifier.padding(6.dp)); Column { Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold); Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
internal fun FamilySpacesScreen(session: NyasSession, onSelect: (FamilyMembership) -> Unit) {
    val api = remember { NyasApi() }; val scope = rememberCoroutineScope(); var spaces by remember { mutableStateOf(emptyList<FamilyMembership>()) }; var name by remember { mutableStateOf("") }; var location by remember { mutableStateOf("") }; var message by remember { mutableStateOf("") }
    fun load() { scope.launch { runCatching { api.familyMemberships(session) }.onSuccess { spaces = it }.onFailure { message = it.message.orEmpty() } } }
    LaunchedEffect(session.familyId) { load() }
    LazyColumn(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { ProductIntro("Family spaces", "One identity, separately protected families") { Icon(Icons.Outlined.Lock, null) } }
        items(spaces, key = { it.membershipId }) { item -> Card(colors = CardDefaults.cardColors(containerColor = if (item.familyId == session.familyId) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) { Column(Modifier.fillMaxWidth().padding(16.dp)) { Text(item.familyName, style = MaterialTheme.typography.titleMedium); Text(item.role.replace('_',' ')); TextButton(onClick = { onSelect(item) }) { Text(if (item.familyId == session.familyId) "Current family" else "Switch to this family") } } } }
        item { HorizontalDivider(); Text("Create a new private family", style = MaterialTheme.typography.titleMedium); OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("Family name") }); OutlinedTextField(location, { location = it }, Modifier.fillMaxWidth(), label = { Text("Primary location") }); Button(onClick = { scope.launch { runCatching { api.createFamily(session, name, location) }.onSuccess { name = ""; location = ""; spaces = spaces + it; onSelect(it) }.onFailure { message = it.message.orEmpty() } } }, enabled = name.length >= 2) { Icon(Icons.Outlined.Add, null); Text("Create family") }; if (message.isNotBlank()) Text(message, color = MaterialTheme.colorScheme.error) }
    }
}

@Composable
internal fun AssetsScreen(session: NyasSession) {
    val api=remember{NyasApi()};val scope=rememberCoroutineScope();val uri=LocalUriHandler.current;var rows by remember{mutableStateOf(emptyList<RuralAsset>())};var adding by remember{mutableStateOf(false)};var title by remember{mutableStateOf("")};var state by remember{mutableStateOf("")};var village by remember{mutableStateOf("")};var landId by remember{mutableStateOf("")};var portal by remember{mutableStateOf("")};var message by remember{mutableStateOf("")}
    fun load(){scope.launch{runCatching{api.ruralAssets(session)}.onSuccess{rows=it}.onFailure{message=it.message.orEmpty()}}};LaunchedEffect(session.familyId){load()}
    LazyColumn(Modifier.fillMaxSize().padding(18.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{ProductIntro("Virasat Assets","Rural land, houses and official-check history"){Icon(Icons.Outlined.Landscape,null)};Button(onClick={adding=!adding}){Icon(Icons.Outlined.Add,null);Text("Add asset")}}
        if(adding)item{Card{Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){OutlinedTextField(title,{title=it},Modifier.fillMaxWidth(),label={Text("Asset name")});OutlinedTextField(state,{state=it},Modifier.fillMaxWidth(),label={Text("State")});OutlinedTextField(village,{village=it},Modifier.fillMaxWidth(),label={Text("Village")});OutlinedTextField(landId,{landId=it},Modifier.fillMaxWidth(),label={Text("Khasra / survey number")});OutlinedTextField(portal,{portal=it},Modifier.fillMaxWidth(),label={Text("Official portal URL")});Button(onClick={scope.launch{runCatching{api.addRuralAsset(session,title,"agricultural_land",state,village,landId,portal)}.onSuccess{adding=false;title="";load()}.onFailure{message=it.message.orEmpty()}}},enabled=title.length>=2){Text("Save as family declared")}}}}
        items(rows,key={it.id}){asset->Card{Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Text(asset.title,style=MaterialTheme.typography.titleMedium);Text(asset.location.ifBlank{"Location not recorded"});Text("${asset.assetType.replace('_',' ')} • ${asset.verificationStatus.replace('_',' ')}",color=MaterialTheme.colorScheme.primary);if(asset.landIdentifier.isNotBlank())Text("Land ID: ${asset.landIdentifier}");if(asset.officialPortalUrl.isNotBlank())TextButton(onClick={uri.openUri(asset.officialPortalUrl)}){Icon(Icons.Outlined.OpenInNew,null);Text("Open official portal")}}}}
        if(message.isNotBlank())item{Text(message,color=MaterialTheme.colorScheme.error)}
    }
}

@Composable
internal fun MomentsScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var rows by remember { mutableStateOf(emptyList<FamilyMoment>()) }
    var adding by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var story by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var selectedPhoto by remember { mutableStateOf<Uri?>(null) }
    var photoBytes by remember { mutableStateOf<Map<String, ByteArray>>(emptyMap()) }
    var private by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { selectedPhoto = it }
    fun load() { scope.launch { runCatching { api.moments(session) }.onSuccess { rows = it }.onFailure { message = it.message.orEmpty() } } }
    LaunchedEffect(session.familyId) { load() }
    LaunchedEffect(rows) {
        rows.filter { it.photoDocumentId.isNotBlank() }.forEach { moment ->
            if (!photoBytes.containsKey(moment.id)) runCatching { api.momentPhoto(session, moment.id, moment.photoDocumentId) }
                .onSuccess { bytes -> photoBytes = photoBytes + (moment.id to bytes) }
        }
    }
    LazyColumn(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            ProductIntro("Moments", "A private timeline for the whole family") { Icon(Icons.Outlined.CameraAlt, null) }
            Button(onClick = { adding = !adding }) { Icon(Icons.Outlined.Add, null); Text("Capture") }
        }
        if (adding) item {
            Card { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(title, { title = it }, Modifier.fillMaxWidth(), label = { Text("Moment title") })
                OutlinedTextField(story, { story = it }, Modifier.fillMaxWidth(), label = { Text("Story") }, minLines = 3)
                OutlinedTextField(location, { location = it }, Modifier.fillMaxWidth(), label = { Text("Location") })
                Button(onClick = { photoPicker.launch("image/*") }) { Icon(Icons.Outlined.CameraAlt, null); Text(if (selectedPhoto == null) "Choose photograph" else "Photograph selected") }
                Row(verticalAlignment = Alignment.CenterVertically) { Switch(private, { private = it }); Text("Only me", Modifier.padding(start = 8.dp)) }
                Button(onClick = {
                    scope.launch {
                        runCatching {
                            val created = api.addMoment(session, title, story, LocalDate.now().toString(), location, "", private)
                            selectedPhoto?.let { uri ->
                                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: error("Could not read photograph")
                                require(bytes.size <= 8 * 1024 * 1024) { "Photograph must be 8 MB or smaller" }
                                api.uploadMomentPhoto(session, created.id, "moment-${System.currentTimeMillis()}.jpg", context.contentResolver.getType(uri) ?: "image/jpeg", bytes)
                            }
                        }.onSuccess { adding = false; title = ""; story = ""; selectedPhoto = null; load() }.onFailure { message = it.message.orEmpty() }
                    }
                }, enabled = title.length >= 2) { Text("Share moment") }
            } }
        }
        items(rows, key = { it.id }) { moment ->
            Card {
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    val photoSource: Any? = when {
                        photoBytes[moment.id]?.isNotEmpty() == true -> photoBytes[moment.id]
                        moment.photoUrl.isNotBlank() -> moment.photoUrl
                        else -> null
                    }
                    photoSource?.let { AsyncImage(model = it, contentDescription = moment.title, modifier = Modifier.fillMaxWidth().height(220.dp), contentScale = ContentScale.Crop) }
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(moment.title, style = MaterialTheme.typography.titleMedium)
                        Text(moment.eventDate.take(10) + (if (moment.location.isNotBlank()) " • ${moment.location}" else ""))
                        if (moment.story.isNotBlank()) Text(moment.story)
                        Text(moment.visibility.replace('_', ' '), color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
        if (message.isNotBlank()) item { Text(message, color = MaterialTheme.colorScheme.error) }
    }
}

@Composable
internal fun FinancialAccountsScreen(session: NyasSession) {
    val api=remember{NyasApi()};val scope=rememberCoroutineScope();var rows by remember{mutableStateOf(emptyList<FinancialAccountOverview>())};var adding by remember{mutableStateOf(false)};var show by remember{mutableStateOf(false)};var nickname by remember{mutableStateOf("")};var bank by remember{mutableStateOf("")};var last4 by remember{mutableStateOf("")};var balance by remember{mutableStateOf("")};var share by remember{mutableStateOf(false)};var message by remember{mutableStateOf("")}
    fun load(){scope.launch{runCatching{api.financialAccounts(session)}.onSuccess{rows=it}.onFailure{message=it.message.orEmpty()}}};LaunchedEffect(session.familyId){load()}
    LazyColumn(Modifier.fillMaxSize().padding(18.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{ProductIntro("My finances","Private account map; no passwords or PINs"){Icon(Icons.Outlined.AccountBalance,null)};Row(verticalAlignment=Alignment.CenterVertically){Button(onClick={adding=!adding}){Icon(Icons.Outlined.Add,null);Text("Add account")};TextButton(onClick={show=!show}){Text(if(show)"Hide balances" else "Show balances")}};Card(colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.secondaryContainer)){Text("Live bank connections will use an RBI-regulated Account Aggregator and explicit consent. Nyas never screen-scrapes banking credentials.",Modifier.padding(14.dp))}}
        if(adding)item{Card{Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){OutlinedTextField(nickname,{nickname=it},Modifier.fillMaxWidth(),label={Text("Account nickname")});OutlinedTextField(bank,{bank=it},Modifier.fillMaxWidth(),label={Text("Bank / institution")});OutlinedTextField(last4,{last4=it.take(4).filter(Char::isDigit)},Modifier.fillMaxWidth(),label={Text("Last four digits")},keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Number));OutlinedTextField(balance,{balance=it},Modifier.fillMaxWidth(),label={Text("Balance (optional)")},keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Decimal));Row(verticalAlignment=Alignment.CenterVertically){Checkbox(share,{share=it});Text("Share balance summary with family")};Button(onClick={scope.launch{runCatching{api.addFinancialAccount(session,nickname,bank,"savings",last4,balance,share)}.onSuccess{adding=false;nickname="";bank="";load()}.onFailure{message=it.message.orEmpty()}}},enabled=nickname.length>=2&&bank.length>=2){Text("Save private account")}}}}
        items(rows,key={it.id}){account->Card{Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(4.dp)){Text(account.nickname,style=MaterialTheme.typography.titleMedium);Text("${account.institutionName} • ${account.accountType}");Text(if(show&&account.balancePaise!=null)"₹%,.2f".format(account.balancePaise/100.0) else "₹ ••••••",style=MaterialTheme.typography.headlineSmall);Text(if(account.maskedNumber.isBlank())"No account number stored" else "Ending ${account.maskedNumber}");Text(account.sharingScope.replace('_',' '),color=MaterialTheme.colorScheme.primary)}}}
        if(message.isNotBlank())item{Text(message,color=MaterialTheme.colorScheme.error)}
    }
}
