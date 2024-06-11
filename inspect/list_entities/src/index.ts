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
        'entityTest': ctx => StructureProperties.entity.type(ctx.element) === 'water',
        'atomTest': ctx => StructureProperties.atom.type_symbol(ctx.element) === 'O'
    })
    // Can cast as a Singleton selection since we are only selecting 1 atom per water
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
    const covLigStructures = (covLigSelection as StructureSelection.Sequence).structures;
    // Retrieve each ligand name and residue code
    const covLigNames: string[] = [];
    const covLigRes: string[] = [];
    covLigStructures.forEach(s => s.units.map(u => {
        // Create a location for the first element of the ligand
        // to retrieve structure properties
        const location = Location.create(s, u, u.elements[0])
        // Return the ligand name property for the ligand
        const name = StructureProperties.entity.pdbx_description(location).join('|')
        covLigNames.push(name);
        // Return the residue code for the ligand
        const res = StructureProperties.atom.label_comp_id(location)
        covLigRes.push(res);
    }))
    

    // ==== Number of AltLoc positions ====
    const altLocQuery = Queries.generators.atoms({
        // Any atom with a non '' alt_id
        'atomTest': ctx => !!StructureProperties.atom.label_alt_id(ctx.element),
    });
    // Can only select 1 atom at a time, must be a Singleton
    const altLocSelection = altLocQuery(ctx) as StructureSelection.Singletons;
    const numAltLocs = altLocSelection.structure.elementCount;

    
    // ==== Polymer ASYM Unit name and chain ====
    const polymerSelection = StructureSelectionQueries.polymer.query(ctx)
    // Assume more than 1 atom in the polymer entity
    const polymerStructues = (polymerSelection as StructureSelection.Sequence).structures;
    // Iterate over each polymer unit in each structure and get the name and chain
    const namePolymers: string[] = [];
    const chainPolymers: string[] = [];
    polymerStructues.forEach(s => {
        s.units.map(u => {
            // Create a location for the polymer unit to retrieve structure properties
            const location = Location.create(struct, u, u.elements[0])
            // Retrieve the polymer name and chain
            const name = StructureProperties.entity.pdbx_description(location).join('|')
            namePolymers.push(name);
            const chain = StructureProperties.chain.auth_asym_id(location);
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