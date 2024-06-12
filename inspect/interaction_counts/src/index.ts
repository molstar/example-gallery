import { createRootViewer } from "./common/init";
import { Queries, QueryContext, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";
import { InteractionsProvider } from "molstar/lib/mol-model-props/computed/interactions";
import { SyncRuntimeContext } from "molstar/lib/mol-task/execution/synchronous";
import { interactionTypeLabel } from "molstar/lib/mol-model-props/computed/interactions/common";

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

    // Create a QueryContext to limit the query to the structure
    const queryCtx = new QueryContext(struct);
    // Create a query that selects all residues that are HETATM and in chain A
    const ligQuery = Queries.generators.residues({
        chainTest: ctx => StructureProperties.chain.auth_asym_id(ctx.element) === 'A',
        atomTest: ctx => StructureProperties.residue.group_PDB(ctx.element) === 'HETATM'
    });
    // Since this example has at least 1 ligand with multiple atoms, we can assume a Sequence
    const ligSelection = ligQuery(queryCtx) as StructureSelection.Sequence;
    // Create a set of unit ids to filter out interactions that don't involve our selection
    const filterIds = new Set<number>([]);
    ligSelection.structures.forEach(s => {
        s.units.forEach(u => {
            filterIds.add(u.id);
        })
    })

    // For interactions, create an InteractionsProvider that will calculate
    // the interactions on the attached structure
    const customPropCtx = {
        runtime: SyncRuntimeContext,        // Use global synchronous runtime
        assetManager: plugin.managers.asset // use existing asset manager
    };
    await InteractionsProvider.attach(customPropCtx, struct);

    // Find the interactions for the structure
    const interactions = InteractionsProvider.get(struct).value!;
    const { contacts } = interactions;
    
    // Keep a count of the number of interaction types
    const interactionCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // Array of 9 elements, one for each InteractionType
    // Iterate over all contacts in the structure
    for (let i=0; i<contacts.edgeCount; i++) {
        const c = contacts.edges[i];
        // Remap the UnitId from the inter-unit graph to the structure Unit
        const unitA = struct.unitMap.get(c.unitA);
        const unitB = struct.unitMap.get(c.unitB);
        // Skip interactions that don't involve the ligand.
        // There are 2N edges (one for A-B and one for B-A) so we can
        // skip any edges that don't have our selection in unitA
        if (!filterIds.has(unitA.id)) continue;
        // Skip self-interactions
        if (unitA.id === unitB.id) continue;
        // Increment the count for the interaction type
        interactionCounts[c.props.type]++;
    }
    console.table(interactionCounts.map((count, type) => [interactionTypeLabel(type), count]))

    // Highlight the StructureSelection for easier visualization
    const loci = StructureSelection.toLociWithSourceUnits(ligSelection) // create loci of selection
    plugin.managers.structure.selection.fromLoci('add', loci)           // highlight selection
}
init();