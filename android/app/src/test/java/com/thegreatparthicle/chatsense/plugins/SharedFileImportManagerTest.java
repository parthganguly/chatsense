package com.thegreatparthicle.chatsense.plugins;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;

public class SharedFileImportManagerTest {
    @Rule
    public TemporaryFolder temporaryFolder = new TemporaryFolder();

    @Test
    public void importsTextFileIntoPrivateCache() throws Exception {
        SharedFileImportManager manager = manager(1024);

        SharedFileImportManager.ImportResult result = manager.importSharedFile(
            stream("hello"),
            "WhatsApp Chat.txt",
            "text/plain",
            5
        );

        assertTrue(result.isFile());
        assertEquals("WhatsApp Chat.txt", result.file.name);
        assertEquals("text/plain", result.file.mimeType);
        assertEquals(5, result.file.sizeBytes);
        assertTrue(result.file.file.exists());
        assertTrue(result.file.file.getName().endsWith("-WhatsApp Chat.txt"));
    }

    @Test
    public void importsZipFileWithGenericMimeTypeWhenExtensionIsSupported() throws Exception {
        SharedFileImportManager manager = manager(1024);

        SharedFileImportManager.ImportResult result = manager.importSharedFile(
            stream("zip"),
            "WhatsApp Chat.zip",
            "application/octet-stream",
            3
        );

        assertTrue(result.isFile());
        assertEquals("application/octet-stream", result.file.mimeType);
    }

    @Test
    public void rejectsUnsupportedExtension() throws Exception {
        SharedFileImportManager manager = manager(1024);

        SharedFileImportManager.ImportResult result = manager.importSharedFile(
            stream("{}"),
            "export.json",
            "application/json",
            2
        );

        assertFalse(result.isFile());
        assertEquals("unsupported_file", result.error.code);
        assertFalse(new File(cacheDirectory(), SharedFileImportManager.CACHE_DIRECTORY).exists());
    }

    @Test
    public void rejectsKnownSizeBeforeCopying() throws Exception {
        SharedFileImportManager manager = manager(4);

        SharedFileImportManager.ImportResult result = manager.importSharedFile(
            stream("hello"),
            "WhatsApp Chat.txt",
            "text/plain",
            5
        );

        assertFalse(result.isFile());
        assertEquals("file_too_large", result.error.code);
    }

    @Test
    public void enforcesStreamingSizeLimitAndDeletesPartialFile() throws Exception {
        SharedFileImportManager manager = manager(4);

        try {
            manager.importSharedFile(stream("hello"), "WhatsApp Chat.txt", "text/plain", -1);
        } catch (SharedFileImportManager.SharedFileImportException exception) {
            assertEquals("file_too_large", exception.error.code);
        }

        File cache = new File(cacheDirectory(), SharedFileImportManager.CACHE_DIRECTORY);
        File[] files = cache.listFiles();
        assertTrue(files == null || files.length == 0);
    }

    @Test
    public void sanitizesDangerousDisplayNames() throws Exception {
        SharedFileImportManager manager = manager(1024);

        SharedFileImportManager.ImportResult result = manager.importSharedFile(
            stream("hello"),
            "..\\..//WhatsApp: Chat.txt",
            "text/plain",
            5
        );

        assertTrue(result.isFile());
        assertEquals("._.__WhatsApp_ Chat.txt", result.file.name);
        assertFalse(result.file.file.getName().contains(".."));
        assertFalse(result.file.file.getName().contains("\\"));
        assertFalse(result.file.file.getName().contains("/"));
    }

    @Test
    public void usesCollisionSafeCacheNames() throws Exception {
        SharedFileImportManager manager = manager(1024);

        SharedFileImportManager.ImportResult first = manager.importSharedFile(
            stream("one"),
            "WhatsApp Chat.txt",
            "text/plain",
            3
        );
        SharedFileImportManager.ImportResult second = manager.importSharedFile(
            stream("two"),
            "WhatsApp Chat.txt",
            "text/plain",
            3
        );

        assertNotEquals(first.file.id, second.file.id);
        assertNotEquals(first.file.file.getName(), second.file.file.getName());
        assertTrue(first.file.file.exists());
        assertTrue(second.file.file.exists());
    }

    @Test
    public void consumesPendingFileOnce() throws Exception {
        SharedFileImportManager manager = manager(1024);
        SharedFileImportManager.ImportResult result = manager.importSharedFile(
            stream("hello"),
            "WhatsApp Chat.txt",
            "text/plain",
            5
        );

        assertEquals(result.file.id, manager.consumePending().file.id);
        assertNull(manager.consumePending().file);
    }

    @Test
    public void consumesPendingErrorOnce() throws Exception {
        SharedFileImportManager manager = manager(1024);
        manager.setPendingError(SharedFileImportManager.SharedFileError.missingUri("missing.txt"));

        assertEquals("missing_uri", manager.consumePending().error.code);
        assertNull(manager.consumePending().error);
    }

    @Test
    public void releaseDeletesCachedFile() throws Exception {
        SharedFileImportManager manager = manager(1024);
        SharedFileImportManager.ImportResult result = manager.importSharedFile(
            stream("hello"),
            "WhatsApp Chat.txt",
            "text/plain",
            5
        );

        assertTrue(manager.release(result.file.id));
        assertFalse(result.file.file.exists());
        assertFalse(manager.release(result.file.id));
    }

    @Test
    public void cleanupStaleFilesDeletesOldFilesOnly() throws Exception {
        SharedFileImportManager manager = manager(1024, 1000);
        SharedFileImportManager.ImportResult oldFile = manager.importSharedFile(
            stream("old"),
            "old.txt",
            "text/plain",
            3
        );
        SharedFileImportManager.ImportResult freshFile = manager.importSharedFile(
            stream("fresh"),
            "fresh.txt",
            "text/plain",
            5
        );

        assertTrue(oldFile.file.file.setLastModified(1));
        assertTrue(freshFile.file.file.setLastModified(5000));

        assertEquals(1, manager.cleanupStaleFiles(5001));
        assertFalse(oldFile.file.file.exists());
        assertTrue(freshFile.file.file.exists());
    }

    private SharedFileImportManager manager(long maxBytes) throws Exception {
        return manager(maxBytes, 1000);
    }

    private SharedFileImportManager manager(long maxBytes, long staleAgeMillis) throws Exception {
        return new SharedFileImportManager(cacheDirectory(), maxBytes, staleAgeMillis);
    }

    private File cacheDirectory() throws Exception {
        return temporaryFolder.getRoot();
    }

    private ByteArrayInputStream stream(String value) {
        return new ByteArrayInputStream(value.getBytes(StandardCharsets.UTF_8));
    }
}
