/** Public asset paths (served from /public). */
export const ASSETS = {
  basis: "/basis/",
  fabric: (kind: string, map: "detail" | "normal" | "mask") => `/textures/fabric/${kind}-${map}.ktx2`,
  closeup: (kind: string) => `/textures/fabric/${kind}-closeup.webp`,
  thread: "/textures/fabric/embroidered-thread.webp",
  render: (name: string) => `/renders/${name}.webp`,
};
