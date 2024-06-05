import { StructureSelectionQueries } from "https://esm.sh/molstar/lib/mol-plugin-state/helpers/structure-selection-query";

async function init() {
  // plugin initialization logic bundled for usage in CodePen. Returns a PluginContext
  const plugin = await molstarGallery.createRootViewer();

  // The `builders` namespace contains a set of helper functions to create and manipulate structures, representations, etc.
  // which gets attached to the plugin context as a tree of state objects.
  // Here we expose how to explicitly build the hierarchy of state objects to make representations: 
  // -> data 
  //    -> trajectory 
  //        -> model 
  //            -> structure
  //                -> (component) 
  //                    -> representation
  // - data: raw data source (content of a file, string or binary data)
  // - trajectory: parsed data source. May contain multiple frames (models)
  // - model: a single frame of a trajectory (by default the 1st frame)
  // - structure: an object that represents a molecular structure inferred from a model (e.g. atoms, residues, chains as defined in an assembly)
  // - component: the result of applying a transform to a structure. Here, a subset of a structure specified using a selection.
  // Representations can be built from structures or components.

  const data = await plugin.builders.data.download({
    url: "https://models.rcsb.org/5ee7.bcif",
    isBinary: true,
  });

  const trajectory = await plugin.builders.structure.parseTrajectory(
    data,
    "mmcif"
  );

  const model = await plugin.builders.structure.createModel(trajectory);
  
  const structure = await plugin.builders.structure.createStructure(model);

  // *************** Adding representations ***************

  // "Noodle" like representation of the protein backbone to showcase `type` and `typeParams`
  await plugin.builders.structure.representation.addRepresentation(
      structure,    // we pass a structure StateObject to apply the representation on the whole structure
      {
        type: "cartoon",
        typeParams: { aspectRatio: 1, sizeFactor: 0.5 },    // typeParams are applicable to the representation type (here: `cartoon`)
        color: "sequence-id",
      },
      { tag: "my-noodle-representation" }  // tag is optional, but useful for later reference
    );

    // Ball-and-stick representation of the whole structure to showcase `color` and `colorParams`
    await plugin.builders.structure.representation.addRepresentation(
      structure,
      {
        type: "ball-and-stick",
        color: "element-symbol",
        colorParams: { // colorParams are applicable to the color scheme (here: `element-symbol`)
            carbonColor: { name: "element-symbol", params: {} } // By default carbon atoms are colored by chain, here we override it to be colored by element symbol
        },   
      },
      { tag: "hehe" }
    );

  // Spacefill representation of a subset (aromatic rings), using a component
  // A component is a state object selector that derives from a structure state object by applying a transform (here a selection)
  const component =
    await plugin.builders.structure.tryCreateComponentFromSelection(
      structure,
      StructureSelectionQueries.aromaticRing,   // Predefined selection query for aromatic rings
      "aromatic-ring"   // Key
    );
  await plugin.builders.structure.representation.addRepresentation(
    component?.cell,    // `component.cell` is a structure StateObject. `component` is a structure StateObjectSelector
    {
      type: "spacefill",
      typeParams: { sizeFactor: 0.5 },
      color: "hydrophobicity",
      colorParams: { scale: "DGwoct" },
    }
  );

  
}
init();
