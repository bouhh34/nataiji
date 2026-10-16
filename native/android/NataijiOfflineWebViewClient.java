package mr.nataiji.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * A read-only offline copy of public web assets embedded by Capacitor.
 * Requests retain https://nataiji.onrender.com as their browser origin,
 * preserving the existing per-account WebView local storage and session scope.
 * API requests are NEVER intercepted and account data is NEVER bundled.
 */
public final class NataijiOfflineWebViewClient extends BridgeWebViewClient {
    private static final String HOST = "nataiji.onrender.com";
    private final Context context;

    public NataijiOfflineWebViewClient(Bridge bridge, Context context) {
        super(bridge);
        this.context = context.getApplicationContext();
    }

    public static boolean isOffline(Context context) {
        ConnectivityManager manager =
            (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        Network network = manager.getActiveNetwork();
        if (network == null) return true;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities == null ||
            !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private static boolean isSafeAsset(String path) {
        if (path == null || !path.startsWith("/") || path.contains("..")
                || path.contains("\\") || path.contains("//") || path.indexOf('\0') >= 0) return false;
        if (path.startsWith("/api/") || path.equals("/api")
                || path.equals("/health") || path.startsWith("/health/")
                || path.startsWith("/admin/")) return false;
        if (path.equals("/") || path.equals("/index.html")) return true;
        return path.matches("/[A-Za-z0-9_./-]+\\.(?:html|js|css|json|webmanifest|png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf|otf|wasm)");
    }

    private static String contentType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".ico")) return "image/x-icon";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".ttf")) return "font/ttf";
        if (path.endsWith(".otf")) return "font/otf";
        if (path.endsWith(".wasm")) return "application/wasm";
        return "application/octet-stream";
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!"GET".equals(request.getMethod())
                || !"https".equalsIgnoreCase(uri.getScheme())
                || !HOST.equalsIgnoreCase(uri.getHost())) {
            return super.shouldInterceptRequest(view, request);
        }
        // Never change normal online operation, including native print bridge.
        if (!isOffline(context)) return super.shouldInterceptRequest(view, request);
        String path = uri.getPath();
        if (!isSafeAsset(path)) return super.shouldInterceptRequest(view, request);

        String asset = "public/" + ("/".equals(path) ? "index.html" : path.substring(1));
        try {
            InputStream bytes = context.getAssets().open(asset);
            WebResourceResponse response = new WebResourceResponse(
                contentType(asset),
                (asset.endsWith(".html") || asset.endsWith(".js") || asset.endsWith(".css")
                    || asset.endsWith(".json") || asset.endsWith(".webmanifest")) ? "UTF-8" : null,
                bytes
            );
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-store");
                headers.put("X-Content-Type-Options", "nosniff");
                response.setResponseHeaders(headers);
            }
            return response;
        } catch (IOException unavailable) {
            // Never fake a successful response for a missing bundled asset.
            return super.shouldInterceptRequest(view, request);
        }
    }
}
