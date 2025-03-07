import * as THREE from "three";

/**
 *
 * @param {THREE.BufferGeometry} geometry Base geometry to use
 * @param {any[]} elements
 * @param {THREE.Material} material  THREE.Material
 * @returns {THREE.InstancedMesh} Three.js Object containing the instanced objects
 */
function drawInstances(geometry, elements, material) {
    const count = elements.length;
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const matrix = new THREE.Matrix4();
    for (let i=0; i < count; i++) {
        matrix.compose(
            elements[i].position,
            elements[i].quaternion,
            elements[i].scale
        );
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, elements[i].color);
    }
    return mesh;
}

function updateAllInstances(mesh, elements) {
    const matrix = new THREE.Matrix4();
    const count = elements.length;
    for (let i=0; i < count; i++) {
        matrix.compose(
            elements[i].position,
            elements[i].quaternion,
            elements[i].scale
        );
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, elements[i].color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
}

function updateInstance(mesh, element, instanceId, matrix = new THREE.Matrix4()) {
    matrix.compose(
        element.position,
        element.quaternion,
        element.scale
    );
    mesh.setMatrixAt(instanceId, matrix);
    mesh.setColorAt(instanceId, element.color);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
}

export {drawInstances, updateAllInstances, updateInstance};
