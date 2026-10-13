package mr.nataiji.app;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NataijiPrint")
public class NataijiPrintPlugin extends Plugin {
    private boolean printing = false;
    private WebView documentView;

    private void finish() {
        printing = false;
        if (documentView != null) {
            documentView.destroy();
            documentView = null;
        }
        getBridge().triggerWindowJSEvent("nataiji-native-print-finished");
    }

    private void startPrint(WebView view, String title, boolean landscape, PluginCall call) {
        try {
            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            if (manager == null) throw new IllegalStateException("Printing is unavailable");
            PrintDocumentAdapter delegate = view.createPrintDocumentAdapter(title);
            PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                @Override public void onStart() { delegate.onStart(); }
                @Override public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                        CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
                    delegate.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
                }
                @Override public void onWrite(android.print.PageRange[] pages, ParcelFileDescriptor destination,
                        CancellationSignal cancellationSignal, WriteResultCallback callback) {
                    delegate.onWrite(pages, destination, cancellationSignal, callback);
                }
                @Override public void onFinish() {
                    try { delegate.onFinish(); } finally { getActivity().runOnUiThread(() -> finish()); }
                }
            };
            PrintAttributes.MediaSize size = landscape ? PrintAttributes.MediaSize.ISO_A4.asLandscape()
                : PrintAttributes.MediaSize.ISO_A4.asPortrait();
            manager.print(title, adapter, new PrintAttributes.Builder().setMediaSize(size).build());
            call.resolve();
        } catch (Exception error) {
            finish();
            call.reject("Unable to open printing", "print_failed", error);
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (printing) { call.reject("Printing is already active", "print_busy"); return; }
            printing = true;
            startPrint(getBridge().getWebView(), "Nataiji", false, call);
        });
    }

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        if (html == null || html.length() > 6000000) {
            call.reject("Invalid print document", "print_invalid_document"); return;
        }
        getActivity().runOnUiThread(() -> {
            if (printing) { call.reject("Printing is already active", "print_busy"); return; }
            printing = true;
            try {
                // A dedicated WebView prints the professor document, never the app dashboard or a hidden iframe.
                documentView = new WebView(getActivity());
                documentView.getSettings().setJavaScriptEnabled(false);
                documentView.getSettings().setAllowFileAccess(false);
                documentView.getSettings().setAllowContentAccess(false);
                documentView.setWebViewClient(new WebViewClient() {
                    private boolean started = false;
                    @Override public void onPageFinished(WebView view, String url) {
                        if (started) return;
                        started = true;
                        startPrint(view, call.getString("title", "Nataiji"), call.getBoolean("landscape", false), call);
                    }
                    @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return true; }
                });
                documentView.loadDataWithBaseURL(getBridge().getWebView().getUrl(), html, "text/html", "UTF-8", null);
            } catch (Exception error) {
                finish(); call.reject("Unable to prepare document", "print_failed", error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (documentView != null) { documentView.destroy(); documentView = null; }
    }
}
