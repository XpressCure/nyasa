package com.xpresscure.nyas.ui

import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.FamilyRestroom
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.EducationEntry
import com.xpresscure.nyas.data.FamilyMemberProfile
import com.xpresscure.nyas.data.ImmediateFamily
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.ProfileUpdate
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

@Composable
fun ParichayScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var profile by remember { mutableStateOf<FamilyMemberProfile?>(null) }
    var family by remember { mutableStateOf(ImmediateFamily()) }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var success by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf(false) }
    var managingFamily by remember { mutableStateOf(false) }
    var form by remember { mutableStateOf(ProfileForm()) }

    fun load() {
        scope.launch {
            loading = true; error = ""
            try {
                val profileRequest = async { api.myProfile(session) }
                val familyRequest = async { api.immediateFamily(session) }
                profile = profileRequest.await().also { form = ProfileForm.from(it) }
                family = familyRequest.await()
            } catch (exception: ApiException) { error = exception.message.orEmpty() }
            finally { loading = false }
        }
    }
    LaunchedEffect(session.familyId) { load() }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null || profile == null) return@rememberLauncherForActivityResult
        scope.launch {
            saving = true; error = ""; success = ""
            try {
                val mime = context.contentResolver.getType(uri).orEmpty()
                if (mime !in setOf("image/jpeg", "image/png", "image/webp")) throw IllegalArgumentException("Choose a JPG, PNG or WebP photo.")
                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: throw IllegalArgumentException("The photo could not be read.")
                if (bytes.size > 5 * 1024 * 1024) throw IllegalArgumentException("Keep the photo under 5 MB.")
                var name = "parichay-photo.${mime.substringAfter('/')}"
                context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) name = cursor.getString(0) ?: name
                }
                profile = api.uploadProfilePhoto(session, profile!!.id, name, mime, bytes)
                success = "Profile photo updated."
            } catch (exception: Exception) { error = exception.message ?: "The photo could not be saved." }
            finally { saving = false }
        }
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Your profile", style = MaterialTheme.typography.headlineSmall); Text("Keep your family information accurate", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                IconButton(onClick = { load() }) { Icon(Icons.Outlined.Refresh, "Refresh") }
            }
        }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = Gold) }
        if (error.isNotBlank()) item { MessageCard(error, true) }
        if (success.isNotBlank()) item { MessageCard(success, false) }
        profile?.let { member ->
            item {
                Card(shape = RoundedCornerShape(8.dp), elevation = CardDefaults.cardElevation(1.dp)) {
                    Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                        MemberAvatar(member, session, 76); Spacer(Modifier.size(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(member.displayName, style = MaterialTheme.typography.titleLarge)
                            Text(session.phone.ifBlank { "Add phone number" }, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(member.profession.ifBlank { member.work.currentRole }.ifBlank { "Add occupation" }, color = Leaf)
                        }
                        IconButton(onClick = { photoPicker.launch("image/*") }, enabled = !saving) { Icon(Icons.Outlined.CameraAlt, "Change photo") }
                    }
                }
            }
            item {
                val completion = profileCompletion(member)
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer), shape = RoundedCornerShape(8.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        Row { Text("Profile $completion% complete", fontWeight = FontWeight.Bold); Spacer(Modifier.weight(1f)); Text(if (completion >= 80) "Looking good" else "Add a little more", color = Leaf) }
                        Spacer(Modifier.height(10.dp)); LinearProgressIndicator(progress = { completion / 100f }, modifier = Modifier.fillMaxWidth().height(8.dp), color = Gold)
                    }
                }
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Personal details", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    TextButton(onClick = { editing = !editing }) { Icon(Icons.Outlined.Edit, null); Spacer(Modifier.size(6.dp)); Text(if (editing) "Cancel" else "Edit") }
                }
            }
            item {
                if (editing) ProfileEditor(form, { form = it }, saving) {
                    scope.launch {
                        saving = true; error = ""; success = ""
                        try {
                            profile = api.updateMyProfile(session, form.toUpdate())
                            success = "Your profile has been saved."
                            editing = false
                        } catch (exception: ApiException) { error = exception.message.orEmpty() }
                        finally { saving = false }
                    }
                } else ProfileSummary(member)
            }
            item {
                HorizontalDivider(); Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.FamilyRestroom, null, tint = Gold); Spacer(Modifier.size(10.dp)); Text("Immediate family", style = MaterialTheme.typography.titleLarge) }
            }
            item { ImmediateFamilyStrip(family, session) }
            item {
                Button(onClick = { managingFamily = true }, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(8.dp)) { Text("Manage immediate family") }
            }
        }
    }

    if (managingFamily) FamilyLinkSheet(
        session = session,
        current = family,
        onDismiss = { managingFamily = false },
        onSaved = {
            family = it
            managingFamily = false
            success = "Family relationship saved."
        }
    )
}

private data class ProfileForm(
    val displayName: String = "", val gender: String = "prefer_not_to_say", val dateOfBirth: String = "", val livingStatus: String = "living",
    val maritalStatus: String = "unknown", val anniversaryDate: String = "", val placeOfResidence: String = "", val city: String = "",
    val state: String = "", val country: String = "India", val profession: String = "", val bio: String = "", val currentPlace: String = "",
    val currentRole: String = "", val previousPlaces: String = "", val experienceYears: String = "",
    val intermediateInstitution: String = "", val intermediateDegree: String = "", val intermediateYear: String = "",
    val graduationInstitution: String = "", val graduationDegree: String = "", val graduationYear: String = "",
    val postGraduationInstitution: String = "", val postGraduationDegree: String = "", val postGraduationYear: String = "",
    val bloodGroup: String = "", val knownConditions: String = "", val allergies: String = "", val geneticNotes: String = ""
) {
    fun toUpdate() = ProfileUpdate(
        displayName, gender, dateOfBirth, livingStatus, maritalStatus, anniversaryDate,
        placeOfResidence, city, state, country, profession, bio, currentPlace, currentRole,
        previousPlaces, experienceYears.toIntOrNull(),
        EducationEntry(intermediateInstitution, intermediateDegree, intermediateYear.toIntOrNull()),
        EducationEntry(graduationInstitution, graduationDegree, graduationYear.toIntOrNull()),
        EducationEntry(postGraduationInstitution, postGraduationDegree, postGraduationYear.toIntOrNull()),
        bloodGroup, commaList(knownConditions), commaList(allergies), geneticNotes
    )

    companion object {
        fun from(member: FamilyMemberProfile) = ProfileForm(
            member.displayName, member.gender, member.dateOfBirth.take(10), member.livingStatus,
            member.maritalStatus, member.anniversaryDate.take(10), member.placeOfResidence, member.city,
            member.state, member.country.ifBlank { "India" }, member.profession, member.bio,
            member.work.currentPlace, member.work.currentRole, member.work.previousPlaces,
            member.work.experienceYears?.toString().orEmpty(), member.intermediate.institution,
            member.intermediate.degree, member.intermediate.year?.toString().orEmpty(),
            member.graduation.institution, member.graduation.degree, member.graduation.year?.toString().orEmpty(),
            member.postGraduation.institution, member.postGraduation.degree,
            member.postGraduation.year?.toString().orEmpty(), member.health.bloodGroup,
            member.health.knownConditions.joinToString(", "), member.health.allergies.joinToString(", "),
            member.health.geneticNotes
        )
    }
}

@Composable
private fun ProfileEditor(form: ProfileForm, onChange: (ProfileForm) -> Unit, saving: Boolean, onSave: () -> Unit) {
    var moreDetails by remember { mutableStateOf(false) }
    Card(shape = RoundedCornerShape(8.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ProfileField("Full name", form.displayName) { onChange(form.copy(displayName = it)) }
            Text("Gender", style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("male" to "Male", "female" to "Female", "prefer_not_to_say" to "Other").forEach { option -> AssistChip(onClick = { onChange(form.copy(gender = option.first)) }, label = { Text(option.second, fontWeight = if (form.gender == option.first) FontWeight.Bold else FontWeight.Normal) }) }
            }
            ProfileField("Date of birth (YYYY-MM-DD)", form.dateOfBirth) { onChange(form.copy(dateOfBirth = it.take(10))) }
            Text("Marital status", style = MaterialTheme.typography.labelLarge)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(listOf("single" to "Single", "married" to "Married", "widowed" to "Widowed", "unknown" to "Not set")) { option ->
                    AssistChip(
                        onClick = { onChange(form.copy(maritalStatus = option.first)) },
                        label = { Text(option.second, fontWeight = if (form.maritalStatus == option.first) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }
            if (form.maritalStatus == "married") {
                ProfileField("Anniversary (YYYY-MM-DD)", form.anniversaryDate) { onChange(form.copy(anniversaryDate = it.take(10))) }
            }
            ProfileField("Address", form.placeOfResidence) { onChange(form.copy(placeOfResidence = it)) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ProfileField("City", form.city, Modifier.weight(1f)) { onChange(form.copy(city = it)) }
                ProfileField("State", form.state, Modifier.weight(1f)) { onChange(form.copy(state = it)) }
            }
            ProfileField("Occupation", form.profession) { onChange(form.copy(profession = it)) }
            ProfileField("Organisation / workplace", form.currentPlace) { onChange(form.copy(currentPlace = it)) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ProfileField("Role", form.currentRole, Modifier.weight(1f)) { onChange(form.copy(currentRole = it)) }
                ProfileField("Experience", form.experienceYears, Modifier.weight(1f), KeyboardType.Number) { onChange(form.copy(experienceYears = it.filter(Char::isDigit).take(2))) }
            }
            ProfileField("About you", form.bio, singleLine = false) { onChange(form.copy(bio = it)) }
            OutlinedButton(onClick = { moreDetails = !moreDetails }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) {
                Text(if (moreDetails) "Hide optional details" else "Add education and health details")
                Spacer(Modifier.weight(1f))
                Icon(Icons.Outlined.ExpandMore, null)
            }
            AnimatedVisibility(moreDetails) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Education", style = MaterialTheme.typography.titleMedium)
                    EducationFields("Class 12 / Intermediate", form.intermediateInstitution, form.intermediateDegree, form.intermediateYear,
                        { onChange(form.copy(intermediateInstitution = it)) }, { onChange(form.copy(intermediateDegree = it)) }, { onChange(form.copy(intermediateYear = it)) })
                    EducationFields("Graduation", form.graduationInstitution, form.graduationDegree, form.graduationYear,
                        { onChange(form.copy(graduationInstitution = it)) }, { onChange(form.copy(graduationDegree = it)) }, { onChange(form.copy(graduationYear = it)) })
                    EducationFields("Post-graduation", form.postGraduationInstitution, form.postGraduationDegree, form.postGraduationYear,
                        { onChange(form.copy(postGraduationInstitution = it)) }, { onChange(form.copy(postGraduationDegree = it)) }, { onChange(form.copy(postGraduationYear = it)) })
                    HorizontalDivider()
                    Text("Work history", style = MaterialTheme.typography.titleMedium)
                    ProfileField("Earlier workplaces", form.previousPlaces, singleLine = false) { onChange(form.copy(previousPlaces = it)) }
                    HorizontalDivider()
                    Text("Health information", style = MaterialTheme.typography.titleMedium)
                    Text("Visible only where family permissions allow it.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    ProfileField("Blood group", form.bloodGroup) { onChange(form.copy(bloodGroup = it.take(5))) }
                    ProfileField("Known conditions (comma separated)", form.knownConditions, singleLine = false) { onChange(form.copy(knownConditions = it)) }
                    ProfileField("Allergies (comma separated)", form.allergies, singleLine = false) { onChange(form.copy(allergies = it)) }
                    ProfileField("Genetic or family health notes", form.geneticNotes, singleLine = false) { onChange(form.copy(geneticNotes = it)) }
                }
            }
            Button(onClick = onSave, enabled = !saving && form.displayName.trim().length >= 2, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(8.dp)) {
                if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else { Icon(Icons.Outlined.CheckCircle, null); Spacer(Modifier.size(8.dp)); Text("Save profile") }
            }
        }
    }
}

@Composable
private fun EducationFields(
    title: String,
    institution: String,
    degree: String,
    year: String,
    onInstitution: (String) -> Unit,
    onDegree: (String) -> Unit,
    onYear: (String) -> Unit
) {
    Text(title, style = MaterialTheme.typography.labelLarge, color = Leaf)
    ProfileField("Institution", institution, onChange = onInstitution)
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        ProfileField("Course / degree", degree, Modifier.weight(1.6f), onChange = onDegree)
        ProfileField("Year", year, Modifier.weight(.8f), KeyboardType.Number) { onYear(it.filter(Char::isDigit).take(4)) }
    }
}

private fun commaList(value: String): List<String> = value.split(',').map(String::trim).filter(String::isNotBlank).distinct()

@Composable
private fun ProfileField(label: String, value: String, modifier: Modifier = Modifier.fillMaxWidth(), keyboardType: KeyboardType = KeyboardType.Text, singleLine: Boolean = true, onChange: (String) -> Unit) {
    OutlinedTextField(value, onChange, modifier = modifier, label = { Text(label) }, singleLine = singleLine, minLines = if (singleLine) 1 else 3, keyboardOptions = KeyboardOptions(keyboardType = keyboardType), shape = RoundedCornerShape(8.dp))
}

@Composable
private fun ProfileSummary(member: FamilyMemberProfile) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SummaryLine("Born", member.dateOfBirth.takeIf(String::isNotBlank)?.let(::formatMemberDate) ?: "Not added")
        SummaryLine("Lives in", listOf(member.placeOfResidence, member.city, member.state).filter(String::isNotBlank).distinct().joinToString(", ").ifBlank { "Not added" })
        SummaryLine("Work", listOf(member.work.currentRole, member.work.currentPlace, member.profession).filter(String::isNotBlank).distinct().joinToString(" • ").ifBlank { "Not added" })
        if (member.bio.isNotBlank()) SummaryLine("About", member.bio)
    }
}

@Composable
private fun SummaryLine(label: String, value: String) { Row(Modifier.fillMaxWidth()) { Text(label, Modifier.weight(.3f), color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value, Modifier.weight(.7f), fontWeight = FontWeight.Medium) } }

@Composable
private fun ImmediateFamilyStrip(family: ImmediateFamily, session: NyasSession) {
    val people = listOfNotNull(family.father?.let { "Father" to it }, family.mother?.let { "Mother" to it }, family.spouse?.let { "Spouse" to it }) + family.children.map { "Child" to it }
    if (people.isEmpty()) { Text("No immediate family linked yet.", color = MaterialTheme.colorScheme.onSurfaceVariant); return }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { people.forEach { (relation, member) -> Row(verticalAlignment = Alignment.CenterVertically) { MemberAvatar(member, session, 44); Spacer(Modifier.size(10.dp)); Column { Text(member.displayName, fontWeight = FontWeight.SemiBold); Text(relation, color = Leaf, style = MaterialTheme.typography.bodySmall) } } } }
}

@Composable
private fun MessageCard(message: String, error: Boolean) { Card(colors = CardDefaults.cardColors(containerColor = if (error) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer), shape = RoundedCornerShape(8.dp)) { Text(message, Modifier.fillMaxWidth().padding(14.dp)) } }

private fun profileCompletion(member: FamilyMemberProfile): Int {
    val values = listOf(member.displayName, member.dateOfBirth, member.placeOfResidence, member.city, member.profession.ifBlank { member.work.currentRole }, member.bio, member.photoUrl, member.gender.takeUnless { it == "prefer_not_to_say" }.orEmpty())
    return (values.count(String::isNotBlank) * 100 / values.size)
}
