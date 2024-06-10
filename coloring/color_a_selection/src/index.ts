import { StructureSelectionQueries, StructureSelectionQuery } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { Queries, QueryContext, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure"
import { setStructureOverpaint } from "molstar/lib/mol-plugin-state/helpers/structure-overpaint";
import { Color } from "molstar/lib/mol-util/color";
import { createRootViewer } from "./common/init";

async function init() {
    // Create viewer
    const plugin = await createRootViewer();
    
    // Download PDB
    const fileData = await plugin.builders.data.download(
        { url: "https://models.rcsb.org/4hhb.bcif", isBinary: true }
    );

    // Load PDB and create representation
    const trajectory = await plugin.builders.structure.parseTrajectory(fileData, "mmcif");
    const presetStateObjects = await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

    if (!presetStateObjects) {
        throw new Error("Structure not loaded");
    }

    // Get Structure object from the structure stateObject selector.
    // The Structure object contains properties and accessors to the underlying molecular data such as chains, residues, atoms, etc.
    const struct = presetStateObjects.structure.data!;

    // Get the StructureRef object from the Structure object. The StructureRef object is the
    // part of the state that represents the structure. We use it to access the structure's components
    // generated from the default preset.
    const structRef = plugin.managers.structure.hierarchy.findStructure(struct)!;

    // Query all ligands using prebuilt query
    const ctx = new QueryContext(struct)
    const ligandExp = StructureSelectionQueries.ligand.query(ctx);

    // Convert the StructureSelection into a Loci
    const loci = StructureSelection.toLociWithSourceUnits(ligandExp);

    const color = Color(0xFF0000); // 0xFF0000 is RGB for red
    // The helper takes care of updating the plugin state for each component based on the loci
    setStructureOverpaint(plugin, structRef.components, color, async (s) => loci)
}
init();