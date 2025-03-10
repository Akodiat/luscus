import {deinstantiate} from "./utils.js";
import {GLTFExporter} from "three/addons/exporters/GLTFExporter.js";

function toXYZColumn(atom, positionComponent) {
    const v = atom.position[positionComponent];
    const sign = v < 0 ? "" : " ";
    return sign + v.toFixed(9);
}

function saveLuscusFile(sections, name="file") {
    const lines = [];
    for (const section of sections) {
        lines.push(`  ${section.atoms.length}`);
        lines.push(section.comment);
        let otherAtomAttr = false;
        for (const atom of section.atoms) {
            lines.push(`  ${atom.symbol}     ${toXYZColumn(atom, "x")}     ${toXYZColumn(atom, "y")}     ${toXYZColumn(atom, "z")}`);
            // If there is anything more than id, symbol, and position
            if (Object.keys(atom).length > 3) {
                otherAtomAttr = true;
            }
        }
        if (otherAtomAttr) {
            lines.push(" <ATOM>");
            for (const atom of section.atoms) {
                const line = [];
                for (const attr of Object.keys(atom)) {
                    if (!["sectionIdx", "symbol", "position"].includes(attr)) {
                        line.push(`${attr}=${atom[attr]}`);
                    }
                }
                lines.push(line.join(" "));
            }
            lines.push(" </ATOM>");
        }
        if (section.bonds.length > 0) {
            lines.push(" <BOND>");

            // Should this be saved per bond or per bond block?
            lines.push(` AUTOMATIC = ${section.bonds[0].automatic ? 1:0}`);

            for (const b of section.bonds) {
                lines.push(
                    " " +[
                        b.atom1.sectionIdx,
                        b.atom2.sectionIdx,
                        b.order
                    ].join("  ")
                );
            }
            lines.push(" </BOND>");
        }
        lines.push(" </END>");
    }
    saveString(lines.join("\n"), name+".lus");
}

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

function save(blob, filename) {
    const link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link); // Firefox workaround, see #6594 threejs
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    document.body.removeChild(link);
}

function saveString(text, filename) {
    save(new Blob([text], {type: "text/plain"}), filename);
}

function saveArrayBuffer(buffer, filename) {
    save(new Blob([buffer], {type: "application/octet-stream"}), filename);
}

export {saveLuscusFile, exportGLTF};