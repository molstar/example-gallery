import { PluginContext } from "molstar/lib/mol-plugin/context";
import { createRootViewer } from "./common/init";
import { download } from "molstar/lib/mol-util/download";

async function init() {
    // Create viewer
    const plugin = await createRootViewer();
    
    // Download PDB
    const fileData = await plugin.builders.data.download(
        { url: "https://models.rcsb.org/4hhb.bcif", isBinary: true }
    );

    // Load PDB and create representation
    const trajectory = await plugin.builders.structure.parseTrajectory(fileData, "mmcif");
    await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

    // Set up save/load buttons and events for with and without assets
    // Assets refer to the files used to initially load the data (in this case a .bcif from the RCSB)
    
    // If you save with assets (.molx), you can load the session without having to re-download the data
    document.getElementById('saveAssets')!.onclick = (e) => saveState(plugin, 'molx');
    document.getElementById('loadAssets')!.oninput = (e) => loadState(plugin, e);
    // If you save without assets (.molj), you will need to either keep the existing assets
    // in the viewer or load them prior to loading the session
    document.getElementById('saveNoAssets')!.onclick = (e) => saveState(plugin, 'molj');
    document.getElementById('loadNoAssets')!.onchange = (e) => loadState(plugin, e);
}
init();

async function saveState(plugin: PluginContext, type: 'molx' | 'molj') {
    // Here we serialize the snapshot into a Blob
    // There is also the helper command `PluginCommands.State.Snapshots.DownloadToFile`
    // which is more high-level but does not let you set the file name
    const data = await plugin.managers.snapshot.serialize({type})

    // Next, we download the Blob and give it a filename
    download(data, `state.${type}`);
}

async function loadState(plugin: PluginContext, event: Event) {
    // Get the input element
    const input = event.target as HTMLInputElement;
    // If there are no files, return
    if (!input.files || input.files.length === 0) return;

    // Here we open the snapshot from the file
    // There is also the helper command `PluginCommands.State.Snapshots.OpenFile`
    // which does the same thing.
    await plugin.managers.snapshot.open(input.files[0]);
}