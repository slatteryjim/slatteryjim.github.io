import { hsk30Band1Characters } from "./hsk30-band1-characters.js";
import { hsk30Band1Words } from "./hsk30-band1-words.js";
import { additionFacts0To10 } from "./arithmetic-addition-0-10.js";
import { multiplicationFacts0To10 } from "./arithmetic-multiplication-0-10.js";
import { bassStaffNotes } from "./music-bass-staff-notes.js";
import { trebleStaffNotes } from "./music-treble-staff-notes.js";
export const contentPacks = [
    hsk30Band1Characters,
    hsk30Band1Words,
    additionFacts0To10,
    multiplicationFacts0To10,
    trebleStaffNotes,
    bassStaffNotes,
];
export function getContentPack(packId) {
    return contentPacks.find((pack) => pack.id === packId) ?? contentPacks[0];
}
