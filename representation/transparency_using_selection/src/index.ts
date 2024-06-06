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
    const data = await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

    // Get Structure and StructureRef objects from data
    const struct = data?.structure.cell?.obj?.data!;
    const structRef = plugin.managers.structure.hierarchy.current.structures.find((sr)=>sr.cell.obj?.data === struct)
    
    // Query all chains with ID A or B
    const ctx = new QueryContext(struct)
    const query = Queries.generators.chains({
        chainTest: l => StructureProperties.chain.label_asym_id(l.element) == 'A' || StructureProperties.chain.label_asym_id(l.element)== 'B'
    })
    const res = query(ctx) as StructureSelection.Sequence;
    // Convert the StructureSelection into a Loci, add a transparency of 1
    setStructureTransparency(plugin, structRef?.components!, 1, async ()=> StructureSelection.toLociWithSourceUnits(res))
}   
init();