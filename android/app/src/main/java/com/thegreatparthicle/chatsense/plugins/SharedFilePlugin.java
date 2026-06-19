package com.thegreatparthicle.chatsense.plugins;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;

@CapacitorPlugin(name = "SharedFile")
public class SharedFilePlugin extends Plugin {
    private static final String FILE_AVAILABLE_EVENT = "sharedFileAvailable";
    private static final String FILE_ERROR_EVENT = "sharedFileError";
    private SharedFileImportManager manager;

    @Override
    public void load() {
        manager = new SharedFileImportManager(getContext().getCacheDir());
        manager.cleanupStaleFiles(System.currentTimeMillis());
    }

    public void handleSharedIntent(Intent intent) {
        if (intent == null) {
            return;
        }

        execute(() -> processSharedIntent(intent));
    }

    @PluginMethod
    public void getPendingSharedFile(PluginCall call) {
        call.resolve(getManager().consumePending().toJSObject());
    }

    @PluginMethod
    public void releaseSharedFile(PluginCall call) {
        String id = call.getString("id");
        getManager().release(id);
        call.resolve();
    }

    private void processSharedIntent(Intent intent) {
        Uri uri = sharedFileUri(intent);
        if (uri == null) {
            return;
        }

        String displayName = getDisplayName(uri);
        String mimeType = getContentResolverType(uri, intent);
        long sizeBytes = getSizeBytes(uri);

        try {
            InputStream input = getContext().getContentResolver().openInputStream(uri);
            SharedFileImportManager.ImportResult result = getManager().importSharedFile(input, displayName, mimeType, sizeBytes);
            if (result.isFile()) {
                notifyListeners(FILE_AVAILABLE_EVENT, result.file.toJSObject(), true);
            } else {
                publishError(result.error);
            }
        } catch (SharedFileImportManager.SharedFileImportException exception) {
            publishError(exception.error);
        } catch (Exception exception) {
            publishError(SharedFileImportManager.SharedFileError.copyFailed(displayName, exception));
        }
    }

    private void publishError(SharedFileImportManager.SharedFileError error) {
        getManager().setPendingError(error);
        notifyListeners(FILE_ERROR_EVENT, error.toJSObject(), true);
    }

    @SuppressWarnings("deprecation")
    private Uri sharedFileUri(Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action)) {
            return intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }

        if (Intent.ACTION_VIEW.equals(action)) {
            return intent.getData();
        }

        return null;
    }

    private String getContentResolverType(Uri uri, Intent intent) {
        String mimeType = intent.getType();
        if (mimeType != null) {
            return mimeType;
        }

        try {
            return getContext().getContentResolver().getType(uri);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getDisplayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
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

    private long getSizeBytes(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) {
                    return cursor.getLong(sizeIndex);
                }
            }
        } catch (Exception ignored) {
        }

        return -1;
    }

    private SharedFileImportManager getManager() {
        if (manager == null) {
            manager = new SharedFileImportManager(getContext().getCacheDir());
        }
        return manager;
    }
}
