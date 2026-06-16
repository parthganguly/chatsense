package com.thegreatparthicle.chatsense;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.util.Base64;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    private static final String SHARED_FILE_EVENT = "chatsense-shared-file";
    private static final String SHARED_FILE_ERROR_EVENT = "chatsense-shared-file-error";
    private Intent pendingIntent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        dispatchIntentAfterLoad(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        dispatchIntentAfterLoad(intent);
    }

    private void dispatchIntentAfterLoad(Intent intent) {
        pendingIntent = intent;
        dispatchPendingIntentAfterLoad();
    }

    private void dispatchPendingIntentAfterLoad() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (pendingIntent == null || bridge == null || bridge.getWebView() == null) {
                return;
            }

            dispatchIncomingFile(pendingIntent);
            pendingIntent = null;
        }, 1200);
    }

    private void dispatchIncomingFile(Intent intent) {
        Uri uri = sharedFileUri(intent);

        if (uri == null) {
            return;
        }

        try {
            byte[] bytes = readAllBytes(uri);
            JSONObject detail = new JSONObject();
            detail.put("name", getDisplayName(uri));
            detail.put("mimeType", getContentResolver().getType(uri));
            detail.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));

            dispatchWebEvent(SHARED_FILE_EVENT, detail);
        } catch (Exception exception) {
            dispatchShareError(uri, exception);
        }
    }

    private Uri sharedFileUri(Intent intent) {
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            return intent.getParcelableExtra(Intent.EXTRA_STREAM);
        } else if (Intent.ACTION_VIEW.equals(intent.getAction())) {
            return intent.getData();
        }

        return null;
    }

    private void dispatchShareError(Uri uri, Exception exception) {
        try {
            JSONObject detail = new JSONObject();
            detail.put("code", "shared_file_read_failed");
            detail.put("errorType", exception.getClass().getSimpleName());
            detail.put("name", uri == null ? JSONObject.NULL : getDisplayName(uri));
            detail.put("message", "ChatSense could not read the shared export. Try selecting the ZIP manually.");
            dispatchWebEvent(SHARED_FILE_ERROR_EVENT, detail);
        } catch (Exception ignored) {
            // If the WebView is unavailable, there is nowhere safe to report this failure.
        }
    }

    private void dispatchWebEvent(String eventName, JSONObject detail) {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        String script = "window.dispatchEvent(new CustomEvent(" + JSONObject.quote(eventName) + ",{detail:" + detail + "}))";
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(script, null));
    }

    private byte[] readAllBytes(Uri uri) throws Exception {
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) {
                throw new IllegalStateException("No input stream available for shared file.");
            }

            byte[] buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = input.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }

            return output.toByteArray();
        }
    }

    private String getDisplayName(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameIndex >= 0) {
                    return cursor.getString(nameIndex);
                }
            }
        } catch (Exception ignored) {
        }

        String lastPath = uri.getLastPathSegment();
        return lastPath == null ? "WhatsApp Chat.zip" : lastPath;
    }
}
