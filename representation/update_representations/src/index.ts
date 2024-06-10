import { createRootViewer } from "./common/init";
import { StateBuilder, StateSelection, StateTransform } from "molstar/lib/mol-state";
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


  // Color by residue name
  // In this example, the Representation StateObject is used directly. 
  // Internally, the `update` function acts on a new State tree and returns a helper StateBuilder object
  // which may receive additional changes.
  // The `commit` function is used to apply the changes to the current plugin state.
  byres.addEventListener("click", () => {
    const newParams = createStructureRepresentationParams(plugin, structure, { color: "residue-name" });
    const update = representationSO.update(newParams) as StateBuilder.Root
    update.commit()
  });

  // Color by chain
  // In this example the `ref` string for the representation is found back from the state tree using
  // the tag that was set at creation time.
  bychain.addEventListener("click", async () => {
    const newParams = createStructureRepresentationParams(plugin, structure, { color: "chain-id" });
    const reprRef = StateSelection.findTagInSubtree(plugin.state.data.tree, StateTransform.RootRef, "my-cartoon");
    
    if (!reprRef) throw new Error("Representation not found");
    
    plugin.build().to(reprRef).update(newParams).commit()
  });

  // Color by position
  // In this example the representation object to update is found back from the state tree using a state
  // selector function which takes a tag as argument. This returns a sequence of state cells because there
  // can be multiple matches when using the `select` method.
  bypos.addEventListener("click", () => {
    const newParams = createStructureRepresentationParams(plugin, structureSO.data, { color: "sequence-id" });
    const repr = plugin.state.data.select(StateSelection.Generators.root.subtree().withTag("my-cartoon"));
    
    const update = plugin.build();  // Start a new state tree
    for (const r of repr) {
      update.to(r).update(newParams); // update the new state tree
    }
    update.commit();  // apply all the changes to the current plugin state.
  });

}
init();