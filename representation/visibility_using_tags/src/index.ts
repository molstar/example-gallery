import { createRootViewer } from "./common/init";
import { setStructureTransparency } from "molstar/lib/mol-plugin-state/helpers/structure-transparency";
import { Queries, QueryContext, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";
import { StateSelection } from "molstar/lib/mol-state/state/selection";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { setSubtreeVisibility } from "molstar/lib/mol-plugin/behavior/static/state";

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

    // Retrieve the checkbox element
    const checkbox = document.getElementById('toggleWater')! as HTMLInputElement;
    // Add a click event listener to the checkbox for toggling water visibility
    checkbox.addEventListener('click', () => {
        toggleWater(plugin, !checkbox.checked);
    })
}   
init();

function toggleWater(plugin: PluginContext, hide: boolean){
    // Find all representations with the tag 'structure-component-static-water'
    const representations = StateSelection.findWithAllTags(
        plugin.state.data.tree,                         // The state tree
        plugin.state.data.tree.root.ref,                // The root ref of the state tree
        new Set(['structure-component-static-water'])   // The tag to search for
    )
    // Set the visibility of each representation and any StateObjects in its subtree
    representations.forEach(rep => setSubtreeVisibility(plugin.state.data, rep.ref, hide))
}