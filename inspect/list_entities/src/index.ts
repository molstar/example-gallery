import { Queries, QueryContext, StructureProperties, StructureSelection } from "molstar/lib/mol-model/structure";
import { createRootViewer } from "./common/init";
import { StructureSelectionQueries, StructureSelectionQuery } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
import { Location } from "molstar/lib/mol-model/structure/structure/element/location";


async function init() {
    // Create viewer
    const plugin = await createRootViewer();
    
    // Download PDB
    const fileData = await plugin.builders.data.download(
        { url: "https://models.rcsb.org/1PTH.bcif", isBinary: true }
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

    // Create a QueryContext to be reused for all queries
    // Limits the queries to only look at the structure
    const ctx = new QueryContext(struct)


    // ==== Number of Waters ====
    // Created a query to select all residues that are water
    // but only select 1 atom per water (ensuring a Singleton selection)
    const waterQuery = Queries.generators.atoms({
        'entityTest': ctx => StructureProperties.entity.type(ctx.element) === 'water'
    })
    // Since we used Queries.generators.atoms, our selection will by grouped by Atom and is therefore Singletons
    const waterSelection = waterQuery(ctx) as StructureSelection.Singletons;
    const numWaters = waterSelection.structure.atomicResidueCount;


    // ==== Covalent ligand names and residue code ====
    // Create a query expression for all ligands connected to the protein
    const covalentLigandExp = MS.struct.filter.isConnectedTo({
        0: StructureSelectionQueries.ligand.expression,         // All ligands
        target: StructureSelectionQueries.protein.expression,   // All protein atoms
        'bond-test': true  // Only atoms covalently bound to the protein
    })
    // Query the atoms with the context to get a StructureSelection
    const covLigQuery = StructureSelectionQuery('only-covalent-ligands', covalentLigandExp).query;
    const covLigSelection = covLigQuery(ctx);
    // Assume ligands in structure have >1 atoms.
    // Therefore, the StructureSelection must be a Sequence
    // If the selection is empty, set the ligand structures to an empty array
    const covLigStructures = StructureSelection.isEmpty(covLigSelection) ? [] : (covLigSelection as StructureSelection.Sequence).structures;
    // Retrieve each ligand name and residue code
    const covLigNames: string[] = [];
    const covLigRes: string[] = [];
    const auxCovLigLocation = Location.create();  // Create a Location object to retrieve properties
    covLigStructures.forEach(s => {
        auxCovLigLocation.structure = s;  // Set the structure for the location
        s.units.map(u => {
            // Set the Location to the first element of the ligand
            auxCovLigLocation.unit = u;
            auxCovLigLocation.element = u.elements[0];
            // Use the Location to query the ligand name property of the ligand
            const name = StructureProperties.entity.pdbx_description(auxCovLigLocation).join('|')
            covLigNames.push(name);
            s// Use the Location to query the reidue code for the ligand
            const res = StructureProperties.atom.label_comp_id(auxCovLigLocation)
            covLigRes.push(res);
        })
    })
    

    // ==== Number of AltLoc positions ====
    const altLocQuery = Queries.generators.atoms({
        // Any atom with a non '' alt_id
        'atomTest': ctx => !!StructureProperties.atom.label_alt_id(ctx.element),
    });
    // Since we used Queries.generators.atoms, our selection will by grouped by Atom and is therefore Singletons
    const altLocSelection = altLocQuery(ctx) as StructureSelection.Singletons;
    const numAltLocs = altLocSelection.structure.elementCount;

    
    // ==== Polymer ASYM Unit name and chain ====
    const polymerSelection = StructureSelectionQueries.polymer.query(ctx)
    // Polymer query groups selected atoms by entity. Assume it creates a Sequence StructureSelection
    const polymerStructues = (polymerSelection as StructureSelection.Sequence).structures;
    // Iterate over each polymer unit in each structure and get the name and chain
    const namePolymers: string[] = [];
    const chainPolymers: string[] = [];
    const auxPolymerLocation = Location.create();  // Create a Location object to retrieve properties
    polymerStructues.forEach(s => {
        auxPolymerLocation.structure = s;   // Set the structure for the location
        s.units.map(u => {
            // Set the Location to the first element of the polymer
            auxPolymerLocation.unit = u;
            auxPolymerLocation.element = u.elements[0];
            // Use the Location to query the polymer name and chain
            const name = StructureProperties.entity.pdbx_description(auxPolymerLocation).join('|')
            namePolymers.push(name);
            const chain = StructureProperties.chain.auth_asym_id(auxPolymerLocation);
            chainPolymers.push(chain);
        })
    })

    console.table([
        {title: 'Water count', value: numWaters},
        {title: 'Covalent Ligand name', value: covLigNames.join(', ')},
        {title: 'Covalent Ligand residue', value: covLigRes.join(', ')},
        {title: 'Alt Loc Count', value: numAltLocs},
        {title: 'Poly ASYM Unit name', value: namePolymers.join(', ')},
        {title: 'Poly ASYM Unit chain', value: chainPolymers.join(', ')}
    ])
}
init();