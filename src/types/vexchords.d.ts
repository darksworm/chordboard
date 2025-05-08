declare module 'vexchords' {
  export interface ChordBoxOptions {
    width?: number;
    height?: number;
    showTuning?: boolean;
    // Add other options as needed
  }

  export interface ChordBoxDrawOptions {
    chord: Array<[number, number | 'x', string?] | [number, number]>;
    barres?: Array<{
      fromString: number;
      toString: number;
      fret: number;
    }>;
    position?: number;
    positionText?: number;
    // Add other draw options as needed
  }

  export class ChordBox {
    constructor(element: HTMLElement, options?: ChordBoxOptions);
    draw(options: ChordBoxDrawOptions): void;
    // Add other methods as needed
  }
}
