import { StructureSelectionQueries, StructureSelectionQuery } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
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
    await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

    // Query all ligands using prebuilt query
    const ligandExp = StructureSelectionQueries.ligand.expression;
    // Using MolScript, build a new expression to include surroundings of each ligand
    const expression = MS.struct.modifier.includeSurroundings({
        0: ligandExp,
        radius: 4.5,
        'as-whole-residues': true
    });
    // Create a new selection from the expression
    // And use the selection manager to add the SelectionQuery to the current selection
    plugin.managers.structure.selection.fromSelectionQuery('add', StructureSelectionQuery('ligand-and-surroundings-1', expression))
}
init();