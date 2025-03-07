import * as THREE from "three";
import {GLTFExporter} from "three/addons/exporters/GLTFExporter.js";

function notify(message, type) {
    // eslint-disable-next-line no-undef
    Metro.notify.create(message, type, {
        keepOpen: true
    });
}

function randItem(array){
    return array[Math.floor(Math.random() * array.length)];
}

const emptyElem = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color()
};

function exportGLTF(scene, binary=false, name="scene") {
    // Instantiate an exporter
    let exporter = new GLTFExporter();
    let options = {
        binary: binary
    };

    // Removes instances (the glTF exporter cannot yet support instances
    // and the Blender glTF importer doesn't either)
    const deinstancedScene = deinstantiate(scene);

    // Parse the input and generate the glTF output
    exporter.parse(deinstancedScene,
        result => {
            if (result instanceof ArrayBuffer) {
                saveArrayBuffer(result, `${name}.glb`);
            } else {
                let output = JSON.stringify(result, null, 2);
                saveString(output, `${name}.gltf`);
            }
        },
        error => {
            console.log("An error happened during parsing", error);
        },
        options
    );
}

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

const link = document.createElement("a");
link.style.display = "none";
document.body.appendChild(link); // Firefox workaround, see #6594 threejs
function save( blob, filename ) {
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function saveString( text, filename ) {
    save(new Blob([text], {type: "text/plain"}), filename);
}

function saveArrayBuffer(buffer, filename) {
    save(new Blob([buffer], {type: "application/octet-stream"}), filename);
}

export {notify, randItem, exportGLTF, saveString};