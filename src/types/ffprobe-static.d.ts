declare module 'ffprobe-static' {
  // The package exports the path to a bundled ffprobe binary for the current platform.
  const ffprobe: { path: string }
  export default ffprobe
}
