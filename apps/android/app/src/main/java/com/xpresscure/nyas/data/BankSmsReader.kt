package com.xpresscure.nyas.data

import android.content.Context
import android.provider.Telephony
import java.util.Locale

data class BankSmsMatch(
    val amountRupees: Long,
    val utr: String = "",
    val receivedAtMillis: Long,
    val sender: String
)

object BankSmsReader {
    private val debitWords = listOf("debited", "paid", "sent", "transferred", "txn of", "purchase")
    private val amountPatterns = listOf(
        Regex("(?:inr|rs\\.?|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", RegexOption.IGNORE_CASE),
        Regex("([0-9,]+(?:\\.[0-9]{1,2})?)\\s*(?:inr|rs\\.?)", RegexOption.IGNORE_CASE)
    )
    private val referencePatterns = listOf(
        Regex("(?:utr|upi ref(?:erence)?|ref(?:erence)?(?: no)?|txn id)[:#\\s-]*([a-z0-9]{6,40})", RegexOption.IGNORE_CASE),
        Regex("\\b([0-9]{12})\\b")
    )

    fun latestOutgoingPayment(context: Context, sinceMillis: Long = System.currentTimeMillis() - 30 * 60 * 1000): BankSmsMatch? {
        val projection = arrayOf(
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE
        )
        context.contentResolver.query(
            Telephony.Sms.Inbox.CONTENT_URI,
            projection,
            "${Telephony.Sms.DATE} >= ?",
            arrayOf(sinceMillis.toString()),
            "${Telephony.Sms.DATE} DESC"
        )?.use { cursor ->
            val senderIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val bodyIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val dateIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
            while (cursor.moveToNext()) {
                val body = cursor.getString(bodyIndex).orEmpty()
                val lower = body.lowercase(Locale.ENGLISH)
                if (debitWords.none(lower::contains)) continue
                val amount = amountPatterns.firstNotNullOfOrNull { pattern ->
                    pattern.find(body)?.groupValues?.getOrNull(1)?.replace(",", "")?.toDoubleOrNull()?.toLong()
                } ?: continue
                if (amount <= 0) continue
                val reference = referencePatterns.firstNotNullOfOrNull { pattern ->
                    pattern.find(body)?.groupValues?.getOrNull(1)
                }.orEmpty().uppercase(Locale.ENGLISH)
                return BankSmsMatch(amount, reference, cursor.getLong(dateIndex), cursor.getString(senderIndex).orEmpty())
            }
        }
        return null
    }
}
