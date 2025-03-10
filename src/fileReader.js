
import {Vector3} from "three";
import {Section} from "./section.js";

/**
 * Loads data from files.
 * @param {FileList} file
 * @returns List of sections
 */
async function loadData(files) {
    const sections = [];
    for (const file of files) {
        const text = await file.text();

        // Process lines to extract the items;
        const lines = text.split(/[\r\n]+/);

        // Group lines by sections
        let currentSection = [];
        for (const line of lines) {
            if (line.includes("<END>")) {
                // New section
                sections.push(currentSection);
                currentSection = [];
            } else {
                currentSection.push(line);
            }
        }

        // Add final section (if there is anything after the <END> tag)
        if (
            currentSection.length === 0 ||
            (currentSection.length === 1 && currentSection[0] === "")
        ) {
            continue;
        }
        sections.push(currentSection);
    }

    return sections.map(s=>parseSection(s));
}

function parseSection(lines) {

    const nAtoms = parseInt(lines[0]);
    const comment = lines[1];

    const atoms = [];
    const bonds = [];

    let i = 2;

    for (let j=0; j<nAtoms; j++) {
        const [atomSym, x, y, z] = splitColumns(lines[i+j]);
        const atom = {
            sectionIdx: j+1, // Keep 1-indexed convention?
            symbol: atomSym,
            position: new Vector3(
                parseFloat(x),
                parseFloat(y),
                parseFloat(z)
            )
        };
        atoms.push(atom);
    }

    i += nAtoms;

    // Loop through remaining blocks
    for (let j=i; j<lines.length; j++) {
        if (lines[j].includes("<BOND>")) {
            const blockLines = extractBlock("</BOND>", lines, j);
            bonds.push(...parseBonds(blockLines, atoms));
        }
        else if (lines[j].includes("<ATOM>")) {
            const blockLines = extractBlock("</ATOM>", lines, j);
            parseAtoms(blockLines, atoms);
        }
    }

    const section = new Section(atoms, bonds, comment);

    return section;
}

// Bond order:
// 0	No bond, atoms are not connected
// 1	single bond
// 2	double bond
// 3	triple bond
// 4	partial bond
// 5	bond order 1.5
// 6	line between atoms

function parseBonds(lines, atoms) {
    const bonds = [];
    let automatic = true;
    if (lines[0].includes("AUTOMATIC")) {
        automatic = !lines[0].split("=")[1].includes("0");
        lines = lines.slice(1);
    }
    for (const line of lines) {
        const [i1, i2, order] = splitColumns(line).map(v=>parseInt(v));
        bonds.push({
            atom1: atoms[i1-1],
            atom2: atoms[i2-1],
            order: order,
            automatic: automatic
        });
    }
    return bonds;
}

// Split on spaces or tabs
function splitColumns(line) {
    return line.trim().split(/[ \t]+/g);
}

function extractBlock(endTag, lines, i) {
    for (let j=i+1; j<lines.length; j++) {
        if (lines[j].includes(endTag)) {
            return lines.slice(i+1,j);
        }
    }
}

function parseAtoms(lines, atoms) {
    for (let i=0; i<lines.length; i++) {
        // Make sure there is no whitespace surrounding equal signs
        const line = lines[i].replace(/[ \t]+=[ \t]/g, "=");

        // Assign additional attributes to atoms
        const cols = splitColumns(line);
        for (const column of cols) {
            const [key, val] = column.split("=");
            atoms[i][key.trim()] = val;
        }
    }
}

export {loadData};