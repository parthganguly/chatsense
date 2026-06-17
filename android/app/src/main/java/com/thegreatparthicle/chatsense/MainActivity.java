package com.thegreatparthicle.chatsense;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import com.thegreatparthicle.chatsense.plugins.SharedFilePlugin;

public class MainActivity extends BridgeActivity {
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
        if (intent == null || getBridge() == null) {
            return;
        }

        PluginHandle handle = getBridge().getPlugin("SharedFile");
        if (handle == null || !(handle.getInstance() instanceof SharedFilePlugin)) {
            return;
        }

        ((SharedFilePlugin) handle.getInstance()).handleSharedIntent(intent);
    }
}
