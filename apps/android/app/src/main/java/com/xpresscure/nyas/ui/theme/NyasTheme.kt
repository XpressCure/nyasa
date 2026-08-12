package com.xpresscure.nyas.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.material3.Typography
import androidx.compose.ui.unit.sp

val Forest = Color(0xFF14251D)
val Leaf = Color(0xFF245F43)
val Gold = Color(0xFFD9A441)
val Marigold = Color(0xFFFFC85A)
val Canvas = Color(0xFFF8F6F0)
val Surface = Color(0xFFFFFDF8)
val Ink = Color(0xFF17201B)
val Muted = Color(0xFF5C675F)
val Success = Color(0xFF247B4B)

private val LightColors = lightColorScheme(
    primary = Forest,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE1EFE6),
    onPrimaryContainer = Forest,
    secondary = Gold,
    onSecondary = Ink,
    secondaryContainer = Color(0xFFFFE8B2),
    background = Canvas,
    onBackground = Ink,
    surface = Surface,
    onSurface = Ink,
    surfaceVariant = Color(0xFFECE9E0),
    onSurfaceVariant = Muted,
    outline = Color(0xFFC9C5B9),
    error = Color(0xFFB3261E)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFA8D5B7),
    secondary = Marigold,
    background = Color(0xFF101713),
    surface = Color(0xFF17211C),
    onSurface = Color(0xFFF0F2EC)
)

private val NyasTypography = Typography(
    displaySmall = Typography().displaySmall.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold),
    headlineLarge = Typography().headlineLarge.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.sp),
    headlineMedium = Typography().headlineMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.sp),
    titleLarge = Typography().titleLarge.copy(fontWeight = FontWeight.SemiBold, letterSpacing = 0.sp),
    titleMedium = Typography().titleMedium.copy(fontWeight = FontWeight.SemiBold, letterSpacing = 0.sp),
    bodyLarge = Typography().bodyLarge.copy(lineHeight = 24.sp, letterSpacing = 0.sp),
    bodyMedium = Typography().bodyMedium.copy(lineHeight = 20.sp, letterSpacing = 0.sp),
    labelLarge = Typography().labelLarge.copy(fontWeight = FontWeight.SemiBold, letterSpacing = 0.sp)
)

@Composable
fun NyasTheme(darkTheme: Boolean = false, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = NyasTypography,
        content = content
    )
}
