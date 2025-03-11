import {drawInstances, updateInstance} from "./draw.js";
import {
    atomConstants,
    defaultAtomColor,
    defaultAtomRadius,
    bondRadius
} from "./constants.js";

import {Matrix4, Quaternion, Vector3} from "three";


class View {
    constructor(api) {
        this.api = api;
    }

    updateAtomPositions(atoms) {
        const atomSet = new Set(atoms);
        const m = new Matrix4()
        // Get instance ids
        this.api.sections.flatMap(s=>s.atoms).forEach(
            (atom, instanceId) => {
            if (atomSet.has(atom)) {
                this.instancedAtoms.getMatrixAt(instanceId, m);
                m.setPosition(atom.position);
                this.instancedAtoms.setMatrixAt(instanceId, m);
                this.instancedAtoms.instanceMatrix.needsUpdate = true;
            }
        });

        this.api.sections.flatMap(s=>s.bonds).forEach(
            (b, instanceId) => {
            if (atomSet.has(b.atom1) || atomSet.has(b.atom2)) {
                m.compose(
                    // Position between atoms
                    b.atom1.position.clone().add(b.atom2.position).divideScalar(2),
                    // Rotate to align with line between atoms
                    new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        b.atom1.position.clone().sub(b.atom2.position).normalize()
                    ),
                    // Scale to distance between atoms
                    new THREE.Vector3(bondRadius, b.atom1.position.distanceTo(b.atom2.position), bondRadius)
                );
                this.instancedBonds.setMatrixAt(instanceId, m);
                this.instancedBonds.instanceMatrix.needsUpdate = true;
            }
        });
    }

    // Draw atoms
    redrawAtomView() {
        // Remove old atom instances
        this.api.scene.remove(this.instancedAtoms);

        const atomElements = this.api.sections.flatMap(s=>s.atoms).map(a=>{
            let atomConst = atomConstants[a.symbol];
            if (atomConst === undefined) {
                atomConst = {
                    radius: defaultAtomRadius,
                    color: defaultAtomColor,
                };
            }
            return {
                position: a.position,
                quaternion: new THREE.Quaternion(),
                scale: new THREE.Vector3(
                    atomConst.radius,
                    atomConst.radius,
                    atomConst.radius
                ),
                color: atomConst.color
            };
        });

        const atomGeometry = new THREE.SphereGeometry(1, 32, 32);

        this.instancedAtoms = drawInstances(
            atomGeometry,
            atomElements,
            new THREE.MeshStandardMaterial()
        );
        this.instancedAtoms.receiveShadow = true;
        this.instancedAtoms.castShadow = true;

        this.api.scene.add(this.instancedAtoms);
    }

    // Draw bonds
    redrawBondView() {
        // Remove old bond instances
        this.api.scene.remove(this.instancedBonds);
        const bondElements = this.api.sections.flatMap(s=>s.bonds).map(b=>{
            return {
                // Position between atoms
                position: b.atom1.position.clone().add(b.atom2.position).divideScalar(2),
                // Rotate to align with line between atoms
                quaternion: new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    b.atom1.position.clone().sub(b.atom2.position).normalize()
                ),
                // Scale to distance between atoms
                scale: new THREE.Vector3(bondRadius, b.atom1.position.distanceTo(b.atom2.position), bondRadius),
                color: new THREE.Color(1, 1, 1)
            };
        });

        const bondGeometry = new THREE.CylinderGeometry(1, 1, 1, 32, 32);

        this.instancedBonds = drawInstances(
            bondGeometry,
            bondElements,
            new THREE.MeshStandardMaterial()
        );
        this.instancedBonds.receiveShadow = true;
        this.instancedBonds.castShadow = true;

        this.api.scene.add(this.instancedBonds);
    }

}

export {View}