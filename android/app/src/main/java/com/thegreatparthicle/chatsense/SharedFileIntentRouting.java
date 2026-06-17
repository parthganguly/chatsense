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
            return streamUri != null && !streamUri.trim().isEmpty();
        }

        if (ACTION_VIEW.equals(action)) {
            return dataUri != null && !dataUri.trim().isEmpty();
        }

        return false;
    }
}
