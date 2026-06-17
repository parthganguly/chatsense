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
