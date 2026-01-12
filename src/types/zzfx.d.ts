declare module 'zzfx' {
  export function zzfx(...args: number[]): AudioBufferSourceNode;
  export function zzfxP(...args: unknown[]): void;
  export function zzfxG(...args: number[]): number[];
  export function zzfxM(...args: unknown[]): unknown[];
}
