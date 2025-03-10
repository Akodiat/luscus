import * as THREE from "three";

function notify(message, type) {
    // eslint-disable-next-line no-undef
    Metro.notify.create(message, type, {
        keepOpen: true
    });
}

const emptyElem = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color()
};

/**
 * Recursive function to replace instanced objects (cohort trees) with ordinary meshes
 * @param {THREE.Object3D} object Root object to deinstantiate
 * @param {Map<number, THREE.Material>} materialMap (optional) Avoids duplicate materials
 * @returns A clone of the object, with all instanced objects replaced with ordinary meshes
 */
function deinstantiate(object, materialMap) {
    if (materialMap === undefined) {
        materialMap = new Map();
    }

    if (object.isInstancedMesh !== true) {
        const clone = object.clone(false);
        if (object.children.length > 0) {
            // Recursively call this function for all children
            clone.children = object.children.map(c=>deinstantiate(c, materialMap));
        }
        return clone;
    } else {
        const count = object.count;
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();

        const group = new THREE.Group();
        for (let i = 0; i < count; i++) {
            object.getColorAt(i, color);
            const hexColor = color.getHex();

            if (!materialMap.has(hexColor)) {
                const m = object.material.clone();
                m.color.copy(color);
                materialMap.set(hexColor, m);
            }
            const mesh = new THREE.Mesh(
                object.geometry,
                materialMap.get(hexColor)
            );

            object.getMatrixAt(i, matrix);
            matrix.decompose(
                mesh.position,
                mesh.quaternion,
                mesh.scale
            );

            // Don't include empty elements
            // Otherwise all cohorts get 1000 meshes
            if (!mesh.scale.equals(emptyElem.scale)) {
                group.add(mesh);
            }
        }
        return group;
    }
}


export {notify, deinstantiate};