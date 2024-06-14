import { Queries, QueryContext, StructureElement, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";
import { createRootViewer } from "./common/init";
import { OrderedSet } from "molstar/lib/mol-data/int";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";

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
        // The predicate is executed from a generator that iterates over the
        // structure hierarchy (chains, then residues, then atoms).
        // At each iteration, the query context that is passed, is updated.
        // The chainTest predicate is executed once per chain. The element property
        // represents the atom at the start of the current chain.
        // The atomTest predicate is executed for each atom in the structure that passes the chainTest.
        // If the both the predicate returns true, the atom is added to the selection.
        const query = Queries.generators.residues({
            chainTest: ctx => StructureProperties.chain.label_asym_id(ctx.element) === 'A',
            atomTest: ctx => StructureProperties.atom.auth_atom_id(ctx.element) === 'CA'
        });

        const ctx = new QueryContext(struct);
        const selection = query(ctx);
    
    // A StructureSelection is made of Singletons if each iteration only adds a single element (atom)
    // A StructureSelection is a Sequence if any iteration adds multiple elements (atoms)
    // Since we iterated over residues and only selected 1 atom per residue, the selection is made of Singletons.
    const structure = (selection as StructureSelection.Singletons).structure;
    
    // Create a StateBuilder to make changes to the state
    const builder = plugin.build();
    const dependsOn = [presetStateObjects.structure.ref]    // Define what state objects your changes depend on (in this case the structure SO)
    // Now, we will iterate over each Unit and its elements in the selection
    structure.units.forEach(unit => {
        for (let i = 0; i < unit.elements.length; i++) { // Iterate over each atom in the unit (each alpha carbon)
            // Create a Loci using the unit and the index of the atom
            const indices = OrderedSet.ofSingleton(i as StructureElement.UnitIndex);
            const loci = StructureElement.Loci(struct, [{unit, indices: indices}]);
            // Create a location to retrieve the atom's compID (residue name)
            const location = StructureElement.Location.create(struct, unit, unit.elements[i]);
            const resName = StructureProperties.atom.auth_comp_id(location);
            
            // Create a MultiStructureSelection from our Loci
            builder.toRoot().apply(StateTransforms.Model.MultiStructureSelectionFromExpression, {
                selections: [
                    { key: 'a', ref: presetStateObjects.structure.ref, expression: StructureElement.Loci.toExpression(loci) },
                ],
                label: 'Label'  // A label to give to our selection
            }, {dependsOn}).apply(StateTransforms.Representation.StructureSelectionsLabel3D, { // Create a 3DLabel on the selection
                customText: 'Alpha Carbon '+resName,    // Custom text for our label
                textSize: 1     // Text size for our label
            });
        }
    })
    // Now that all the changes have been added to the builder,
    // Commit them to be added to the current plugin state
    builder.commit()
}
init();