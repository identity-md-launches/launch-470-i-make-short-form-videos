/** Create the public source download with Node alone; never include dependencies or prior exports. */
import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
const roots = [
  "src",
  "public",
  "scripts",
  "test/fixtures",
  "test/collection.test.mjs",
  "docs",
  "artifacts",
  "licenses",
  "package.json",
  "package-lock.json",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
  "README.md",
  "DESIGN.md",
  "LICENSE",
  "THIRD_PARTY.md",
];
const files = [];
async function collect(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOTDIR") {
      files.push(path);
      return;
    }
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink())
      throw new Error(
        `Source archive cannot contain a symlink: ${path}/${entry.name}`,
      );
    if (["node_modules", ".git", ".env", "source.zip"].includes(entry.name))
      continue;
    if (entry.isDirectory()) await collect(join(path, entry.name));
    else files.push(join(path, entry.name));
  }
}
for (const root of roots) await collect(root);
const table = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const locals = [],
  centrals = [];
let offset = 0;
for (const path of files.sort()) {
  const name = Buffer.from(`pepe-premiere/${path}`),
    data = await readFile(path),
    packed = deflateRawSync(data),
    crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(0x21, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(packed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(packed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  locals.push(local, name, packed);
  centrals.push(central, name);
  offset += local.length + name.length + packed.length;
}
const directory = Buffer.concat(centrals),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const archive = Buffer.concat([...locals, directory, end]);
await writeFile("dist/source.zip", archive);
console.log(
  `Source download: ${files.length} files, ${archive.length} bytes (dist/source.zip)`,
);

// Runtime distributions retain the dependency notices next to the source download.
await cp("licenses", "dist/licenses", { recursive: true });
await cp("docs", "dist/docs", { recursive: true });
await cp("LICENSE", "dist/LICENSE");
await writeFile(
  "dist/THIRD_PARTY.md",
  (await readFile("THIRD_PARTY.md", "utf8")).replaceAll(
    "public/fonts/",
    "fonts/",
  ),
);
