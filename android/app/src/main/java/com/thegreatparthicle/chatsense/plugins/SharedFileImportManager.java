package com.thegreatparthicle.chatsense.plugins;

import com.getcapacitor.JSObject;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public class SharedFileImportManager {
    public static final String CACHE_DIRECTORY = "chatsense-shared-imports";
    public static final long DEFAULT_MAX_IMPORT_BYTES = 50L * 1024L * 1024L;
    public static final long DEFAULT_STALE_AGE_MILLIS = 24L * 60L * 60L * 1000L;

    private static final int BUFFER_SIZE = 8192;

    private final File cacheDirectory;
    private final long maxImportBytes;
    private final long staleAgeMillis;
    private final Map<String, SharedFile> activeFiles = new HashMap<>();
    private SharedFile pendingFile;
    private SharedFileError pendingError;

    public SharedFileImportManager(File parentCacheDirectory) {
        this(new File(parentCacheDirectory, CACHE_DIRECTORY), DEFAULT_MAX_IMPORT_BYTES, DEFAULT_STALE_AGE_MILLIS);
    }

    SharedFileImportManager(File cacheDirectory, long maxImportBytes, long staleAgeMillis) {
        this.cacheDirectory = cacheDirectory;
        this.maxImportBytes = maxImportBytes;
        this.staleAgeMillis = staleAgeMillis;
    }

    public synchronized ImportResult importSharedFile(
        InputStream input,
        String displayName,
        String mimeType,
        long knownSizeBytes
    ) throws IOException {
        if (input == null) {
            return ImportResult.error(SharedFileError.missingUri(displayName));
        }

        ValidationResult validation = validateMetadata(displayName, mimeType, knownSizeBytes);
        if (!validation.isValid()) {
            closeQuietly(input);
            return ImportResult.error(validation.error);
        }

        ensureCacheDirectory();
        String id = UUID.randomUUID().toString();
        String safeName = sanitizeDisplayName(displayName);
        File destination = new File(cacheDirectory, id + "-" + safeName);
        long copiedBytes = copyWithLimit(input, destination);

        SharedFile file = new SharedFile(
            id,
            safeName,
            normalizeMimeType(mimeType, safeName),
            copiedBytes,
            destination
        );
        activeFiles.put(file.id, file);
        pendingFile = file;
        pendingError = null;
        return ImportResult.file(file);
    }

    public synchronized void setPendingError(SharedFileError error) {
        pendingFile = null;
        pendingError = error;
    }

    public synchronized PendingSharedFile consumePending() {
        PendingSharedFile pending = new PendingSharedFile(pendingFile, pendingError);
        pendingFile = null;
        pendingError = null;
        return pending;
    }

    public synchronized boolean release(String id) {
        if (id == null || id.trim().isEmpty()) {
            return false;
        }

        SharedFile file = activeFiles.remove(id);
        return file != null && (!file.file.exists() || file.file.delete());
    }

    public synchronized int cleanupStaleFiles(long nowMillis) {
        if (!cacheDirectory.exists()) {
            return 0;
        }

        int removed = 0;
        File[] files = cacheDirectory.listFiles();
        if (files == null) {
            return 0;
        }

        for (File file : files) {
            if (!file.isFile()) {
                continue;
            }

            if (nowMillis - file.lastModified() > staleAgeMillis && file.delete()) {
                removed += 1;
                activeFiles.entrySet().removeIf(entry -> entry.getValue().file.equals(file));
                if (pendingFile != null && pendingFile.file.equals(file)) {
                    pendingFile = null;
                }
            }
        }

        return removed;
    }

    ValidationResult validateMetadata(String displayName, String mimeType, long knownSizeBytes) {
        String safeName = sanitizeDisplayName(displayName);
        if (!hasSupportedExtension(safeName)) {
            return ValidationResult.invalid(SharedFileError.unsupportedFile(displayName, mimeType));
        }

        if (!hasSupportedMimeType(mimeType, safeName)) {
            return ValidationResult.invalid(SharedFileError.unsupportedFile(displayName, mimeType));
        }

        if (knownSizeBytes > maxImportBytes) {
            return ValidationResult.invalid(SharedFileError.fileTooLarge(displayName, maxImportBytes));
        }

        return ValidationResult.valid();
    }

    String sanitizeDisplayName(String displayName) {
        String fallback = "WhatsApp Chat.zip";
        String name = displayName == null ? fallback : displayName.trim();
        name = name.replace('\\', '_').replace('/', '_').replace(':', '_');
        name = name.replaceAll("[\\p{Cntrl}]", "_");
        while (name.contains("..")) {
            name = name.replace("..", ".");
        }
        name = name.replaceAll("\\s+", " ").trim();

        if (name.isEmpty() || ".".equals(name)) {
            name = fallback;
        }

        if (name.length() > 120) {
            String extension = extensionOf(name);
            int baseLength = Math.max(1, 120 - extension.length());
            name = name.substring(0, Math.min(baseLength, name.length())).trim() + extension;
        }

        return name;
    }

    private void ensureCacheDirectory() throws IOException {
        if (cacheDirectory.exists()) {
            if (!cacheDirectory.isDirectory()) {
                throw new IOException("Shared import cache path is not a directory.");
            }
            return;
        }

        if (!cacheDirectory.mkdirs()) {
            throw new IOException("Could not create shared import cache directory.");
        }
    }

    private long copyWithLimit(InputStream input, File destination) throws IOException {
        long totalBytes = 0;
        byte[] buffer = new byte[BUFFER_SIZE];

        try (InputStream source = input; FileOutputStream output = new FileOutputStream(destination)) {
            int bytesRead;
            while ((bytesRead = source.read(buffer)) != -1) {
                totalBytes += bytesRead;
                if (totalBytes > maxImportBytes) {
                    output.close();
                    if (destination.exists()) {
                        destination.delete();
                    }
                    throw new SharedFileImportException(SharedFileError.fileTooLarge(destination.getName(), maxImportBytes));
                }
                output.write(buffer, 0, bytesRead);
            }
        } catch (SharedFileImportException exception) {
            throw exception;
        } catch (IOException exception) {
            if (destination.exists()) {
                destination.delete();
            }
            throw exception;
        }

        return totalBytes;
    }

    private void closeQuietly(InputStream input) {
        try {
            input.close();
        } catch (IOException ignored) {
        }
    }

    private boolean hasSupportedExtension(String displayName) {
        String normalized = displayName.toLowerCase(Locale.US);
        return normalized.endsWith(".zip") || normalized.endsWith(".txt");
    }

    private boolean hasSupportedMimeType(String mimeType, String displayName) {
        if (mimeType == null || mimeType.trim().isEmpty()) {
            return true;
        }

        String normalizedMime = mimeType.toLowerCase(Locale.US);
        if ("application/octet-stream".equals(normalizedMime) || "binary/octet-stream".equals(normalizedMime)) {
            return hasSupportedExtension(displayName);
        }

        if (displayName.toLowerCase(Locale.US).endsWith(".zip")) {
            return "application/zip".equals(normalizedMime) || "application/x-zip-compressed".equals(normalizedMime);
        }

        return "text/plain".equals(normalizedMime) || "text/*".equals(normalizedMime);
    }

    private String normalizeMimeType(String mimeType, String displayName) {
        if (mimeType != null && !mimeType.trim().isEmpty()) {
            return mimeType;
        }

        return displayName.toLowerCase(Locale.US).endsWith(".txt") ? "text/plain" : "application/zip";
    }

    private String extensionOf(String name) {
        int index = name.lastIndexOf('.');
        return index >= 0 ? name.substring(index) : "";
    }

    public static class ImportResult {
        public final SharedFile file;
        public final SharedFileError error;

        private ImportResult(SharedFile file, SharedFileError error) {
            this.file = file;
            this.error = error;
        }

        static ImportResult file(SharedFile file) {
            return new ImportResult(file, null);
        }

        static ImportResult error(SharedFileError error) {
            return new ImportResult(null, error);
        }

        public boolean isFile() {
            return file != null;
        }
    }

    public static class PendingSharedFile {
        public final SharedFile file;
        public final SharedFileError error;

        PendingSharedFile(SharedFile file, SharedFileError error) {
            this.file = file;
            this.error = error;
        }

        public JSObject toJSObject() {
            JSObject result = new JSObject();
            result.put("file", file == null ? JSONObject.NULL : file.toJSObject());
            result.put("error", error == null ? JSONObject.NULL : error.toJSObject());
            return result;
        }
    }

    public static class SharedFile {
        public final String id;
        public final String name;
        public final String mimeType;
        public final long sizeBytes;
        public final File file;

        SharedFile(String id, String name, String mimeType, long sizeBytes, File file) {
            this.id = id;
            this.name = name;
            this.mimeType = mimeType;
            this.sizeBytes = sizeBytes;
            this.file = file;
        }

        public JSObject toJSObject() {
            JSObject result = new JSObject();
            result.put("id", id);
            result.put("name", name);
            result.put("mimeType", mimeType);
            result.put("sizeBytes", sizeBytes);
            result.put("uri", file.toURI().toString());
            return result;
        }
    }

    public static class SharedFileError {
        public final String code;
        public final String message;
        public final String errorType;
        public final String name;

        SharedFileError(String code, String message, String errorType, String name) {
            this.code = code;
            this.message = message;
            this.errorType = errorType;
            this.name = name;
        }

        static SharedFileError missingUri(String name) {
            return new SharedFileError(
                "missing_uri",
                "ChatSense could not access a shared file. Try selecting the WhatsApp export ZIP manually.",
                "MissingUri",
                name
            );
        }

        static SharedFileError unsupportedFile(String name, String mimeType) {
            return new SharedFileError(
                "unsupported_file",
                "This file type is not supported. Share the WhatsApp export ZIP or TXT file.",
                mimeType == null ? "UnsupportedFile" : "UnsupportedFile:" + mimeType,
                name
            );
        }

        static SharedFileError fileTooLarge(String name, long maxBytes) {
            long maxMegabytes = Math.max(1, maxBytes / (1024L * 1024L));
            return new SharedFileError(
                "file_too_large",
                "This WhatsApp export is too large for local import. Try exporting without media or use a smaller TXT export. Limit: " + maxMegabytes + " MB.",
                "FileTooLarge",
                name
            );
        }

        static SharedFileError copyFailed(String name, Exception exception) {
            return new SharedFileError(
                "copy_failed",
                "ChatSense could not copy the shared export into private app storage. Try selecting the ZIP manually.",
                exception == null ? "CopyFailed" : exception.getClass().getSimpleName(),
                name
            );
        }

        public JSObject toJSObject() {
            JSObject result = new JSObject();
            result.put("code", code);
            result.put("message", message);
            result.put("errorType", errorType);
            result.put("name", name == null ? JSONObject.NULL : name);
            return result;
        }
    }

    static class ValidationResult {
        final SharedFileError error;

        private ValidationResult(SharedFileError error) {
            this.error = error;
        }

        static ValidationResult valid() {
            return new ValidationResult(null);
        }

        static ValidationResult invalid(SharedFileError error) {
            return new ValidationResult(error);
        }

        boolean isValid() {
            return error == null;
        }
    }

    public static class SharedFileImportException extends IOException {
        public final SharedFileError error;

        SharedFileImportException(SharedFileError error) {
            super(error.message);
            this.error = error;
        }
    }
}
