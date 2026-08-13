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

val Forest = Color(0xFF234B3A)
val Leaf = Color(0xFF4F7A64)
val Gold = Color(0xFFC58B2B)
val Marigold = Color(0xFFF4C96B)
val Canvas = Color(0xFFFBFAF7)
val Surface = Color(0xFFFFFFFF)
val Ink = Color(0xFF24312B)
val Muted = Color(0xFF68756E)
val Success = Color(0xFF3D7B59)
val Sage = Color(0xFFEAF3ED)
val Mist = Color(0xFFEAF3F6)
val Blush = Color(0xFFF9ECEA)
val Petal = Color(0xFFF5EEF7)
val Sunlight = Color(0xFFFFF4D9)

private val LightColors = lightColorScheme(
    primary = Forest,
    onPrimary = Color.White,
    primaryContainer = Sage,
    onPrimaryContainer = Forest,
    secondary = Gold,
    onSecondary = Ink,
    secondaryContainer = Sunlight,
    background = Canvas,
    onBackground = Ink,
    surface = Surface,
    onSurface = Ink,
    surfaceVariant = Color(0xFFF3F1EC),
    onSurfaceVariant = Muted,
    outline = Color(0xFFD9DDD7),
    outlineVariant = Color(0xFFE8EAE5),
    tertiary = Color(0xFF5D7890),
    tertiaryContainer = Mist,
    onTertiaryContainer = Color(0xFF294557),
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
