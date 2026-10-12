package mr.nataiji.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NataijiPrint")
public class NataijiPrintPlugin extends Plugin {
    private boolean printing = false;
    private boolean pausedForPrint = false;

    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (manager == null) {
                    call.reject("Printing is unavailable", "print_unavailable");
                    return;
                }
                printing = true;
                pausedForPrint = false;
                manager.print("Nataiji", getBridge().getWebView().createPrintDocumentAdapter("Nataiji"),
                    new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                call.resolve();
            } catch (Exception error) {
                printing = false;
                call.reject("Unable to open printing", "print_failed", error);
            }
        });
    }

    @Override
    protected void handleOnPause() {
        if (printing) pausedForPrint = true;
    }

    @Override
    protected void handleOnResume() {
        if (printing && pausedForPrint) {
            printing = false;
            pausedForPrint = false;
            getBridge().triggerWindowJSEvent("nataiji-native-print-finished");
        }
    }
}
