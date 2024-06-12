import { StructureSelectionQuery } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { createRootViewer } from "./common/init";
import { Bond, StructureElement, StructureProperties } from "molstar/lib/mol-model/structure";
import { ThemeDataContext } from "molstar/lib/mol-theme/theme";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { ColorTheme } from "molstar/lib/mol-theme/color";
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';

async function init() {
    // Create viewer
    const plugin = await createRootViewer();

    // Download mmCIF
    const fileData = await plugin.builders.data.download(
        { url: "https://models.rcsb.org/9INS.bcif", isBinary: true }
    );

    // Load mmCIF and create representation
    const trajectory = await plugin.builders.structure.parseTrajectory(fileData, "mmcif");
    const presetStateObjects = await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

    if (!presetStateObjects) {
        throw new Error("Structure not loaded");
    }

    // The goal here is to color all atoms that have alternate locations with a different color
    // based on their alt location ID

    // Create an expression using molscript to select all atoms with an alt loc that is not empty
    const altLocExp = MS.struct.generator.atomGroups({
        'atom-test': MS.core.rel.neq([MS.struct.atomProperty.macromolecular.label_alt_id(), ''])
    });
    // Create a StructureSelectionQuery from the expression to pass it to the component builder
    const altLocSelectionQuery = StructureSelectionQuery('alt-loc', altLocExp)

    // From the alt-loc selection query, create a component for which we will later create a representation
    const component = await plugin.builders.structure.tryCreateComponentFromSelection(
        presetStateObjects.structure,   // The structure state object to create components from
        altLocSelectionQuery,           // The selection query for the alt-loc atoms
        "alt-loc"                       // A key to identify the component
    );

    // If the component failed to be created, throw an error
    if (!component?.cell) {
        throw new Error("Failed to create component from selection");
    }

    // Add the custom color theme to the plugin's color theme registry (only needs to be done once)
    plugin.representation.structure.themes.colorThemeRegistry.add(BallAndStickAltLocColorThemeProvider);

    // Add a ball-and-stick representation to the component we created
    // Use our custom color theme to color the atoms in our representation
    await plugin.builders.structure.representation.addRepresentation(
        component.cell,
        {
            type: "ball-and-stick",
            color: BallAndStickAltLocColorThemeProvider.name as any // Need to cast as any because theme was added at runtime
        },
    );
}
init();

// Create our custom color theme provider
export const BallAndStickAltLocColorThemeProvider: ColorTheme.Provider<{}, 'ball-and-stick-alt-loc'> = {
    name: 'ball-and-stick-alt-loc',                             // Name of the color theme to use in representation params
    label: 'Ball and stick that colors based on alt loc',       // Label for the color theme
    category: ColorTheme.Category.Atom,                         // Category for use in the UI
    factory: CustomColorTheme,                                  // Factory function with logic to decide color
    getParams: () => ({}),                                      // No parameters needed for this theme
    defaultValues: { },                                         // No default values for this theme
    isApplicable: (ctx: ThemeDataContext) => true,              // We can make this always applicable to any structure
};

export function CustomColorTheme(
    ctx: ThemeDataContext,
    props: PD.Values<{}>
): ColorTheme<{}> {
    // List of colors to use for the alt locs, modulo 8 to wrap around
    const colors = [
        ColorNames.red,
        ColorNames.blue,
        ColorNames.green,
        ColorNames.yellow,
        ColorNames.orange,
        ColorNames.purple,
        ColorNames.teal,
        ColorNames.violet
    ];
    // label_alt_id code to color function, maps A -> red, B -> blue, C -> green, etc.
    const codeToColor = (code: string) => {
        const charIndex = code.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
        return colors[charIndex%8] // Modulo 8 to wrap around
    }

    // StructureElement.Location object to use for querying atom properties
    const auxLocation = StructureElement.Location.create(ctx.structure);

    return {
        factory: CustomColorTheme,  // Factory function to use for this theme
        granularity: 'group',       // What granularity to use for Location ("group" gives Bond and StructureElement Location objects)
        color: location => {        // Function to decide color based on Location
            if (StructureElement.Location.is(location)) {
                // If the Location is a StructureElement.Location, use the atom to decide color
                return codeToColor(StructureProperties.atom.label_alt_id(location))
            } else if (Bond.isLocation(location)) {
                // If Location is a Bond.Location, use the first atom to decide color
                auxLocation.unit = location.aUnit;      // Need a StructureElement.Location to query atom properties
                auxLocation.element = location.aUnit.elements[location.aIndex];
                return codeToColor(StructureProperties.atom.label_alt_id(auxLocation))
            } else {
                // Anything else, return white
                return ColorNames.white;
            }
        },
        props: props,   // keep the properties passed to the CustomColorTheme function
    };
}