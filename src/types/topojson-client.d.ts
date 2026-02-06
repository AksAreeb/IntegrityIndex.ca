declare module "topojson-client" {
  export interface Topology<T = unknown> {
    type: string;
    objects: T;
    arcs?: number[][][];
    bbox?: number[];
    transform?: { scale: [number, number]; translate: [number, number] };
  }

  export function feature(topology: Topology, object: unknown): { type: string; features: unknown[] };
}
