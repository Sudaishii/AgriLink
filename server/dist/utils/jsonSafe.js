"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJsonSafe = toJsonSafe;
/** MySQL2 can return bigint; JSON.stringify throws on BigInt — normalize for res.json(). */
function toJsonSafe(row) {
    return JSON.parse(JSON.stringify(row, (_, v) => (typeof v === 'bigint' ? Number(v) : v)));
}
