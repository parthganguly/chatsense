package com.thegreatparthicle.chatsense.shareintent

import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Parcelable
import android.provider.OpenableColumns
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

class ChatSenseShareIntentModule : Module() {
  private var lastPayload: SharedChatFile? = null
  private var consumedIntentKey: String? = null

  override fun definition() = ModuleDefinition {
    Name("ChatSenseShareIntent")

    Events("onIncomingFile")

    OnCreate {
      captureCurrentIntent()
    }

    OnActivityEntersForeground {
      captureCurrentIntent()
    }

    OnNewIntent { intent ->
      captureIntent(intent, emit = true, force = true)
    }

    Function("getInitialFile") {
      captureCurrentIntent()
      return@Function lastPayload?.toMap()
    }

    Function("clearInitialFile") {
      consumedIntentKey = lastPayload?.sourceKey ?: consumedIntentKey
      lastPayload?.deleteCacheFile()
      lastPayload = null
    }
  }

  private fun captureCurrentIntent() {
    val intent = appContext.currentActivity?.intent ?: return
    captureIntent(intent, emit = false, force = false)
  }

  private fun captureIntent(intent: Intent, emit: Boolean, force: Boolean) {
    val source = sourceFromIntent(intent) ?: return
    if (!force && source.key == consumedIntentKey && lastPayload == null) {
      return
    }

    val payload = copySourceToCache(source) ?: return
    lastPayload = payload

    if (emit) {
      sendEvent("onIncomingFile", payload.toMap())
    }
  }

  private fun sourceFromIntent(intent: Intent): SharedChatSource? {
    val action = when (intent.action) {
      Intent.ACTION_SEND -> "send"
      Intent.ACTION_VIEW -> "view"
      else -> return null
    }

    val uri = when (intent.action) {
      Intent.ACTION_SEND -> intent.getParcelableExtraCompat<Uri>(Intent.EXTRA_STREAM)
      Intent.ACTION_VIEW -> intent.data
      else -> null
    } ?: return null
    if (uri.scheme !in setOf("content", "file")) {
      return null
    }

    val context = appContext.reactContext ?: return null
    val mimeType = context.contentResolver.getType(uri) ?: intent.type
    val name = getDisplayName(context, uri) ?: uri.lastPathSegment ?: "WhatsApp Chat.zip"
    val size = getContentSize(context, uri)
    val key = "${intent.action}|$uri|${mimeType ?: ""}|$name"

    return SharedChatSource(
      action = action,
      key = key,
      mimeType = mimeType,
      name = name,
      size = size,
      uri = uri,
    )
  }

  private fun copySourceToCache(source: SharedChatSource): SharedChatFile? {
    val context = appContext.reactContext ?: return null
    val cacheDir = File(context.cacheDir, "chatsense-shared")
    if (!cacheDir.exists()) {
      cacheDir.mkdirs()
    }

    val safeName = source.name.replace(Regex("[^A-Za-z0-9._-]"), "_").ifBlank {
      "WhatsApp_Chat.zip"
    }
    val target = File(cacheDir, "${System.currentTimeMillis()}-$safeName")

    return try {
      context.contentResolver.openInputStream(source.uri)?.use { input ->
        FileOutputStream(target).use { output ->
          input.copyTo(output)
        }
      } ?: return null

      SharedChatFile(
        action = source.action,
        deleteAfterRead = true,
        mimeType = source.mimeType,
        name = source.name,
        receivedAt = System.currentTimeMillis(),
        size = source.size ?: target.length(),
        sourceKey = source.key,
        uri = Uri.fromFile(target).toString(),
      )
    } catch (_: Exception) {
      target.delete()
      null
    }
  }

  private fun getDisplayName(context: Context, uri: Uri): String? {
    return queryOpenableColumn(context, uri, OpenableColumns.DISPLAY_NAME) { cursor, index ->
      cursor.getString(index)
    }
  }

  private fun getContentSize(context: Context, uri: Uri): Long? {
    return queryOpenableColumn(context, uri, OpenableColumns.SIZE) { cursor, index ->
      cursor.getLong(index)
    }
  }

  private fun <T> queryOpenableColumn(
    context: Context,
    uri: Uri,
    column: String,
    read: (Cursor, Int) -> T,
  ): T? {
    return try {
      context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        if (!cursor.moveToFirst()) {
          return@use null
        }
        val index = cursor.getColumnIndex(column)
        if (index >= 0) read(cursor, index) else null
      }
    } catch (_: Exception) {
      null
    }
  }

  private inline fun <reified T : Parcelable> Intent.getParcelableExtraCompat(name: String): T? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getParcelableExtra(name, T::class.java)
    } else {
      @Suppress("DEPRECATION")
      getParcelableExtra(name)
    }
  }
}

private data class SharedChatSource(
  val action: String,
  val key: String,
  val mimeType: String?,
  val name: String,
  val size: Long?,
  val uri: Uri,
)

private data class SharedChatFile(
  val action: String,
  val deleteAfterRead: Boolean,
  val mimeType: String?,
  val name: String,
  val receivedAt: Long,
  val size: Long,
  val sourceKey: String,
  val uri: String,
) {
  fun toMap(): Map<String, Any?> {
    return mapOf(
      "action" to action,
      "deleteAfterRead" to deleteAfterRead,
      "mimeType" to mimeType,
      "name" to name,
      "receivedAt" to receivedAt.toDouble(),
      "size" to size.toDouble(),
      "uri" to uri,
    )
  }

  fun deleteCacheFile() {
    try {
      Uri.parse(uri).path?.let { File(it).delete() }
    } catch (_: Exception) {
    }
  }
}
