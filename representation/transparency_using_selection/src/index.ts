import { createRootViewer } from "./common/init";
import { setStructureTransparency } from "molstar/lib/mol-plugin-state/helpers/structure-transparency";
import { Queries, QueryContext, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";

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
    
    // Create a selection for chains A and B

        // A query defines the logic to select elements based on a predicate.
        // The predicate is executed from a generator which updates the current element (here, an atom)
        // in the query context, at each iteration. The predicate returns true if the element should be selected.
        const query = Queries.generators.chains({
            chainTest: ctx => {
                const chainName = StructureProperties.chain.label_asym_id(ctx.element);
                return chainName === 'A' || chainName === 'B';
            }
        })

        const ctx = new QueryContext(struct);
        const selection = query(ctx);

    // Convert the StructureSelection into a Loci
    const loci = StructureSelection.toLociWithSourceUnits(selection);

    const transparency = 1; // 0 is fully opaque, 1 is fully transparent
    // The helper takes care of updating the plugin state for each component based on the loci
    setStructureTransparency(plugin, structRef.components, transparency, async (s) => loci)
}   
init();