@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.net.Uri
import android.webkit.WebView
import android.webkit.WebViewClient
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
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.FamilyRestroom
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.HowToVote
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import com.xpresscure.nyas.BuildConfig
import com.xpresscure.nyas.R
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.DashboardData
import com.xpresscure.nyas.data.LoginChallenge
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.SessionStore
import com.xpresscure.nyas.ui.theme.Forest
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

private enum class AppRoute(val label: String, val hindi: String, val icon: ImageVector, val webPath: String?) {
    Darshan("Darshan", "दर्शन", Icons.Outlined.Home, null),
    Kul("Kul", "कुल", Icons.Outlined.FamilyRestroom, "/family"),
    Kosh("Kosh", "कोष", Icons.Outlined.Savings, "/contribute"),
    Sankalp("Sankalp", "संकल्प", Icons.Outlined.Route, "/projects"),
    More("More", "और", Icons.Outlined.Menu, null),
    Sabha("Sankalp Sabha", "संकल्प सभा", Icons.Outlined.HowToVote, "/sankalp-sabha"),
    Panchang("Calendar", "पंचांग", Icons.Outlined.CalendarMonth, "/calendar"),
    Parichay("Profile", "परिचय", Icons.Outlined.Person, "/profile"),
    Tree("Kul Map", "कुल मानचित्र", Icons.Outlined.AccountBalance, "/family-tree")
}

data class AppUiState(
    val session: NyasSession? = null,
    val checkingSession: Boolean = true,
    val signingIn: Boolean = false,
    val loginChallenge: LoginChallenge = LoginChallenge.None,
    val loginError: String = "",
    val dashboard: DashboardData = DashboardData(),
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
            state = state.copy(loginError = "अपना पूरा नाम लिखें।")
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
                    "PASSWORD_SETUP_REQUIRED" -> LoginChallenge.PasswordSetup
                    else -> state.loginChallenge
                }
                state = state.copy(signingIn = false, loginChallenge = challenge, loginError = friendlyError(error))
            } catch (_: Exception) {
                state = state.copy(signingIn = false, loginError = "Nyas से संपर्क नहीं हो पाया। इंटरनेट जाँचकर फिर कोशिश करें।")
            }
        }
    }

    fun loadDashboard() {
        val session = state.session ?: return
        viewModelScope.launch {
            state = state.copy(loadingDashboard = true, dashboardError = "")
            try {
                state = state.copy(dashboard = api.dashboard(session), loadingDashboard = false)
            } catch (_: Exception) {
                state = state.copy(loadingDashboard = false, dashboardError = "नई जानकारी अभी नहीं मिली।")
            }
        }
    }

    fun logout(store: SessionStore) {
        store.clear()
        state = AppUiState(checkingSession = false)
    }

    private fun friendlyError(error: ApiException): String = when (error.code) {
        "LOGIN_PHONE_REQUIRED", "NAME_MATCH_AMBIGUOUS" -> "इस नाम के एक से अधिक सदस्य मिले। पहचान के लिए फोन नंबर लिखें।"
        "PASSWORD_SETUP_REQUIRED" -> "पहली बार के लिए एक आसान पासवर्ड बनाएँ।"
        "PASSWORD_REQUIRED" -> "अपने Nyas खाते का पासवर्ड लिखें।"
        "INVALID_CREDENTIALS" -> "नाम, फोन या पासवर्ड सही नहीं है।"
        "LOGIN_TEMPORARILY_LOCKED" -> "कई प्रयास हुए हैं। थोड़ी देर बाद फिर कोशिश करें।"
        else -> error.message ?: "फिर कोशिश करें।"
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
            !signedIn -> WelcomeAndLogin(model.state, onLogin = { n, p, w, c -> model.signIn(store, n, p, w, c) })
            else -> AppShell(
                state = model.state,
                deepLink = deepLink,
                onRefresh = model::loadDashboard,
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
    Box(Modifier.fillMaxSize().background(Forest), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painterResource(R.drawable.nyas_logo), "Nyas", Modifier.size(116.dp).scale(pulse).clip(CircleShape))
            Spacer(Modifier.height(24.dp))
            Text("न्यास", color = Color.White, style = MaterialTheme.typography.displaySmall)
            Text("विश्वास • विरासत • भविष्य", color = Gold, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
private fun WelcomeAndLogin(
    state: AppUiState,
    onLogin: (String, String, String, String) -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    val needsPhone = state.loginChallenge == LoginChallenge.Phone
    val needsPassword = state.loginChallenge == LoginChallenge.Password || state.loginChallenge == LoginChallenge.PasswordSetup
    val isSetup = state.loginChallenge == LoginChallenge.PasswordSetup

    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Forest, Color(0xFF20392C), MaterialTheme.colorScheme.background))
        )
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 20.dp,
                end = 20.dp,
                top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 28.dp,
                bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + 24.dp
            ),
            verticalArrangement = Arrangement.Center
        ) {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Image(painterResource(R.drawable.nyas_logo), "Nyas logo", Modifier.size(92.dp).clip(CircleShape))
                    Spacer(Modifier.height(16.dp))
                    Text("अपने परिवार से जुड़ें", color = Color.White, style = MaterialTheme.typography.headlineLarge)
                    Text("Connect. Remember. Build together.", color = Color(0xFFDDE8E0), style = MaterialTheme.typography.bodyLarge)
                    Spacer(Modifier.height(24.dp))
                }
            }
            item {
                Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(if (needsPassword) "सुरक्षित प्रवेश" else "अपना नाम लिखें", style = MaterialTheme.typography.titleLarge)
                        Text(
                            if (needsPassword) "आपकी निजी और कोष की जानकारी सुरक्षित रहेगी।" else "यदि नाम एक जैसा हुआ, तभी हम फोन नंबर पूछेंगे।",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(name, { name = it }, label = { Text("पूरा नाम") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        AnimatedVisibility(needsPhone || needsPassword) {
                            OutlinedTextField(phone, { phone = it.filter(Char::isDigit).take(10) }, label = { Text("फोन नंबर") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        }
                        AnimatedVisibility(needsPassword) {
                            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                OutlinedTextField(password, { password = it }, label = { Text(if (isSetup) "नया पासवर्ड" else "पासवर्ड") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
                                if (isSetup) OutlinedTextField(confirmPassword, { confirmPassword = it }, label = { Text("पासवर्ड दोबारा लिखें") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
                            }
                        }
                        AnimatedVisibility(state.loginError.isNotBlank()) {
                            Text(state.loginError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                        }
                        Button(
                            onClick = { onLogin(name, phone, password, confirmPassword) },
                            enabled = !state.signingIn,
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            if (state.signingIn) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Color.White)
                            else {
                                Text(if (isSetup) "पासवर्ड बनाएँ और प्रवेश करें" else "आगे बढ़ें")
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Outlined.ArrowForward, null)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppShell(state: AppUiState, deepLink: Uri?, onRefresh: () -> Unit, onLogout: () -> Unit) {
    var route by rememberSaveable { mutableStateOf(routeFromDeepLink(deepLink)) }
    var moreOpen by rememberSaveable { mutableStateOf(false) }
    var legacyRoute by rememberSaveable { mutableStateOf<AppRoute?>(null) }
    var fundingProjectId by rememberSaveable { mutableStateOf<String?>(null) }
    val snackbars = remember { SnackbarHostState() }
    val primaryRoutes = listOf(AppRoute.Darshan, AppRoute.Kul, AppRoute.Kosh, AppRoute.Sankalp, AppRoute.More)

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
                            onClick = { if (item == AppRoute.More) moreOpen = true else { route = item; legacyRoute = null } },
                            icon = { Icon(item.icon, item.label) },
                            label = { Text(item.hindi) }
                        )
                    }
                }
            }
            Scaffold(
                modifier = Modifier.weight(1f),
                snackbarHost = { SnackbarHost(snackbars) },
                topBar = {
                    TopAppBar(
                        navigationIcon = {
                            if (legacyRoute == route) IconButton(onClick = { legacyRoute = null }) {
                                Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back")
                            }
                        },
                        title = {
                            Column {
                                Text(route.hindi, style = MaterialTheme.typography.titleLarge)
                                Text(state.session?.familyName.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
                    if (!tablet) NavigationBar {
                        primaryRoutes.forEach { item ->
                            NavigationBarItem(
                                selected = route == item,
                                onClick = { if (item == AppRoute.More) moreOpen = true else { route = item; legacyRoute = null } },
                                icon = { Icon(item.icon, item.label) },
                                label = { Text(item.hindi, maxLines = 1) }
                            )
                        }
                    }
                }
            ) { padding ->
                AnimatedContent(route, modifier = Modifier.padding(padding), transitionSpec = {
                    (fadeIn(tween(260)) + slideInVertically(tween(300)) { it / 18 }) togetherWith fadeOut(tween(160))
                }, label = "route") { destination ->
                    when {
                        legacyRoute == destination -> LegacyFeatureScreen(destination, state.session!!)
                        destination == AppRoute.Darshan -> DarshanScreen(state, onNavigate = { route = it; legacyRoute = null }, onRefresh = onRefresh)
                        destination == AppRoute.Kosh -> KoshScreen(
                            session = state.session!!,
                            preferredProjectId = fundingProjectId,
                            onOpenWorkspace = { legacyRoute = AppRoute.Kosh }
                        )
                        destination == AppRoute.Sankalp -> SankalpScreen(
                            session = state.session!!,
                            onFund = { projectId -> fundingProjectId = projectId; route = AppRoute.Kosh; legacyRoute = null },
                            onOpenWorkspace = { legacyRoute = AppRoute.Sankalp }
                        )
                        else -> LegacyFeatureScreen(destination, state.session!!)
                    }
                }
            }
        }
    }

    if (moreOpen) {
        ModalBottomSheet(onDismissRequest = { moreOpen = false }, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
            MoreSheet(
                session = state.session!!,
                onRoute = { route = it; legacyRoute = null; moreOpen = false },
                onLogout = { moreOpen = false; onLogout() }
            )
        }
    }
}

@Composable
private fun DarshanScreen(state: AppUiState, onNavigate: (AppRoute) -> Unit, onRefresh: () -> Unit) {
    val session = state.session ?: return
    val rupees = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Forest),
                shape = RoundedCornerShape(8.dp)
            ) {
                Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Forest, Leaf))).padding(20.dp)) {
                    Column {
                        Text("नमस्ते, ${session.fullName.substringBefore(' ')}", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                        Spacer(Modifier.height(6.dp))
                        Text("आज परिवार के साथ क्या आगे बढ़ाएँ?", color = Color(0xFFDDE8E0), style = MaterialTheme.typography.bodyLarge)
                        Spacer(Modifier.height(18.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            FilledTonalButton(onClick = { onNavigate(AppRoute.Parichay) }) { Icon(Icons.Outlined.Person, null); Spacer(Modifier.width(6.dp)); Text("परिचय") }
                            FilledTonalButton(onClick = { onNavigate(AppRoute.Kosh) }) { Icon(Icons.Outlined.AddCircle, null); Spacer(Modifier.width(6.dp)); Text("योगदान") }
                        }
                    }
                }
            }
        }
        item {
            Text("एक नज़र में", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                MetricCard("सदस्य", state.dashboard.metrics.members.toString(), Icons.Outlined.FamilyRestroom, Modifier.weight(1f))
                MetricCard("सक्रिय संकल्प", state.dashboard.metrics.activeSankalp.toString(), Icons.Outlined.Route, Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
            MetricCard("कुल कोष", rupees.format(state.dashboard.metrics.koshPaise / 100.0), Icons.Outlined.Savings, Modifier.fillMaxWidth())
        }
        if (state.loadingDashboard) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (state.dashboardError.isNotBlank()) item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(state.dashboardError, Modifier.weight(1f), color = MaterialTheme.colorScheme.onErrorContainer)
                    TextButton(onClick = onRefresh) { Text("फिर कोशिश") }
                }
            }
        }
        item { Text("संकल्प जिनसे बदलाव आएगा", style = MaterialTheme.typography.titleLarge) }
        if (!state.loadingDashboard && state.dashboard.featured.isEmpty()) item {
            EmptyAction("पहला संकल्प परिवार के साथ साझा करें।", "संकल्प देखें") { onNavigate(AppRoute.Sankalp) }
        }
        items(state.dashboard.featured, key = { it.id }) { sankalp ->
            val progress = if (sankalp.targetPaise > 0) (sankalp.allocatedPaise.toFloat() / sankalp.targetPaise).coerceIn(0f, 1f) else 0f
            Card(onClick = { onNavigate(AppRoute.Sankalp) }, shape = RoundedCornerShape(8.dp), elevation = CardDefaults.cardElevation(1.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(sankalp.title, style = MaterialTheme.typography.titleMedium)
                            Text(sankalp.stage.replace('_', ' ').replaceFirstChar(Char::uppercase), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Outlined.ChevronRight, null)
                    }
                    Spacer(Modifier.height(14.dp))
                    LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape), color = Gold)
                    Spacer(Modifier.height(8.dp))
                    Text("${(progress * 100).toInt()}% funded", style = MaterialTheme.typography.labelLarge, color = Leaf)
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer), shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(18.dp)) {
                    Text("आज का परिवार संकेत", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text("किसी एक बड़े सदस्य को फोन करें और उनकी एक स्मृति Nyas में जोड़ें।")
                }
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, icon: ImageVector, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp)) {
            Icon(icon, null, tint = Gold)
            Spacer(Modifier.height(14.dp))
            Text(value, style = MaterialTheme.typography.headlineMedium, maxLines = 1)
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EmptyAction(message: String, action: String, onClick: () -> Unit) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Outlined.Visibility, null, Modifier.size(36.dp), tint = Gold)
            Spacer(Modifier.height(10.dp))
            Text(message)
            Spacer(Modifier.height(12.dp))
            OutlinedButton(onClick) { Text(action) }
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
        listOf(AppRoute.Parichay, AppRoute.Tree, AppRoute.Panchang, AppRoute.Sabha).forEach { item ->
            Surface(onClick = { onRoute(item) }, modifier = Modifier.fillMaxWidth(), color = Color.Transparent) {
                Row(Modifier.padding(vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(item.icon, null)
                    Spacer(Modifier.width(16.dp))
                    Text(item.hindi, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                    Icon(Icons.Outlined.ChevronRight, null)
                }
            }
            HorizontalDivider()
        }
        TextButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.AutoMirrored.Outlined.Logout, null)
            Spacer(Modifier.width(8.dp))
            Text("साइन आउट")
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun LegacyFeatureScreen(route: AppRoute, session: NyasSession) {
    var loading by remember(route) { mutableStateOf(true) }
    var webView: WebView? by remember { mutableStateOf(null) }
    BackHandler(enabled = webView?.canGoBack() == true) { webView?.goBack() }
    Box(Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccess = true
                    settings.mediaPlaybackRequiresUserGesture = true
                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) { loading = true }
                        override fun onPageFinished(view: WebView, url: String?) {
                            val userJson = "{\\\"id\\\":\\\"${escapeJs(session.userId)}\\\",\\\"fullName\\\":\\\"${escapeJs(session.fullName)}\\\",\\\"phone\\\":\\\"${escapeJs(session.phone)}\\\"}"
                            view.evaluateJavascript(
                                "localStorage.setItem('nyasa_token','${escapeJs(session.token)}');" +
                                    "localStorage.setItem('nyasa_family_id','${escapeJs(session.familyId)}');" +
                                    "localStorage.setItem('nyasa_user','$userJson');",
                                null
                            )
                            loading = false
                        }
                    }
                    loadUrl(BuildConfig.WEB_BASE_URL.trimEnd('/') + (route.webPath ?: "/dashboard"))
                    webView = this
                }
            },
            update = { view ->
                val target = BuildConfig.WEB_BASE_URL.trimEnd('/') + (route.webPath ?: "/dashboard")
                if (view.url?.substringBefore('?') != target) view.loadUrl(target)
            }
        )
        AnimatedVisibility(loading, enter = fadeIn(), exit = fadeOut()) {
            LinearProgressIndicator(Modifier.fillMaxWidth().align(Alignment.TopCenter), color = Gold)
        }
    }
}

private fun routeFromDeepLink(uri: Uri?): AppRoute {
    val path = uri?.path.orEmpty()
    return AppRoute.entries.firstOrNull { it.webPath == path } ?: AppRoute.Darshan
}

private fun escapeJs(value: String): String = value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ")
