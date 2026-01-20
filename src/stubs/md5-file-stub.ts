// Stub for md5-file in browser environment

export default function md5File() {
  throw new Error("md5-file operations not supported in browser");
}

export const sync = () => {
  throw new Error("md5-file operations not supported in browser");
};
