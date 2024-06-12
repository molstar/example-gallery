import { PluginContext } from "molstar/lib/mol-plugin/context";
import { OpenFiles } from "molstar/lib/mol-plugin-state/actions/file";
import { createRootViewer } from "./common/init";
import { Asset } from "molstar/lib/mol-util/assets";

async function init() {
    // Create viewer
    const plugin = await createRootViewer();

    // Set up save/load buttons and events for with and without assets
    document.getElementById('load')!.oninput = (e) => loadFile(plugin, e);
}
init();

async function loadFile(plugin: PluginContext, event: Event) {
    // Get the input element
    const input = event.target as HTMLInputElement;
    // If there are no files, return
    if (!input.files || input.files.length === 0) return;

    // Convert the FileList into Asset.File[] for the plugin
    const files = Array.from(input.files);
    const assetFiles = files.map(f => Asset.File(f));

    // Create a task to OpenFiles
    const task = plugin.state.data.applyAction(OpenFiles, {
        files: assetFiles,  // AssetFiles from input
        format: {
            name: 'auto',   // Format of the file can be autodetermined (.pdb, .cif, etc.)
            params: {}      // No special parameters
        },
        visuals: true       // Create the visual representations
    })
    
    // Run the task to OpenFiles
    plugin.runTask(task)
}