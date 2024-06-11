import { Queries, QueryContext, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";
import { createRootViewer } from "./common/init";
import { setStructureOverpaint } from "molstar/lib/mol-plugin-state/helpers/structure-overpaint";
import {Script} from "molstar/lib/mol-script/script";
import { StructureSelectionQuery } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { Color } from "molstar/lib/mol-util/color";

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

    // Here we build 3 scripts using PyMOL, VMD, and JMOL
    const pymolScript = Script('chain A and hetatm', 'pymol');  // Select HETATM and chain A with PyMOL
    const vmdScript = Script('chain B and hetero', 'vmd');      // Select HETATM and chain B with VMD
    const jmolScript = Script(':C and hetero', 'jmol');         // Select HETATM and chain C with Jmol

    // Highlight each of the selections with a different color
    const selectionColors = [
        {// PyMOL
            color: Color(0xff0000),
            script: pymolScript
        },
        { // VMD
            color: Color(0x00ff00),
            script: vmdScript
        },
        { // Jmol
            color: Color(0x0000ff),
            script: jmolScript
        }
    ];
    for (const {color, script} of selectionColors) {
        // Convert the script to a Loci object on the current structure
        const loci = Script.toLoci(script, struct);
        // Use the setStructureOverpaint helper to highlight the selection with the specified color
        // Need to use await otherwise only the latest overpaint will be applied
        await setStructureOverpaint(plugin, structRef.components, color, async (s) => loci);
    }
}
init();