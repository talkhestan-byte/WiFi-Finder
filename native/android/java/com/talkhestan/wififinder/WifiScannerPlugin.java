
package com.talkhestan.wififinder;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
    name = "WifiScanner",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class WifiScannerPlugin extends Plugin {

    private WifiManager wifiManager;
    private BroadcastReceiver receiver;
    private PluginCall pendingCall;
    private Handler handler;

    @Override
    public void load() {
        wifiManager = (WifiManager)
            getContext().getApplicationContext()
            .getSystemService(Context.WIFI_SERVICE);

        handler = new Handler(Looper.getMainLooper());
    }

    @PluginMethod
    public void scan(PluginCall call) {

        if (pendingCall != null) {
            call.reject("اسکن قبلی هنوز در حال انجام است.");
            return;
        }

        if (getPermissionState("location")
                != PermissionState.GRANTED) {

            requestPermissionForAlias(
                "location",
                call,
                "locationPermsCallback"
            );

            return;
        }

        startWifiScan(call);
    }

    @PermissionCallback
    private void locationPermsCallback(PluginCall call) {

        if (getPermissionState("location")
                != PermissionState.GRANTED) {

            call.reject(
                "برای اسکن شبکه‌ها باید مجوز مکان دقیق را فعال کنید."
            );

            return;
        }

        startWifiScan(call);
    }

    private void startWifiScan(PluginCall call) {

        if (wifiManager == null) {
            call.reject("سرویس WiFi در گوشی در دسترس نیست.");
            return;
        }

        if (!wifiManager.isWifiEnabled()) {
            call.reject("ابتدا وای‌فای گوشی را روشن کنید.");
            return;
        }

        pendingCall = call;

        IntentFilter filter = new IntentFilter(
            WifiManager.SCAN_RESULTS_AVAILABLE_ACTION
        );

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(
                Context context,
                Intent intent
            ) {
                boolean success = intent.getBooleanExtra(
                    WifiManager.EXTRA_RESULTS_UPDATED,
                    false
                );

                finishScan(success);
            }
        };

        try {

            if (Build.VERSION.SDK_INT >= 33) {
                getContext().registerReceiver(
                    receiver,
                    filter,
                    Context.RECEIVER_NOT_EXPORTED
                );
            } else {
                getContext().registerReceiver(
                    receiver,
                    filter
                );
            }

            boolean started = wifiManager.startScan();

            if (!started) {
                finishScan(false);
                return;
            }

            handler.postDelayed(() -> {
                if (pendingCall != null) {
                    finishScan(false);
                }
            }, 15000);

        } catch (SecurityException e) {

            cleanupReceiver();

            PluginCall current = pendingCall;
            pendingCall = null;

            if (current != null) {
                current.reject(
                    "مجوز دسترسی به اطلاعات WiFi کافی نیست."
                );
            }

        } catch (Exception e) {

            cleanupReceiver();

            PluginCall current = pendingCall;
            pendingCall = null;

            if (current != null) {
                current.reject(
                    "خطا در شروع اسکن: " + e.getMessage()
                );
            }
        }
    }

    private void finishScan(boolean updated) {

        if (pendingCall == null) {
            return;
        }

        cleanupReceiver();

        PluginCall call = pendingCall;
        pendingCall = null;

        try {

            List<ScanResult> results =
                wifiManager.getScanResults();

            Collections.sort(
                results,
                (a, b) -> Integer.compare(
                    b.level,
                    a.level
                )
            );

            JSArray networks = new JSArray();

            for (ScanResult item : results) {

                JSObject network = new JSObject();

                network.put(
                    "ssid",
                    item.SSID == null ? "" : item.SSID
                );

                network.put(
                    "bssid",
                    item.BSSID == null ? "" : item.BSSID
                );

                network.put("level", item.level);

                network.put(
                    "frequency",
                    item.frequency
                );

                network.put(
                    "channel",
                    frequencyToChannel(item.frequency)
                );

                network.put(
                    "security",
                    getSecurity(item)
                );

                networks.put(network);
            }

            JSObject response = new JSObject();

            response.put("networks", networks);

            response.put(
                "message",
                updated
                    ? "اسکن جدید انجام شد."
                    : "نتایج موجود نمایش داده شدند؛ ممکن است اطلاعات مربوط به اسکن قبلی باشند."
            );

            response.put("updated", updated);

            call.resolve(response);

        } catch (SecurityException e) {

            call.reject(
                "اندروید اجازه خواندن نتایج اسکن را نداد."
            );

        } catch (Exception e) {

            call.reject(
                "خطا در دریافت شبکه‌ها: " + e.getMessage()
            );
        }
    }

    private int frequencyToChannel(int frequency) {

        if (frequency >= 2412 && frequency <= 2472) {
            return (frequency - 2407) / 5;
        }

        if (frequency == 2484) {
            return 14;
        }

        if (frequency >= 5000 && frequency <= 5900) {
            return (frequency - 5000) / 5;
        }

        if (frequency >= 5955 && frequency <= 7115) {
            return (frequency - 5950) / 5;
        }

        return 0;
    }

    private String getSecurity(ScanResult result) {

        String capabilities = result.capabilities;

        if (capabilities == null || capabilities.isEmpty()) {
            return "نامشخص";
        }

        String value = capabilities.toUpperCase(Locale.ROOT);

        if (value.contains("WPA3")) {
            return "WPA3";
        }

        if (value.contains("WPA2")) {
            return "WPA2";
        }

        if (value.contains("WPA")) {
            return "WPA";
        }

        if (value.contains("WEP")) {
            return "WEP";
        }

        if (value.contains("ESS")) {
            return "بدون رمزگذاری";
        }

        return "نامشخص";
    }

    private void cleanupReceiver() {

        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }

        if (receiver != null) {
            try {
                getContext().unregisterReceiver(receiver);
            } catch (Exception ignored) {
            }

            receiver = null;
        }
    }

    @Override
    protected void handleOnDestroy() {

        cleanupReceiver();

        if (pendingCall != null) {
            pendingCall.reject("برنامه بسته شد.");
            pendingCall = null;
        }

        super.handleOnDestroy();
    }
}
