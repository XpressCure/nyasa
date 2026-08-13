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

val Forest = Color(0xFF8E4352)
val Leaf = Color(0xFFC98591)
val Gold = Color(0xFFC99668)
val Marigold = Color(0xFFE6B89A)
val Canvas = Color(0xFFFFF9F7)
val Surface = Color(0xFFFFFFFF)
val Ink = Color(0xFF34292D)
val Muted = Color(0xFF77676D)
val Success = Color(0xFF3D7B59)
val Sage = Color(0xFFFBEDEF)
val Mist = Color(0xFFF5EDF1)
val Blush = Color(0xFFF9E5E8)
val Petal = Color(0xFFF4E9ED)
val Sunlight = Color(0xFFFFF2EA)

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
    surfaceVariant = Color(0xFFF8F0F2),
    onSurfaceVariant = Muted,
    outline = Color(0xFFE7D9DD),
    outlineVariant = Color(0xFFF0E6E9),
    tertiary = Color(0xFF9A6573),
    tertiaryContainer = Mist,
    onTertiaryContainer = Color(0xFF5A3340),
    error = Color(0xFFB3261E)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFE5AAB5),
    secondary = Marigold,
    background = Color(0xFF20171A),
    surface = Color(0xFF2B1E23),
    onSurface = Color(0xFFFFF4F6)
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
