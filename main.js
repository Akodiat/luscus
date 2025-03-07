import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {Api} from "./src/api.js";
import {loadData} from "./src/fileHandler.js";
import { drawInstances } from "./src/draw.js";

const atomConstants = {
    "H": {radius: 0.32, color: new THREE.Color(0xF2F2F2)},
    "C": {radius: 0.53, color: new THREE.Color(0x555555)},
    "O": {radius: 0.56, color: new THREE.Color(0xF32E42)},
    "Si": {radius: 0.65, color: new THREE.Color(0xF0C8A0)}
    // (Will need more of these)
};
const defaultAtomRadius = 0.1;
const defaultAtomColor = new THREE.Color(1, 1, 1);

let camera, scene, renderer, controls;

init();

// Initialise scene
function init() {
    // Setup renderer
    renderer = new THREE.WebGLRenderer({
        alpha: true, antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    const container = document.getElementById("container");
    container.appendChild(renderer.domElement);

    // Setup scene and camera
    scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
    camera.position.set(-5, 5, -5);

    // Add x-y-z axis indicator
    //const axesHelper = new THREE.AxesHelper(1);
    //scene.add(axesHelper);

    // Setup hemisphere and ambient lights
    // Directional light is setup later, when we know where to point it
    const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 5); // soft white light
    scene.add(ambientLight);

    // And camera controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener("change", render);

    // Update camera aspect ratio on window resize
    window.addEventListener("resize", onWindowResize);

    // Open the dialog to load data if the user clicks the empty scene
    // eslint-disable-next-line no-undef
    const openDataLoadDialog = ()=>Metro.dialog.open("#dataLoadDialog");
    container.addEventListener("click", openDataLoadDialog);

    render();

    // Load data when file is uploaded
    function onFileUpload(files) {
        loadData(files).then(
            system=>{
                // We can now remove this listener, since data is loaded
                container.removeEventListener("click", openDataLoadDialog);

                // Reset cursor (it was a pointer because of the click listener)
                container.style.cursor = "auto";

                // Also remove the "no data" message
                document.getElementById("noDataMessage").style.display = "none";

                window.api = new Api(camera, scene, renderer, controls);
                window.THREE = THREE;
                onDataLoaded(system);
            }
        );
    }

    const fileInput = document.getElementById("fileInput");
    const dataLoadButton = document.getElementById("dataLoadButton");
    dataLoadButton.onclick = () => onFileUpload(fileInput.files);

    // The browser remembers the last input, so this is a shortcut to just
    // load whatever is in the fileInput without going through the Open
    // file dialog. (Just press Enter)
    document.onkeydown = (keyEvent)=>{
        switch (keyEvent.code) {
        case "Enter":
            if (fileInput.files.length > 0) {
                onFileUpload(fileInput.files);
                keyEvent.preventDefault();
            }
            break;
        default:
            break;
        }
    };
}

function onDataLoaded(system) {

    const centreOfMass = new THREE.Vector3();
    let atomCount = 0;
    system.forEach(s=>s.atoms.forEach(a=>{
        centreOfMass.add(a.position);
        atomCount++;
    }));
    centreOfMass.divideScalar(atomCount);

    controls.target.copy(centreOfMass);
    controls.update();

    // Draw atoms

    const atomElements = system.flatMap(s=>s.atoms).map(a=>{
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

    const instancedAtoms = drawInstances(
        atomGeometry,
        atomElements,
        new THREE.MeshStandardMaterial()
    );
    instancedAtoms.receiveShadow = true;
    instancedAtoms.castShadow = true;

    scene.add(instancedAtoms);

    // Draw bonds

    const bondRadius = 0.125;
    const bondElements = system.flatMap(s=>s.bonds).map(b=>{
        return {
            // Position between atoms
            position: b.atom1.position.clone().add(b.atom2.position).divideScalar(2),
            // Rotate to align with line between atoms
            quaternion: new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                b.atom1.position.clone().sub(b.atom2.position).normalize()
            ),
            scale: new THREE.Vector3(bondRadius, b.atom1.position.distanceTo(b.atom2.position), bondRadius),
            color: new THREE.Color(1, 1, 1)
        };
    });

    const bondGeometry = new THREE.CylinderGeometry(1, 1, 1, 32, 32);

    const instancedBonds = drawInstances(
        bondGeometry,
        bondElements,
        new THREE.MeshStandardMaterial()
    );
    instancedBonds.receiveShadow = true;
    instancedBonds.castShadow = true;

    scene.add(instancedBonds);

    // Setup directional light and point it at centre.
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 20, 0);
    dirLight.target.position.copy(centreOfMass);
    dirLight.castShadow = true;

    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;

    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.radius = 4;
    scene.add(dirLight);
    scene.add(dirLight.target);

    /*
    const helper = new THREE.CameraHelper(dirLight.shadow.camera);
    scene.add(helper);
    */

    render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
}

function render() {
    renderer.render(scene, camera);
}