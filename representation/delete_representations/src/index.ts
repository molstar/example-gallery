import { createRootViewer } from "./common/init";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { StateObjectRef } from "molstar/lib/mol-state/object";
import { PluginStateObject } from "molstar/lib/mol-plugin-state/objects";
import { StateSelection } from "molstar/lib/mol-state";

async function init() {
    // Create viewer
    const plugin = await createRootViewer();
    
    // Download mmCIF
    const fileData = await plugin.builders.data.download(
        { url: "https://models.rcsb.org/4hhb.bcif", isBinary: true }
    );

    // Load mmCIF and create representation
    const trajectory = await plugin.builders.structure.parseTrajectory(fileData, "mmcif");
    const presetStateObjects = await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

    if (!presetStateObjects) {
        throw new Error("Structure not loaded");
    }

    // Get Structure object from the structure stateObject selector.
    // The Structure object contains properties and accessors to the underlying molecular data such as chains, residues, atoms, etc.
    const structSO = presetStateObjects.structure;

    // We will use this tag to keep track of which representations we want to delete
    const tag = 'my-representation'

    // Set the onclick functions for the create and delete representation buttons
    document.getElementById("createRep")!.onclick = async () => createRepresentation(plugin, structSO, tag);
    document.getElementById("deleteRep")!.onclick = async () => deleteRepresentation(plugin, tag);

}
init();

async function createRepresentation(plugin: PluginContext, structure: StateObjectRef<PluginStateObject.Molecule.Structure>, tag: string) {
    // "Noodle" like representation of the protein backbone to showcase `type` and `typeParams`
    await plugin.builders.structure.representation.addRepresentation(
        structure,    // we pass a structure StateObject to apply the representation on the whole structure
        {
            type: "cartoon",
            typeParams: { aspectRatio: 1, sizeFactor: 0.5 },    // typeParams are applicable to the representation type (here: `cartoon`)
            color: "sequence-id",
        },
        { tag }  // tag will be used to find
    );
}

async function deleteRepresentation(plugin: PluginContext, tag: string) {
    // Create a new StateBuilder from the plugin
    // We will use this to make changes (deletions) and then commit them
    const builder = plugin.build();
    // Find all StateObjects with our tag
    const representations = StateSelection.findWithAllTags(
        builder.getTree(),      // Get the StateTree to search
        builder.toRoot().ref,   // Get the root of the tree to search from
        new Set([tag])          // Set the list of tags the objects need to have
    );
    // For each representation found, make a change in the builder to delete them
    representations.forEach(rep => builder.delete(rep.ref));
    // Commit the builder's changes to the current plugin state
    builder.commit();
}