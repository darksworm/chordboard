import { ref, type Ref, computed } from 'vue';
import { GRID_CELL_WIDTH, GRID_CELL_HEIGHT, type Column } from '../types/chord-board';

export function useGridCalculations(gridRef: Ref<HTMLElement | null>, columns: Ref<Column[]>) {
  // Calculate the number of columns and rows that can fit in the grid
  const gridColumns = ref(0);
  const gridRows = ref(0);

  // Function to calculate the nearest grid position
  const calculateGridPosition = (x: number, y: number) => {
    // Use Math.floor to get the nearest grid cell
    let col = Math.floor(x / GRID_CELL_WIDTH);
    let row = Math.floor(y / GRID_CELL_HEIGHT);

    // Ensure the position is within the grid boundaries
    col = Math.max(0, Math.min(col, gridColumns.value - 1));
    row = Math.max(0, Math.min(row, gridRows.value - 1));

    return { row, col };
  };

  // Function to convert grid position to pixel coordinates
  const gridToPixelPosition = (row: number, col: number) => {
    return {
      x: col * GRID_CELL_WIDTH,
      y: row * GRID_CELL_HEIGHT
    };
  };

  // Function to check if a grid position is occupied
  const isPositionOccupied = (row: number, col: number, excludeChordId?: string) => {
    return columns.value.some(column =>
      column.chords.some(chord =>
        chord.gridPosition.row === row &&
        chord.gridPosition.col === col &&
        (excludeChordId === undefined || chord.id !== excludeChordId)
      )
    );
  };

  // Function to find an empty grid position
  const findEmptyGridPosition = (columnIndex: number = 0) => {
    // Create a 2D array to track occupied positions
    const occupiedPositions: boolean[][] = Array(gridRows.value)
      .fill(false)
      .map(() => Array(gridColumns.value).fill(false));

    // Mark occupied positions
    columns.value.forEach(column => {
      column.chords.forEach(chord => {
        if (chord.gridPosition.row < gridRows.value && chord.gridPosition.col < gridColumns.value) {
          occupiedPositions[chord.gridPosition.row][chord.gridPosition.col] = true;
        }
      });
    });

    // Find the first empty position in the specified column
    // For column-based layout, we'll use a different approach:
    // Find the lowest empty row in the specified column
    const column = columns.value[columnIndex] || columns.value[0];
    const chordsInColumn = column.chords;

    // If there are no chords in the column, return the top position
    if (chordsInColumn.length === 0) {
      return { row: 0, col: columnIndex };
    }

    // Find the maximum row value in this column
    const maxRow = Math.max(...chordsInColumn.map(chord => chord.gridPosition.row));

    // Return the position below the lowest chord
    return { row: maxRow + 1, col: columnIndex };
  };

  // Function to update grid dimensions
  const updateGridDimensions = () => {
    if (!gridRef.value) return;

    const gridWidth = gridRef.value.clientWidth;
    const gridHeight = gridRef.value.clientHeight;

    gridColumns.value = Math.ceil(gridWidth / GRID_CELL_WIDTH);
    gridRows.value = Math.ceil(gridHeight / GRID_CELL_HEIGHT);
  };

  // Computed property for the total width of all columns
  const totalColumnsWidth = computed(() => {
    return `${columns.value.length * GRID_CELL_WIDTH}px`;
  });

  return {
    gridColumns,
    gridRows,
    calculateGridPosition,
    gridToPixelPosition,
    isPositionOccupied,
    findEmptyGridPosition,
    updateGridDimensions,
    totalColumnsWidth
  };
}
