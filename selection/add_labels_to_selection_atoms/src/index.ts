import { Queries, QueryContext, StructureElement, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";
import { createRootViewer } from "./common/init";
import { OrderedSet } from "molstar/lib/mol-data/int";

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

    // Create a selection for each alpha carbon

        // A query defines the logic to select elements based on a predicate.
        // The predicate is executed from a generator which updates the current element (here, a chain and an atom)
        // in the query context, at each iteration. The predicate returns true if the element should be selected.
        const query = Queries.generators.residues({
            atomTest: ctx=> StructureProperties.atom.auth_atom_id(ctx.element) === 'CA',
            chainTest: ctx=> StructureProperties.chain.label_asym_id(ctx.element) === 'A'
        })

        const ctx = new QueryContext(struct);
        const selection = query(ctx);
    
    // A StructureSelection is a Singleton if each iteration only adds a single element (atom)
    // A StructureSelection is a Sequence if any iteration adds multiple elements (atoms)
    // Since we iterated over residues and only selected 1 atom per residue, the selection is a Singleton.
    const structure = (selection as StructureSelection.Singletons).structure;
    
    // Now, we will iterate over each Unit and its elements in the selection
    structure.units.forEach(unit => {
        for (let i=0; i<unit.elements.length; i++) { // Iterate over each atom in the unit (each alpha carbon)
            // Create a Loci using the unit and the index of the atom
            const indices = OrderedSet.ofSingleton(i as StructureElement.UnitIndex);
            const loci = StructureElement.Loci(struct, [{unit, indices: indices}])
            // Create a location to retrieve the atom's compID (residue name)
            const location = StructureElement.Location.create(struct, unit, unit.elements[i]);
            const resName = +StructureProperties.atom.auth_comp_id(location)
            // Add label to the loci
            plugin.managers.structure.measurement.addLabel(loci, {labelParams: {
                // Set label parameters, in this case the text and size
                customText: 'Alpha Carbon '+resName,
                textSize: 1
            }})
        }
    })
}
init();