package com.xpresscure.nyas;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.SafeBrowsingResponse;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.FileOutputStream;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 7001;
    private static final int CAMERA_PERMISSION_REQUEST = 7002;
    private static final String TRUSTED_HOST = "nyasa.xpresscure.com";

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout offlinePanel;
    private ValueCallback<Uri[]> pendingFileCallback;
    private Uri pendingCameraUri;
    private WebChromeClient.FileChooserParams pendingChooserParams;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(23, 33, 28));
        getWindow().setNavigationBarColor(Color.rgb(23, 33, 28));

        setContentView(createContentView());
        configureWebView();

        if (savedInstanceState == null) {
            loadIntentOrHome(getIntent());
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private View createContentView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(247, 245, 239));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(218, 164, 66)));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3)
        );
        progressParams.gravity = Gravity.TOP;
        root.addView(progressBar, progressParams);

        offlinePanel = new LinearLayout(this);
        offlinePanel.setOrientation(LinearLayout.VERTICAL);
        offlinePanel.setGravity(Gravity.CENTER);
        offlinePanel.setPadding(dp(32), dp(32), dp(32), dp(32));
        offlinePanel.setBackgroundColor(Color.rgb(247, 245, 239));
        offlinePanel.setVisibility(View.GONE);

        ImageView logo = new ImageView(this);
        logo.setImageResource(com.xpresscure.nyas.R.drawable.nyas_logo);
        logo.setAdjustViewBounds(true);
        offlinePanel.addView(logo, new LinearLayout.LayoutParams(dp(104), dp(104)));

        TextView title = new TextView(this);
        title.setText(R.string.offline_title);
        title.setTextColor(Color.rgb(23, 33, 28));
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(20), 0, dp(8));
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        offlinePanel.addView(title);

        TextView message = new TextView(this);
        message.setText(R.string.offline_message);
        message.setTextColor(Color.rgb(74, 87, 79));
        message.setTextSize(16);
        message.setGravity(Gravity.CENTER);
        offlinePanel.addView(message);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setTextColor(Color.WHITE);
        retry.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(23, 33, 28)));
        retry.setOnClickListener(view -> {
            offlinePanel.setVisibility(View.GONE);
            if (webView.getUrl() == null) {
                webView.loadUrl(BuildConfig.WEB_APP_URL);
            } else {
                webView.reload();
            }
        });
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(52)
        );
        retryParams.setMargins(0, dp(24), 0, 0);
        offlinePanel.addView(retry, retryParams);

        root.addView(offlinePanel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        return root;
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setUserAgentString(settings.getUserAgentString() + " NyasAndroid/1.0");
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.addJavascriptInterface(new AndroidBridge(), "NyasaAndroid");

        webView.setWebViewClient(new NyasWebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                progressBar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (pendingFileCallback != null) {
                    pendingFileCallback.onReceiveValue(null);
                }
                pendingFileCallback = filePathCallback;
                pendingChooserParams = fileChooserParams;

                if (acceptsImages(fileChooserParams)
                        && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
                    return true;
                }
                openFileChooser(fileChooserParams);
                return true;
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null && (url.startsWith("https://") || url.startsWith("http://"))) {
                enqueueDownload(url, guessFileName(url, contentDisposition, mimeType), "");
            }
        });
    }

    private void openFileChooser(WebChromeClient.FileChooserParams params) {
        Intent picker = params.createIntent();
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);

        Intent chooser = Intent.createChooser(picker, getString(R.string.choose_file));
        if (acceptsImages(params)
                && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            Intent camera = createCameraIntent();
            if (camera != null) {
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
            }
        }

        try {
            startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
        } catch (ActivityNotFoundException error) {
            finishFileChoice(null);
            Toast.makeText(this, R.string.no_file_app, Toast.LENGTH_LONG).show();
        }
    }

    private Intent createCameraIntent() {
        try {
            android.content.ContentValues values = new android.content.ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "nyas-photo-" + System.currentTimeMillis() + ".jpg");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Nyas");
            pendingCameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (pendingCameraUri == null) return null;

            Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            camera.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            return camera.resolveActivity(getPackageManager()) == null ? null : camera;
        } catch (Exception error) {
            pendingCameraUri = null;
            return null;
        }
    }

    private boolean acceptsImages(WebChromeClient.FileChooserParams params) {
        String[] types = params.getAcceptTypes();
        if (types == null || types.length == 0) return false;
        for (String type : types) {
            if (type != null && (type.startsWith("image/") || type.contains("image"))) return true;
        }
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST && pendingChooserParams != null) {
            openFileChooser(pendingChooserParams);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST) return;

        if (resultCode != RESULT_OK) {
            finishFileChoice(null);
            return;
        }

        if (data == null || (data.getData() == null && data.getClipData() == null)) {
            finishFileChoice(pendingCameraUri == null ? null : new Uri[]{pendingCameraUri});
            return;
        }

        ClipData clipData = data.getClipData();
        if (clipData != null) {
            Uri[] uris = new Uri[clipData.getItemCount()];
            for (int index = 0; index < clipData.getItemCount(); index++) {
                uris[index] = clipData.getItemAt(index).getUri();
            }
            finishFileChoice(uris);
        } else {
            finishFileChoice(new Uri[]{data.getData()});
        }
    }

    private void finishFileChoice(Uri[] uris) {
        if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(uris);
        pendingFileCallback = null;
        pendingChooserParams = null;
        pendingCameraUri = null;
    }

    private void loadIntentOrHome(Intent intent) {
        Uri deepLink = intent == null ? null : intent.getData();
        if (deepLink != null && isTrustedUrl(deepLink.toString())) {
            webView.loadUrl(deepLink.toString());
        } else {
            webView.loadUrl(BuildConfig.WEB_APP_URL);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadIntentOrHome(intent);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("NyasaAndroid");
            webView.destroy();
        }
        super.onDestroy();
    }

    private boolean isTrustedUrl(String url) {
        try {
            Uri uri = Uri.parse(url);
            return "https".equalsIgnoreCase(uri.getScheme()) && TRUSTED_HOST.equalsIgnoreCase(uri.getHost());
        } catch (Exception error) {
            return false;
        }
    }

    private boolean hasNetwork() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = manager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, R.string.cannot_open_link, Toast.LENGTH_LONG).show();
        }
    }

    private void enqueueDownload(String url, String fileName, String authToken) {
        if (!isTrustedUrl(url)) {
            openExternal(url);
            return;
        }
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(fileName);
            request.setDescription(getString(R.string.downloading));
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, sanitizeFileName(fileName));
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) request.addRequestHeader("Cookie", cookies);
            if (authToken != null && !authToken.isBlank()) request.addRequestHeader("Authorization", "Bearer " + authToken);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            Toast.makeText(this, R.string.download_started, Toast.LENGTH_SHORT).show();
        } catch (Exception error) {
            Toast.makeText(this, R.string.download_failed, Toast.LENGTH_LONG).show();
        }
    }

    private String guessFileName(String url, String disposition, String mimeType) {
        String guessed = android.webkit.URLUtil.guessFileName(url, disposition, mimeType);
        return guessed == null || guessed.isBlank() ? "nyas-download" : guessed;
    }

    private String sanitizeFileName(String fileName) {
        return fileName.replaceAll("[^a-zA-Z0-9._() -]", "_");
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class NyasWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (isTrustedUrl(url)) return false;
            openExternal(url);
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            offlinePanel.setVisibility(View.GONE);
            view.evaluateJavascript(
                    "document.documentElement.classList.add('nyas-android-app');" +
                    "window.dispatchEvent(new CustomEvent('nyas:native-ready'));",
                    null
            );
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) offlinePanel.setVisibility(View.VISIBLE);
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) {
            handler.cancel();
            offlinePanel.setVisibility(View.VISIBLE);
        }

        @Override
        public void onSafeBrowsingHit(WebView view, WebResourceRequest request, int threatType, SafeBrowsingResponse callback) {
            callback.backToSafety(true);
        }
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public String getPlatform() {
            return "android";
        }

        @JavascriptInterface
        public void downloadUrl(String url, String fileName, String authToken) {
            runOnUiThread(() -> enqueueDownload(url, fileName, authToken));
        }

        @JavascriptInterface
        public void saveBase64File(String fileName, String mimeType, String base64Data) {
            new Thread(() -> {
                try {
                    byte[] bytes = Base64.getDecoder().decode(base64Data);
                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, sanitizeFileName(fileName));
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Nyas");
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("Could not create download");
                    try (OutputStream stream = getContentResolver().openOutputStream(uri)) {
                        if (stream == null) throw new IllegalStateException("Could not open download");
                        stream.write(bytes);
                    }
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, R.string.download_complete, Toast.LENGTH_SHORT).show());
                } catch (Exception error) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, R.string.download_failed, Toast.LENGTH_LONG).show());
                }
            }).start();
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            runOnUiThread(() -> {
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("text/plain");
                share.putExtra(Intent.EXTRA_SUBJECT, title);
                share.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(share, getString(R.string.share_with)));
            });
        }

        @JavascriptInterface
        public void showMessage(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }
    }
}
