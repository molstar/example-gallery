import { DefaultPluginSpec, PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { PluginContext } from 'molstar/lib/mol-plugin/context';

export async function initViewer(element: string | HTMLDivElement, options?: { spec?: PluginSpec }) {
    const parent = typeof element === 'string' ? document.getElementById(element)! as HTMLDivElement : element;
    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    parent.appendChild(canvas);

    const spec = options?.spec ?? DefaultPluginSpec();

    const plugin = new PluginContext(spec);
    await plugin.init();

    plugin.initViewer(canvas, parent);

    return plugin;
}

export async function createRootViewer(options?: { spec?: PluginSpec }) {
    const root = document.createElement('div') as HTMLDivElement;
    Object.assign(root.style, {
        position: 'absolute',
        inset: '40px',
        outline: '1px dotted #ccc',
    });
    document.body.appendChild(root);
    return initViewer(root, options);
}