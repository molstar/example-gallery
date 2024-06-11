import { PluginContext } from "molstar/lib/mol-plugin/context";
import { DefaultPluginSpec } from "molstar/lib/mol-plugin/spec";

export async function createRootViewer() {
  const viewport = document.getElementById("app") as HTMLDivElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  const plugin = new PluginContext(DefaultPluginSpec());
  await plugin.init();

  if (!plugin.initViewer(canvas, viewport)) {
    viewport.innerHTML = "Failed to init Mol*";
    throw new Error("init failed");
  }
  //@ts-ignore
  window["molstar"] = plugin;

  return plugin;
}
