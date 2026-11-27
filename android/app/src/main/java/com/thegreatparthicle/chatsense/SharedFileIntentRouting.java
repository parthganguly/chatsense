package com.thegreatparthicle.chatsense;

final class SharedFileIntentRouting {
    static final String ACTION_SEND = "android.intent.action.SEND";
    static final String ACTION_VIEW = "android.intent.action.VIEW";

    private Object lastForwardedToken;

    boolean shouldForward(Object token, String action, String streamUri, String dataUri) {
        if (!isSupportedShareIntent(action, streamUri, dataUri)) {
            return false;
        }

        if (token != null && token == lastForwardedToken) {
            return false;
        }

        lastForwardedToken = token;
        return true;
    }

    private boolean isSupportedShareIntent(String action, String streamUri, String dataUri) {
        if (ACTION_SEND.equals(action)) {
            return isContentUri(streamUri);
        }

        if (ACTION_VIEW.equals(action)) {
            return isContentUri(dataUri);
        }

        return false;
    }

    // Shared exports arrive only as provider content:// URIs. Any other scheme
    // (file://, android.resource://, http(s)://, ...) is ignored before it can
    // reach the ContentResolver. Matches android.net.Uri's case-sensitive scheme.
    static boolean isContentUri(String uri) {
        return uri != null && uri.startsWith("content://") && uri.length() > "content://".length();
    }
}
