package com.thegreatparthicle.chatsense;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import com.thegreatparthicle.chatsense.plugins.SharedFilePlugin;

public class MainActivity extends BridgeActivity {
    private final SharedFileIntentRouting sharedFileIntentRouting = new SharedFileIntentRouting();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SharedFilePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        forwardSharedIntent(intent);
    }

    private void forwardSharedIntent(Intent intent) {
        if (intent == null || getBridge() == null || !shouldForwardSharedIntent(intent)) {
            return;
        }

        PluginHandle handle = getBridge().getPlugin("SharedFile");
        if (handle == null || !(handle.getInstance() instanceof SharedFilePlugin)) {
            return;
        }

        ((SharedFilePlugin) handle.getInstance()).handleSharedIntent(intent);
    }

    private boolean shouldForwardSharedIntent(Intent intent) {
        return sharedFileIntentRouting.shouldForward(
            intent,
            intent.getAction(),
            streamUriString(intent),
            dataUriString(intent)
        );
    }

    @SuppressWarnings("deprecation")
    private String streamUriString(Intent intent) {
        Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        return uri == null ? null : uri.toString();
    }

    private String dataUriString(Intent intent) {
        Uri uri = intent.getData();
        return uri == null ? null : uri.toString();
    }
}
