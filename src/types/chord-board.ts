import { type Chord as ChordType } from '../services/chordserverapi';

// Define grid cell size
export const GRID_CELL_WIDTH = 220; // Width of a grid cell in pixels
export const GRID_CELL_HEIGHT = 280; // Height of a grid cell in pixels

export interface ChordInGrid {
  id: string;
  chord: ChordType;
  position: { x: number; y: number };
  gridPosition: { row: number; col: number };
  selectedFingering: number;
}

export interface GridColumn {
  id: string;
  index: number;
  chords: ChordInGrid[];
}

// Helper function to generate a unique ID
export const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to generate a unique chord ID
export const generateChordId = () => `chord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
