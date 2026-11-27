package com.thegreatparthicle.chatsense;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class SharedFileIntentRoutingTest {
    @Test
    public void coldStartShareIntentRoutesOnceForTheSameActivityIntent() {
        SharedFileIntentRouting routing = new SharedFileIntentRouting();
        Object coldStartIntent = new Object();

        assertTrue(routing.shouldForward(
            coldStartIntent,
            SharedFileIntentRouting.ACTION_SEND,
            "content://provider/export.zip",
            null
        ));
        assertFalse(routing.shouldForward(
            coldStartIntent,
            SharedFileIntentRouting.ACTION_SEND,
            "content://provider/export.zip",
            null
        ));
    }

    @Test
    public void warmShareWithNewIntentCanRouteTheSameFileAgain() {
        SharedFileIntentRouting routing = new SharedFileIntentRouting();

        assertTrue(routing.shouldForward(
            new Object(),
            SharedFileIntentRouting.ACTION_SEND,
            "content://provider/export.zip",
            null
        ));
        assertTrue(routing.shouldForward(
            new Object(),
            SharedFileIntentRouting.ACTION_SEND,
            "content://provider/export.zip",
            null
        ));
    }

    @Test
    public void viewIntentRoutesWhenDataUriIsPresent() {
        SharedFileIntentRouting routing = new SharedFileIntentRouting();

        assertTrue(routing.shouldForward(
            new Object(),
            SharedFileIntentRouting.ACTION_VIEW,
            null,
            "content://provider/export.txt"
        ));
    }

    @Test
    public void normalLauncherStartupDoesNothing() {
        SharedFileIntentRouting routing = new SharedFileIntentRouting();

        assertFalse(routing.shouldForward(
            new Object(),
            "android.intent.action.MAIN",
            null,
            null
        ));
    }

    @Test
    public void sendAndViewRouteOnlyContentScheme() {
        String[] rejected = {
            "file:///data/data/com.thegreatparthicle.chatsense/cache/export.zip",
            "FILE:///sdcard/export.txt",
            "Content://provider/export.zip",
            "android.resource://com.thegreatparthicle.chatsense/raw/export",
            "https://example.invalid/export.zip",
            "http://example.invalid/export.zip",
            "/data/local/tmp/export.zip",
            "content://",
            "",
            "   ",
        };

        for (String uri : rejected) {
            SharedFileIntentRouting routing = new SharedFileIntentRouting();
            assertFalse(uri, routing.shouldForward(new Object(), SharedFileIntentRouting.ACTION_SEND, uri, null));
            assertFalse(uri, routing.shouldForward(new Object(), SharedFileIntentRouting.ACTION_VIEW, null, uri));
        }

        SharedFileIntentRouting routing = new SharedFileIntentRouting();
        assertTrue(routing.shouldForward(
            new Object(),
            SharedFileIntentRouting.ACTION_SEND,
            "content://com.whatsapp.provider.media/export.zip",
            null
        ));
        assertTrue(routing.shouldForward(
            new Object(),
            SharedFileIntentRouting.ACTION_VIEW,
            null,
            "content://com.android.providers.downloads.documents/document/1"
        ));
    }

    @Test
    public void rejectedSchemeDoesNotConsumeDuplicateToken() {
        SharedFileIntentRouting routing = new SharedFileIntentRouting();
        Object token = new Object();

        assertFalse(routing.shouldForward(token, SharedFileIntentRouting.ACTION_SEND, "file:///sdcard/export.zip", null));
        assertTrue(routing.shouldForward(token, SharedFileIntentRouting.ACTION_SEND, "content://provider/export.zip", null));
    }

    @Test
    public void shareIntentWithoutUriDoesNothing() {
        SharedFileIntentRouting routing = new SharedFileIntentRouting();

        assertFalse(routing.shouldForward(
            new Object(),
            SharedFileIntentRouting.ACTION_SEND,
            null,
            null
        ));
    }
}
