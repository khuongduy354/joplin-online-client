// Stub for fs/fs-extra/graceful-fs in browser environment
// These are no-op stubs to prevent import errors

export default {
  readFile: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  writeFile: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  appendFile: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  readFileSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  writeFileSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  appendFileSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  stat: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  statSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  unlink: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  unlinkSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  mkdir: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  mkdirSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  readdir: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  readdirSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  exists: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  existsSync: () => false,
  copy: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  copySync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  move: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  moveSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  remove: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  removeSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  ensureDir: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  ensureDirSync: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  createReadStream: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
  createWriteStream: () => {
    throw new Error("Filesystem operations not supported in browser");
  },
};
