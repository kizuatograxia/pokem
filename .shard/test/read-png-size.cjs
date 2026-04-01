const fs = require("fs");
const path = require("path");

const filePath = path.resolve(process.cwd(), process.argv[2]);
const buffer = fs.readFileSync(filePath);

if (buffer.toString("ascii", 1, 4) !== "PNG") {
  throw new Error("Not a PNG file");
}

console.log(`${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`);
