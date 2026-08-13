@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.app.Activity
import android.net.Uri
import android.os.SystemClock
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.FactCheck
import androidx.compose.material.icons.automirrored.outlined.DirectionsWalk
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.FamilyRestroom
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.HowToVote
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import com.xpresscure.nyas.R
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.DashboardData
import com.xpresscure.nyas.data.FamilyHubOverview
import com.xpresscure.nyas.data.FamilyMemberProfile
import com.xpresscure.nyas.data.LoginChallenge
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.Sankalp
import com.xpresscure.nyas.data.SessionStore
import com.xpresscure.nyas.ui.theme.Forest
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Sage
import com.xpresscure.nyas.ui.theme.Sunlight
import kotlinx.coroutines.launch
import kotlinx.coroutines.async

internal enum class AppRoute(val label: String, val context: String, val icon: ImageVector, val webPath: String?) {
    Darshan("Home", "Darshan", Icons.Outlined.Home, null),
    Kul("Family", "Kul", Icons.Outlined.FamilyRestroom, "/family"),
    Swasthya("Swasthya", "Fitness & Kul challenges", Icons.AutoMirrored.Outlined.DirectionsWalk, null),
    Kosh("Kosh", "Family funds", Icons.Outlined.Savings, "/contribute"),
    KoshMilan("कोष मिलान", "Bank reconciliation", Icons.AutoMirrored.Outlined.FactCheck, "/kosh-reconciliation"),
    Sankalp("Sankalp", "Shared projects", Icons.Outlined.Route, "/projects"),
    More("More", "More", Icons.Outlined.Menu, null),
    Sabha("Sankalp Sabha", "Proposals & voting", Icons.Outlined.HowToVote, "/sankalp-sabha"),
    Panchang("Calendar", "Family events", Icons.Outlined.CalendarMonth, "/calendar"),
    Smaran("प्रभात स्मरण", "Shared daily writing", Icons.Outlined.Edit, null),
    Parichay("You", "Parichay", Icons.Outlined.Person, "/profile"),
    Tree("कुल मानचित्र", "Family tree", Icons.Outlined.AccountBalance, "/family-tree"),
    Virasat("Virasat", "Family history", Icons.Outlined.AutoStories, null),
    Settings("Settings", "Account & security", Icons.Outlined.Settings, null)
}

data class AppUiState(
    val session: NyasSession? = null,
    val checkingSession: Boolean = true,
    val signingIn: Boolean = false,
    val loginChallenge: LoginChallenge = LoginChallenge.None,
    val loginError: String = "",
    val dashboard: DashboardData = DashboardData(),
    val familyHub: FamilyHubOverview = FamilyHubOverview(),
    val fundingSankalp: List<Sankalp> = emptyList(),
    val myProfile: FamilyMemberProfile? = null,
    val loadingDashboard: Boolean = false,
    val dashboardError: String = ""
)

class NyasViewModel : ViewModel() {
    private val api = NyasApi()
    var state by mutableStateOf(AppUiState())
        private set

    fun initialize(store: SessionStore) {
        if (!state.checkingSession) return
        val session = store.read()
        state = state.copy(session = session, checkingSession = false)
        if (session != null) loadDashboard()
    }

    fun signIn(store: SessionStore, name: String, phone: String, password: String, confirmPassword: String) {
        if (name.trim().length < 2) {
            state = state.copy(loginError = "Enter your full name.")
            return
        }
        viewModelScope.launch {
            state = state.copy(signingIn = true, loginError = "")
            try {
                val session = api.login(name, phone, password, confirmPassword)
                store.save(session)
                state = state.copy(session = session, signingIn = false, loginChallenge = LoginChallenge.None)
                loadDashboard()
            } catch (error: ApiException) {
                val challenge = when (error.code) {
                    "LOGIN_PHONE_REQUIRED", "NAME_MATCH_AMBIGUOUS" -> LoginChallenge.Phone
                    "PASSWORD_REQUIRED", "INVALID_CREDENTIALS", "LOGIN_TEMPORARILY_LOCKED" -> LoginChallenge.Password
                    "PROFILE_CLAIM_REQUIRED" -> LoginChallenge.ProfileClaim
                    "NEW_ACCOUNT_REQUIRED", "ACCOUNT_SETUP_REQUIRED", "PASSWORD_SETUP_REQUIRED" -> LoginChallenge.AccountSetup
                    else -> state.loginChallenge
                }
                state = state.copy(signingIn = false, loginChallenge = challenge, loginError = friendlyError(error))
            } catch (_: Exception) {
                state = state.copy(signingIn = false, loginError = "Could not reach Nyas. Check your connection and try again.")
            }
        }
    }

    fun recoverPassword(
        store: SessionStore,
        name: String,
        recoveryCode: String,
        password: String,
        confirmPassword: String
    ) {
        if (recoveryCode.isBlank()) {
            state = state.copy(loginError = "Enter the one-time code shared by the Nyas owner.")
            return
        }
        viewModelScope.launch {
            state = state.copy(signingIn = true, loginError = "")
            try {
                val session = api.recoverPassword(name, recoveryCode, password, confirmPassword)
                store.save(session)
                state = state.copy(session = session, signingIn = false, loginChallenge = LoginChallenge.None)
                loadDashboard()
            } catch (error: ApiException) {
                state = state.copy(signingIn = false, loginChallenge = LoginChallenge.Recovery, loginError = friendlyError(error))
            } catch (_: Exception) {
                state = state.copy(signingIn = false, loginError = "Could not reach Nyas. Check your connection and try again.")
            }
        }
    }

    fun loadDashboard() {
        val session = state.session ?: return
        viewModelScope.launch {
            state = state.copy(loadingDashboard = true, dashboardError = "")
            val dashboardRequest = async { runCatching { api.dashboard(session) } }
            val hubRequest = async { runCatching { api.familyHubOverview(session) } }
            val profileRequest = async { runCatching { api.myProfile(session) } }
            val sankalpRequest = async { runCatching { api.sankalp(session) } }
            val dashboardResult = dashboardRequest.await()
            val hubResult = hubRequest.await()
            val profileResult = profileRequest.await()
            val sankalpResult = sankalpRequest.await()
            val fundingSankalp = sankalpResult.getOrDefault(state.fundingSankalp)
                .filter {
                    it.budgetRequired && !it.fullyFunded && it.targetPaise > it.allocatedPaise &&
                        it.status !in setOf("draft", "archived", "completed")
                }
                .sortedWith(compareByDescending<Sankalp> { it.fundingPercent }.thenBy { it.title })
            state = state.copy(
                dashboard = dashboardResult.getOrDefault(state.dashboard),
                familyHub = hubResult.getOrDefault(state.familyHub),
                myProfile = profileResult.getOrNull() ?: state.myProfile,
                fundingSankalp = fundingSankalp,
                loadingDashboard = false,
                dashboardError = if (dashboardResult.isFailure && hubResult.isFailure) "Latest information is unavailable right now." else ""
            )
        }
    }

    fun logout(store: SessionStore) {
        store.clear()
        state = AppUiState(checkingSession = false)
    }

    fun resetLogin() {
        state = state.copy(loginChallenge = LoginChallenge.None, loginError = "")
    }

    fun startPasswordRecovery() {
        state = state.copy(loginChallenge = LoginChallenge.Recovery, loginError = "")
    }

    fun updateSessionToken(store: SessionStore, token: String) {
        val session = state.session ?: return
        val updated = session.copy(token = token)
        store.save(updated)
        state = state.copy(session = updated)
    }

    private fun friendlyError(error: ApiException): String = when (error.code) {
        "LOGIN_PHONE_REQUIRED" -> "Enter the mobile number registered with your account."
        "NAME_MATCH_AMBIGUOUS" -> "More than one Kul profile has a similar name. Enter your registered mobile number to identify yours."
        "NEW_ACCOUNT_REQUIRED" -> "We did not find this name in the Kul Map. Create a new Nyas account to join."
        "PROFILE_CLAIM_REQUIRED" -> "Your family has already added you. Claim this profile to create your private login."
        "ACCOUNT_SETUP_REQUIRED", "PASSWORD_SETUP_REQUIRED" -> "This profile has no login yet. Add your mobile number and create a password."
        "PASSWORD_REQUIRED" -> "Enter your Nyas password."
        "INVALID_CREDENTIALS" -> "The name, phone number, or password is incorrect."
        "PHONE_ALREADY_REGISTERED" -> "This mobile number belongs to another Nyas login. Ask the owner to help recover the correct account."
        "INVALID_RECOVERY_CODE" -> "This one-time code is incorrect or has expired. Ask the owner for a new code."
        "RECOVERY_NAME_MISMATCH" -> "Enter the same member name for which the owner created this code."
        "LOGIN_TEMPORARILY_LOCKED" -> "Too many attempts. Please try again in a few minutes."
        else -> error.message ?: "Please try again."
    }
}

@Composable
fun NyasApp(deepLink: Uri?) {
    val model: NyasViewModel = viewModel()
    val context = LocalContext.current
    val store = remember { SessionStore(context.applicationContext) }
    LaunchedEffect(Unit) { model.initialize(store) }

    AnimatedContent(
        targetState = model.state.checkingSession to (model.state.session != null),
        transitionSpec = { fadeIn(tween(350)) togetherWith fadeOut(tween(220)) },
        label = "app-state"
    ) { (checking, signedIn) ->
        when {
            checking -> LaunchScreen()
            !signedIn -> WelcomeAndLogin(
                model.state,
                onLogin = { n, p, w, c -> model.signIn(store, n, p, w, c) },
                onRecover = { n, code, w, c -> model.recoverPassword(store, n, code, w, c) },
                onForgotPassword = model::startPasswordRecovery,
                onReset = model::resetLogin
            )
            else -> AppShell(
                state = model.state,
                deepLink = deepLink,
                onRefresh = model::loadDashboard,
                onTokenChanged = { model.updateSessionToken(store, it) },
                onLogout = { model.logout(store) }
            )
        }
    }
}

@Composable
private fun LaunchScreen() {
    val pulse by rememberInfiniteTransition(label = "logo-pulse").animateFloat(
        initialValue = .94f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "scale"
    )
    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Sunlight, Sage, MaterialTheme.colorScheme.background))
        ),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painterResource(R.drawable.nyas_logo), "Nyas", Modifier.size(116.dp).scale(pulse).clip(CircleShape))
            Spacer(Modifier.height(24.dp))
            Text("NYAS", color = Forest, style = MaterialTheme.typography.displaySmall)
            Text("Family  |  Trust  |  Future", color = Gold, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
private fun WelcomeAndLogin(
    state: AppUiState,
    onLogin: (String, String, String, String) -> Unit,
    onRecover: (String, String, String, String) -> Unit,
    onForgotPassword: () -> Unit,
    onReset: () -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var recoveryCode by rememberSaveable { mutableStateOf("") }
    val isClaim = state.loginChallenge == LoginChallenge.ProfileClaim
    val isSetup = isClaim || state.loginChallenge == LoginChallenge.AccountSetup
    val isRecovery = state.loginChallenge == LoginChallenge.Recovery
    val needsPhone = state.loginChallenge == LoginChallenge.Phone || isSetup
    val needsPassword = state.loginChallenge == LoginChallenge.Password || isSetup || isRecovery
    val listState = rememberLazyListState()
    val focusManager = LocalFocusManager.current

    LaunchedEffect(state.loginChallenge) {
        if (state.loginChallenge != LoginChallenge.None) listState.animateScrollToItem(1)
    }

    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Sunlight, Sage, MaterialTheme.colorScheme.background))
        )
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().imePadding(),
            state = listState,
            contentPadding = PaddingValues(
                start = 20.dp,
                end = 20.dp,
                top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 28.dp,
                bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + 24.dp
            ),
            verticalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Image(painterResource(R.drawable.nyas_logo), "Nyas logo", Modifier.size(92.dp).clip(CircleShape))
                    Spacer(Modifier.height(16.dp))
                    Text("Welcome to Nyas", color = Forest, style = MaterialTheme.typography.headlineLarge)
                    Text("Your family, connected.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
                    Spacer(Modifier.height(24.dp))
                }
            }
            item {
                Card(
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                ) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(
                            when {
                                isClaim -> "Claim your Kul profile"
                                isSetup -> "Create your login"
                                isRecovery -> "Reset your password"
                                needsPassword -> "Welcome back"
                                else -> "Find your family profile"
                            },
                            style = MaterialTheme.typography.titleLarge
                        )
                        Text(
                            when {
                                isClaim -> "A family member already added your name. Set your mobile number and password once; no old password is required."
                                isSetup -> "This account has never had a password. Create one now for future sign-ins."
                                isRecovery -> "Enter the one-time code shared privately by the Nyas owner, then choose a new password."
                                needsPassword -> "Enter the password you created when you first claimed this profile."
                                else -> "Start with your name. We will find whether your profile already exists."
                            },
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            name,
                            { name = it },
                            label = { Text("Full name") },
                            singleLine = true,
                            enabled = state.loginChallenge == LoginChallenge.None || isRecovery,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                            modifier = Modifier.fillMaxWidth()
                        )
                        AnimatedVisibility(needsPhone) {
                            OutlinedTextField(
                                phone,
                                { phone = it.filter(Char::isDigit).take(10) },
                                label = { Text("Phone number") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = if (needsPassword) ImeAction.Next else ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        AnimatedVisibility(isRecovery) {
                            OutlinedTextField(
                                recoveryCode,
                                { recoveryCode = it.uppercase() },
                                label = { Text("One-time recovery code") },
                                placeholder = { Text("NYAS-XXXX-XXXX") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        AnimatedVisibility(needsPassword) {
                            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                OutlinedTextField(
                                    password,
                                    { password = it },
                                    label = { Text(if (isSetup || isRecovery) "Create a new password" else "Your password") },
                                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    trailingIcon = {
                                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                            Icon(
                                                if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                                if (passwordVisible) "Hide password" else "Show password"
                                            )
                                        }
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = if (isSetup || isRecovery) ImeAction.Next else ImeAction.Done),
                                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); onLogin(name, phone, password, confirmPassword) }),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                if (isSetup || isRecovery) OutlinedTextField(
                                    confirmPassword,
                                    { confirmPassword = it },
                                    label = { Text("Enter it again") },
                                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    trailingIcon = {
                                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                            Icon(
                                                if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                                if (passwordVisible) "Hide password" else "Show password"
                                            )
                                        }
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                                    keyboardActions = KeyboardActions(onDone = {
                                        focusManager.clearFocus()
                                        if (isRecovery) onRecover(name, recoveryCode, password, confirmPassword)
                                        else onLogin(name, phone, password, confirmPassword)
                                    }),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                        AnimatedVisibility(state.loginError.isNotBlank()) {
                            Text(state.loginError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                        }
                        Button(
                            onClick = {
                                if (isRecovery) onRecover(name, recoveryCode, password, confirmPassword)
                                else onLogin(name, phone, password, confirmPassword)
                            },
                            enabled = !state.signingIn,
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            if (state.signingIn) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Color.White)
                            else {
                                Text(if (isRecovery) "Reset password & sign in" else if (isClaim) "Claim profile & continue" else if (isSetup) "Create login & continue" else "Continue")
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Outlined.ArrowForward, null)
                            }
                        }
                        if (state.loginChallenge == LoginChallenge.Password) {
                            TextButton(
                                onClick = {
                                    password = ""
                                    confirmPassword = ""
                                    recoveryCode = ""
                                    onForgotPassword()
                                },
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            ) { Text("Forgot password? Ask the owner for a recovery code") }
                        }
                        if (state.loginChallenge != LoginChallenge.None) {
                            TextButton(
                                onClick = {
                                    phone = ""
                                    password = ""
                                    confirmPassword = ""
                                    onReset()
                                },
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            ) { Text("Use a different name") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppShell(state: AppUiState, deepLink: Uri?, onRefresh: () -> Unit, onTokenChanged: (String) -> Unit, onLogout: () -> Unit) {
    var route by rememberSaveable { mutableStateOf(routeFromDeepLink(deepLink)) }
    var moreOpen by rememberSaveable { mutableStateOf(false) }
    var fundingProjectId by rememberSaveable { mutableStateOf<String?>(null) }
    var lastBackPressAt by rememberSaveable { mutableStateOf(0L) }
    val snackbars = remember { SnackbarHostState() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val primaryRoutes = listOf(AppRoute.Darshan, AppRoute.Kul, AppRoute.Swasthya, AppRoute.Sankalp, AppRoute.Kosh)

    BackHandler(enabled = !moreOpen) {
        if (route != AppRoute.Darshan) {
            route = AppRoute.Darshan
            lastBackPressAt = 0L
        } else {
            val now = SystemClock.elapsedRealtime()
            if (now - lastBackPressAt <= 2_000L) {
                (context as? Activity)?.finish()
            } else {
                lastBackPressAt = now
                snackbars.currentSnackbarData?.dismiss()
                scope.launch { snackbars.showSnackbar("Press back again to exit") }
            }
        }
    }

    LaunchedEffect(state.myProfile?.id) {
        val profile = state.myProfile ?: return@LaunchedEffect
        val hasPersonalDetails = profile.dateOfBirth.isNotBlank() ||
            profile.placeOfResidence.isNotBlank() || profile.city.isNotBlank() || profile.photoUrl.isNotBlank()
        if (!hasPersonalDetails && route == AppRoute.Darshan) route = AppRoute.Parichay
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val tablet = maxWidth >= 720.dp
        Row(Modifier.fillMaxSize()) {
            if (tablet) {
                NavigationRail(
                    modifier = Modifier.fillMaxHeight().padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()),
                    header = { Image(painterResource(R.drawable.nyas_logo), "Nyas", Modifier.padding(12.dp).size(48.dp).clip(CircleShape)) }
                ) {
                    primaryRoutes.forEach { item ->
                        NavigationRailItem(
                            selected = route == item,
                            onClick = { route = item },
                            icon = { Icon(item.icon, item.label) },
                            label = { Text(item.label) }
                        )
                    }
                }
            }
            Scaffold(
                modifier = Modifier.weight(1f),
                snackbarHost = { SnackbarHost(snackbars) },
                topBar = {
                    TopAppBar(
                        title = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (route == AppRoute.Darshan && state.myProfile != null && state.session != null) {
                                    MemberAvatar(state.myProfile, state.session, 40)
                                    Spacer(Modifier.width(10.dp))
                                }
                                Column {
                                    Text(
                                        if (route == AppRoute.Darshan) "Hello, ${state.session?.fullName.orEmpty().substringBefore(' ')}" else route.label,
                                        style = MaterialTheme.typography.titleLarge
                                    )
                                    Text(
                                        if (route == AppRoute.Darshan) "Rooted in trust. Growing together." else state.session?.familyName.orEmpty(),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        },
                        actions = {
                            if (route == AppRoute.Darshan) IconButton(onClick = onRefresh) { Icon(Icons.Outlined.Refresh, "Refresh") }
                            IconButton(onClick = { moreOpen = true }) { Icon(Icons.Outlined.Menu, "More") }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
                    )
                },
                bottomBar = {
                    if (!tablet) NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 4.dp) {
                        primaryRoutes.forEach { item ->
                            NavigationBarItem(
                                selected = route == item,
                                onClick = { route = item },
                                icon = { Icon(item.icon, item.label) },
                                label = { Text(item.label, maxLines = 1) }
                            )
                        }
                    }
                }
            ) { padding ->
                AnimatedContent(route, modifier = Modifier.padding(padding), transitionSpec = {
                    (fadeIn(tween(260)) + slideInVertically(tween(300)) { it / 18 }) togetherWith fadeOut(tween(160))
                }, label = "route") { destination ->
                    when {
                        destination == AppRoute.Darshan -> HomeScreen(
                            dashboard = state.dashboard,
                            familyHub = state.familyHub,
                            fundingSankalp = state.fundingSankalp,
                            profile = state.myProfile,
                            loading = state.loadingDashboard,
                            error = state.dashboardError,
                            onNavigate = { route = it },
                            onContribute = { projectId -> fundingProjectId = projectId; route = AppRoute.Kosh }
                        )
                        destination == AppRoute.Kul -> KulScreen(
                            session = state.session!!,
                            onOpenMap = { route = AppRoute.Tree },
                            onOpenVirasat = { route = AppRoute.Virasat }
                        )
                        destination == AppRoute.Swasthya -> SwasthyaScreen(session = state.session!!)
                        destination == AppRoute.Kosh -> KoshScreen(
                            session = state.session!!,
                            preferredProjectId = fundingProjectId
                        )
                        destination == AppRoute.KoshMilan -> KoshMilanScreen(session = state.session!!)
                        destination == AppRoute.Sankalp -> SankalpScreen(
                            session = state.session!!,
                            onFund = { projectId -> fundingProjectId = projectId; route = AppRoute.Kosh }
                        )
                        destination == AppRoute.Parichay -> ParichayScreen(session = state.session!!)
                        destination == AppRoute.Tree -> KulMapScreen(session = state.session!!)
                        destination == AppRoute.Virasat -> VirasatScreen(session = state.session!!)
                        destination == AppRoute.Panchang -> CalendarScreen(session = state.session!!)
                        destination == AppRoute.Smaran -> SmaranScreen(session = state.session!!)
                        destination == AppRoute.Sabha -> SabhaScreen(session = state.session!!)
                        destination == AppRoute.Settings -> SettingsScreen(state.session!!, onTokenChanged, onLogout)
                        else -> HomeScreen(
                            dashboard = state.dashboard,
                            familyHub = state.familyHub,
                            fundingSankalp = state.fundingSankalp,
                            profile = state.myProfile,
                            loading = state.loadingDashboard,
                            error = state.dashboardError,
                            onNavigate = { route = it },
                            onContribute = { projectId -> fundingProjectId = projectId; route = AppRoute.Kosh }
                        )
                    }
                }
            }
        }
    }

    if (moreOpen) {
        ModalBottomSheet(onDismissRequest = { moreOpen = false }, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
            MoreSheet(
                session = state.session!!,
                onRoute = { route = it; moreOpen = false },
                onLogout = { moreOpen = false; onLogout() }
            )
        }
    }
}

@Composable
private fun MoreSheet(session: NyasSession, onRoute: (AppRoute) -> Unit, onLogout: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, bottom = 28.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(Modifier.size(48.dp), shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Box(contentAlignment = Alignment.Center) { Text(session.fullName.take(1).uppercase(), style = MaterialTheme.typography.titleLarge) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(session.fullName, style = MaterialTheme.typography.titleMedium)
                Text(session.role.replace('_', ' '), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(18.dp))
        val secondaryRoutes = buildList {
            add(AppRoute.Parichay)
            add(AppRoute.Tree)
            add(AppRoute.Virasat)
            add(AppRoute.Panchang)
            add(AppRoute.Smaran)
            add(AppRoute.Sabha)
            if (session.role in setOf("owner", "kosh_pramukh")) add(AppRoute.KoshMilan)
            add(AppRoute.Settings)
        }
        secondaryRoutes.forEach { item ->
            Surface(onClick = { onRoute(item) }, modifier = Modifier.fillMaxWidth(), color = Color.Transparent) {
                Row(Modifier.padding(vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(item.icon, null)
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text(item.label, style = MaterialTheme.typography.bodyLarge)
                        Text(item.context, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.Outlined.ChevronRight, null)
                }
            }
            HorizontalDivider()
        }
        TextButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.AutoMirrored.Outlined.Logout, null)
            Spacer(Modifier.width(8.dp))
            Text("Sign out")
        }
    }
}

private fun routeFromDeepLink(uri: Uri?): AppRoute {
    if (uri?.scheme == "nyas" && uri.host == "smaran") return AppRoute.Smaran
    val path = uri?.path.orEmpty()
    return AppRoute.entries.firstOrNull { it.webPath == path } ?: AppRoute.Darshan
}
