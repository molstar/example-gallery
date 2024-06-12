import { Camera } from "molstar/lib/mol-canvas3d/camera";
import { createRootViewer } from "./common/init";
import { Quat, Vec3 } from "molstar/lib/mol-math/linear-algebra";

async function init() {
    // Create viewer
    const plugin = await createRootViewer();
    
    // Download mmCIF
    const fileData = await plugin.builders.data.download(
        { url: "https://models.rcsb.org/4hhb.bcif", isBinary: true }
    );

    // Load mmCIF and create representation
    const trajectory = await plugin.builders.structure.parseTrajectory(fileData, "mmcif");
    await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

    if (!plugin.canvas3d) {
        throw new Error("Canvas3D not available")
    }
    // Get camera from plugin
    const camera = plugin.canvas3d.camera;

    // Add onclick to buttons
    // Use the camera manager's reset method to reset the camera position
    document.getElementById('reset')!.onclick = () => plugin.managers.camera.reset();
    // Use a custom function to pan the camera
    document.getElementById('panLeft')!.onclick = () => panCameraX(camera, -10)
    document.getElementById('panRight')!.onclick = () => panCameraX(camera, 10)
    // Use a custom function to zoom the camera
    document.getElementById('zoomIn')!.onclick = () => zoomCamera(camera, -10)
    document.getElementById('zoomOut')!.onclick = () => zoomCamera(camera, 10)
    // Use a custom function to pitch the camera
    document.getElementById('rotDown')!.onclick = () => pitchCamera(camera, -15)
    document.getElementById('rotUp')!.onclick = () => pitchCamera(camera, 15)
}
init();

function panCameraX(camera: Camera, distance: number){
    // Create a translation vector with `distance` as the x component
    const translation = Vec3.create(distance, 0, 0);

    // Apply the translation to the camera target
    // We move the camera target and the camera position will follow automatically
    Vec3.add(camera.target, camera.target, translation);
}

function zoomCamera(camera: Camera, percentage: number){
    // Initialize delta vector to set camera position at the end
    const dEye = Vec3();
    // Calculate the current position from the target to the camera
    Vec3.sub(dEye, camera.position, camera.target);
    // Calculate factor to scale the eye vector
    const factor = 1.0 + percentage/100
    Vec3.scale(dEye, dEye, factor);
    // Set the new position of the camera using the delta vector
    Vec3.add(camera.position, camera.target, dEye);
}

function pitchCamera(camera: Camera, angleDeg: number){
    // Convert the angle from degrees to radians
    const angleRad = angleDeg * Math.PI / 180;

    // First initialize vectors and matrices to perform calculations
    const quat = Quat();    // Quaternion to store the rotation
    const dir = Vec3();     // Direction vector for axis of rotation;
    const dEye = Vec3();    // Final delta vector to set camera position at the end

    // Calculate the current position from the target to the camera
    Vec3.sub(dEye, camera.position, camera.target);
    // Calculate the axis of rotation to pitch up
    Vec3.cross(dir, dEye, camera.up);
    Vec3.normalize(dir, dir);
    // Set the rotation axis angle in the quaternion
    Quat.setAxisAngle(quat, dir, angleRad);
    // Apply the quaternion transformation to the eye AND the up vector
    Vec3.transformQuat(dEye, dEye, quat);
    Vec3.transformQuat(camera.up, camera.up, quat);
    // Set the new position of the camera using the delta vector
    Vec3.add(camera.position, camera.target, dEye);

}