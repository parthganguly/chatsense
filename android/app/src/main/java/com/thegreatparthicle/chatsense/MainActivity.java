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
    private Intent pendingIntent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        pendingIntent = getIntent();
        dispatchPendingIntentAfterLoad();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        pendingIntent = intent;
        dispatchPendingIntentAfterLoad();
    }

    private void dispatchPendingIntentAfterLoad() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (pendingIntent == null || bridge == null || bridge.getWebView() == null) {
                return;
            }

            handleIncomingFile(pendingIntent);
            pendingIntent = null;
        }, 1200);
    }

    private void handleIncomingFile(Intent intent) {
        Uri uri = null;

        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        } else if (Intent.ACTION_VIEW.equals(intent.getAction())) {
            uri = intent.getData();
        }

        if (uri == null) {
            return;
        }

        try {
            byte[] bytes = readAllBytes(uri);
            JSONObject detail = new JSONObject();
            detail.put("name", getDisplayName(uri));
            detail.put("mimeType", getContentResolver().getType(uri));
            detail.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));

            String script = "window.dispatchEvent(new CustomEvent('chatsense-shared-file',{detail:" + detail + "}))";
            bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(script, null));
        } catch (Exception ignored) {
        }
    }

    private byte[] readAllBytes(Uri uri) throws Exception {
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) {
                return new byte[0];
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
