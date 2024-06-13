import { Queries, QueryContext, Structure, StructureElement, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";
import { createRootViewer } from "./common/init";
import { OrderedSet } from "molstar/lib/mol-data/int";
import { Loci } from "molstar/lib/mol-model/structure/structure/element/loci";
import { groupBy } from "molstar/lib/mol-data/util";

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
        // If the predicate returns, the entire chain segment is added to the selection.
        const query = Queries.generators.atoms({
            chainTest: ctx=> {
                const chainName = StructureProperties.chain.label_asym_id(ctx.element);
                    return chainName === 'A' || chainName === 'B';
            },
            groupBy: ctx=> StructureProperties.chain.label_asym_id(ctx.element) // Finally, we group our selection by label_asym_id
        });

        const ctx = new QueryContext(struct);
        const selection = query(ctx);
    
    // A StructureSelection is made of Singletons if each iteration only adds a single element (atom)
    // A StructureSelection is a Sequence if any iteration adds multiple elements (atoms)
    const loci: Loci[] = [];
    if (StructureSelection.isSingleton(selection)) { // Singleton if each chain only has 1 atom
        // Iterate over each Unit in the selection and create a Loci for each Unit
        selection.structure.units.forEach(unit => {
            // Create an OrderedSet of indicies for the length of unit.elements
            const indices = OrderedSet.ofBounds(0 as StructureElement.UnitIndex, unit.elements.length as StructureElement.UnitIndex)
            // Create a Loci from the unit and indices
            loci.push(StructureElement.Loci(struct, [{unit, indices}]))
        })
    } else { // otherwise, it is a Sequence
        // Iterate over each Structure in the selection and create a Loci for each SubStructure
        selection.structures.forEach(structure => {
            loci.push(Structure.toSubStructureElementLoci(struct, structure));
        })
    }
    loci.forEach(l => {
        plugin.managers.structure.measurement.addLabel(l, {labelParams: {
            customText: 'Chain',
            textSize: 0.5
        }})
    })
}
init();