import {Color} from "three";

export const atomConstants = {
    "H": {radius: 0.32, color: new Color(0xF2F2F2)},
    "C": {radius: 0.53, color: new Color(0x555555)},
    "O": {radius: 0.56, color: new Color(0xF32E42)},
    "Si": {radius: 0.65, color: new Color(0xF0C8A0)},
    "Cr": {radius: 0.76, color: new Color(0x8A99C7)},
    "F": {radius: 0.59, color: new Color(0x7FD03B)},
    // (Will need more of these)
};
export const defaultAtomRadius = 0.5;
export const defaultAtomColor = new Color(1, 1, 1);