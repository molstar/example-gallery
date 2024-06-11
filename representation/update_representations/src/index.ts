import { createRootViewer } from "./common/init";
import { StateSelection, StateTransform } from "molstar/lib/mol-state";
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";

const byres = document.getElementById("byres")!;
const bychain = document.getElementById("bychain")!;
const bypos = document.getElementById("bypos")!;

async function init() {
  // Create Viewer. Returns a PluginContext
  const plugin = await createRootViewer();

  // Download data as mmCIF
  const fileData = await plugin.builders.data.download({
    url: "https://models.rcsb.org/5ee7.bcif",
    isBinary: true,
  });

  // Load mmCIF and create trajectory -> model -> structure -> representation
  const trajectorySO = await plugin.builders.structure.parseTrajectory(
    fileData,
    "mmcif"
  );

  const modelSO = await plugin.builders.structure.createModel(trajectorySO);
  
  // Structure StateObject Selector (object from the state tree that represents the structure)
  const structureSO = await plugin.builders.structure.createStructure(modelSO); 
  // Structure object contains properties and accessors to the underlying molecular data such as chains, residues, atoms, etc.
  const structure = structureSO.data!;
  
  const representationSO = await plugin.builders.structure.representation.addRepresentation(
    structureSO,    // we pass a structure StateObject Selector to apply the representation on the whole structure
    {
      type: "cartoon",
      color: "chain-id",
    },
    { tag: "my-cartoon" } // tag is optional. It is used in some examples to retrieve the representation from the state tree.
  );

  // Color by chain
  // In this example the `ref` string for the representation is found back from the state tree using
  // the tag that was set at creation time.
  bychain.addEventListener("click", async () => {
    const newParams = createStructureRepresentationParams(plugin, structure, { color: "chain-id" });
    const reprRef = StateSelection.findTagInSubtree(plugin.state.data.tree, StateTransform.RootRef, "my-cartoon");
    
    if (!reprRef) throw new Error("Representation not found");

    const builder = plugin.build();  // Create a new StateBuilder 
    builder.to(reprRef).update(newParams) // Update the new state tree where the state object reference is
    builder.commit()  // Apply all the changes to the current plugin state.
  });

  // Color by position
  // In this example the representation object to update is found back from the state tree using a state
  // selector function which takes a tag as argument. This returns a sequence of state cells because there
  // can be multiple matches when using the `select` method.
  bypos.addEventListener("click", () => {
    const newParams = createStructureRepresentationParams(plugin, structureSO.data, { color: "sequence-id" });
    const repr = plugin.state.data.select(StateSelection.Generators.root.subtree().withTag("my-cartoon"));
    
    const builder = plugin.build();  // Create a new state builder
    for (const r of repr) {
      builder.to(r).update(newParams); // Update the new state tree where each representation is found
    }
    builder.commit();  // Apply all the changes to the current plugin state.
  });


  // Color by residue name
  // In this example, the Representation StateObjectSelector is used directly as the target of the update.
   byres.addEventListener("click", () => {
    const newParams = createStructureRepresentationParams(plugin, structure, { color: "residue-name" });

    const builder = plugin.build(); // Create a new state builder
    builder.to(representationSO).update(newParams); // Update the representation in the new state tree
    builder.commit(); // Apply all the changes to the current plugin state.

    // Because a StateObject selector has an update method which by default returns a new StateBuilder,
    // the same statement can be written as a one-liner: 
    // `representationSO.update(newParams).commit();`
  });

}
init();