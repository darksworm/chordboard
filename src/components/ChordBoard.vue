<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { fetchChordData, type Chord as ChordType } from '../services/chordserverapi';
import Chord from './Chord.vue';
import {
  draggable,
  dropTargetForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

// Define grid cell size
const GRID_CELL_WIDTH = 220; // Width of a grid cell in pixels
const GRID_CELL_HEIGHT = 280; // Height of a grid cell in pixels

interface ChordItem {
  id: string;
  chord: ChordType;
  position: { x: number; y: number };
  gridPosition: { row: number; col: number };
}

interface Column {
  id: string;
  index: number;
  chords: ChordItem[];
}

const chordInput = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');
const gridRef = ref<HTMLElement | null>(null);

const currentChord = ref<ChordType | null>(null);
const columns = ref<Column[]>([]);
const cleanupFunctions = ref<(() => void)[]>([]);

// Generate a unique ID
const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Initialize with one empty column
onMounted(() => {
  if (columns.value.length === 0) {
    columns.value.push({
      id: generateId(),
      index: 0,
      chords: []
    });
  }
});

// Calculate the number of columns that can fit in the grid
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

// Generate a unique ID for each chord
const generateChordId = () => `chord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const handleChordSubmit = async () => {
  if (!chordInput.value.trim()) {
    errorMessage.value = 'Please enter a chord name';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  const fetchedChord = await fetchChordData(chordInput.value);

  if (fetchedChord.isErr()) {
    errorMessage.value = fetchedChord.error;
    currentChord.value = null;
  } else {
    currentChord.value = fetchedChord.value;

    // Use the first column by default
    const columnIndex = 0;

    // Find an empty grid position for the new chord in the selected column
    const gridPosition = findEmptyGridPosition(columnIndex);

    // Convert grid position to pixel coordinates
    const pixelPosition = gridToPixelPosition(gridPosition.row, gridPosition.col);

    // Automatically add the chord to the pinboard
    const newChord: ChordItem = {
      id: generateChordId(),
      chord: fetchedChord.value,
      position: pixelPosition,
      gridPosition: gridPosition
    };

    // Add the chord to the appropriate column
    if (columns.value.length === 0) {
      // Create a new column if none exists
      columns.value.push({
        id: generateId(),
        index: 0,
        chords: [newChord]
      });
    } else {
      // Add to the first column
      columns.value[columnIndex].chords.push(newChord);
    }

    // Clear the input field for the next chord
    chordInput.value = '';
  }

  isLoading.value = false;

  // Refocus on the input element
  setTimeout(() => {
    inputRef.value?.focus();
  }, 0);
};


// Remove a chord from the grid
const removeChord = (id: string) => {
  for (let i = 0; i < columns.value.length; i++) {
    const column = columns.value[i];
    const chordIndex = column.chords.findIndex(chord => chord.id === id);

    if (chordIndex !== -1) {
      column.chords.splice(chordIndex, 1);
      return;
    }
  }
};

// Function to set up draggable for a chord element
const setupDraggable = (element: HTMLElement, chordId: string) => {
  if (!element) return;

  // Make the element draggable
  const cleanup = draggable({
    element,
    dragHandle: element
  });

  // Store the cleanup function
  cleanupFunctions.value.push(cleanup);
};

// Function to set up draggable for a column
const setupColumnDraggable = (element: HTMLElement, columnId: string, columnIndex: number) => {
  if (!element) return;

  // Find the drag handle element
  const dragHandleSelector = `[data-column-drag-handle="${columnId}"]`;
  const dragHandle = element.querySelector(dragHandleSelector);

  if (!dragHandle) return;

  // Make the column draggable by its handle
  const cleanup = draggable({
    element,
    dragHandle: dragHandle as HTMLElement
  });

  // Store the cleanup function
  cleanupFunctions.value.push(cleanup);
};

// Function to add a new column at the specified index
const addColumn = (index: number) => {
  // Create a new column
  const newColumn: Column = {
    id: generateId(),
    index: index,
    chords: []
  };

  // Insert the column at the specified index
  columns.value.splice(index, 0, newColumn);

  // Update the index of all columns after the inserted one
  for (let i = index + 1; i < columns.value.length; i++) {
    columns.value[i].index = i;
  }
};

// Function to update grid dimensions
const updateGridDimensions = () => {
  if (!gridRef.value) return;

  const gridWidth = gridRef.value.clientWidth;
  const gridHeight = gridRef.value.clientHeight;

  gridColumns.value = Math.ceil(gridWidth / GRID_CELL_WIDTH);
  gridRows.value = Math.ceil(gridHeight / GRID_CELL_HEIGHT);
};

// Set up drag and drop functionality
onMounted(() => {
  if (!gridRef.value) return;

  // Calculate grid dimensions
  updateGridDimensions();

  // Add window resize listener to recalculate grid dimensions
  const handleResize = () => {
    updateGridDimensions();
  };
  window.addEventListener('resize', handleResize);
  cleanupFunctions.value.push(() => window.removeEventListener('resize', handleResize));

  // Make the grid a drop target for chord items
  const cleanupChordDropTarget = dropTargetForElements({
    element: gridRef.value,
    onDrop: ({ source, location }) => {
      const chordId = source.element.getAttribute('data-chord-id');
      if (!chordId) return;

      // Find the chord in all columns
      let foundChord: ChordItem | null = null;
      let sourceColumnIndex = -1;
      let sourceChordIndex = -1;

      for (let i = 0; i < columns.value.length; i++) {
        const column = columns.value[i];
        const chordIndex = column.chords.findIndex(c => c.id === chordId);

        if (chordIndex !== -1) {
          foundChord = column.chords[chordIndex];
          sourceColumnIndex = i;
          sourceChordIndex = chordIndex;
          break;
        }
      }

      if (!foundChord || sourceColumnIndex === -1 || sourceChordIndex === -1) return;

      // Store original position in case we need to revert
      const originalGridPosition = { ...foundChord.gridPosition };

      // Get the grid position from the drop location
      const gridRect = gridRef.value!.getBoundingClientRect();
      const relativeX = location.current.input.clientX - gridRect.left;
      const relativeY = location.current.input.clientY - gridRect.top;

      // Calculate the nearest grid position
      const gridPosition = calculateGridPosition(relativeX, relativeY);

      // Determine which column the chord is being dropped into
      const targetColumnIndex = gridPosition.col;

      // Ensure the target column exists
      while (columns.value.length <= targetColumnIndex) {
        columns.value.push({
          id: generateId(),
          index: columns.value.length,
          chords: []
        });
      }

      // Check if the target position is already occupied by another chord
      if (isPositionOccupied(gridPosition.row, gridPosition.col, chordId)) {
        // Position is occupied, revert to original position
        const pixelPosition = gridToPixelPosition(originalGridPosition.row, originalGridPosition.col);
        foundChord.position = pixelPosition;
        foundChord.gridPosition = originalGridPosition;
      } else {
        // Position is free, update the chord's position
        const pixelPosition = gridToPixelPosition(gridPosition.row, gridPosition.col);
        foundChord.position = pixelPosition;
        foundChord.gridPosition = gridPosition;

        // If the column has changed, move the chord to the new column
        if (targetColumnIndex !== sourceColumnIndex) {
          // Remove from source column
          columns.value[sourceColumnIndex].chords.splice(sourceChordIndex, 1);

          // Add to target column
          columns.value[targetColumnIndex].chords.push(foundChord);
        }
      }
    }
  });

  // Store the cleanup function
  cleanupFunctions.value.push(cleanupChordDropTarget);

  // Make the grid a drop target for columns
  const cleanupColumnDropTarget = dropTargetForElements({
    element: gridRef.value,
    onDrop: ({ source, location }) => {
      const columnId = source.element.getAttribute('data-column-id');
      if (!columnId) return;

      const columnIndex = parseInt(source.element.getAttribute('data-column-index') || '-1', 10);
      if (columnIndex === -1 || columnIndex >= columns.value.length) return;

      // Get the drop location
      const gridRect = gridRef.value!.getBoundingClientRect();
      const relativeX = location.current.input.clientX - gridRect.left;

      // Calculate the target column index based on the drop location
      const targetColumnIndex = Math.floor(relativeX / GRID_CELL_WIDTH);

      // Don't do anything if the column is dropped at its original position
      if (targetColumnIndex === columnIndex) return;

      // Move the column to the new position
      const [movedColumn] = columns.value.splice(columnIndex, 1);
      columns.value.splice(targetColumnIndex, 0, movedColumn);

      // Update the index of all columns
      columns.value.forEach((column, index) => {
        column.index = index;
      });
    }
  });

  // Store the cleanup function
  cleanupFunctions.value.push(cleanupColumnDropTarget);
});

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  // Call all cleanup functions
  cleanupFunctions.value.forEach(cleanup => cleanup());
  // Clear the cleanup functions array
  cleanupFunctions.value = [];
});
</script>

<template>
  <div class="chord-board">
    <div class="chord-search">
      <form @submit.prevent="handleChordSubmit">
        <input
          ref="inputRef"
          v-model="chordInput"
          type="text"
          placeholder="Enter chord name (e.g., Am, F#maj, G7)"
          :disabled="isLoading"
        />
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>

    <div ref="gridRef" class="chord-grid">
      <div class="columns-container">
        <div
          v-for="(column, columnIndex) in columns"
          :key="column.id"
          :data-column-id="column.id"
          :data-column-index="columnIndex"
          class="column"
          :style="{
            width: `${GRID_CELL_WIDTH}px`,
            left: `${columnIndex * GRID_CELL_WIDTH}px`
          }"
          :ref="el => el && setupColumnDraggable(el as HTMLElement, column.id, columnIndex)"
        >
          <div class="column-header" :data-column-drag-handle="column.id">
            <div class="column-drag-handle">
              <span class="drag-icon">≡</span>
            </div>
            <button
              class="add-column-button"
              @click="addColumn(columnIndex + 1)"
              title="Add column"
            >
              +
            </button>
          </div>

          <div class="column-content">
            <div
              v-for="chord in column.chords"
              :key="chord.id"
              :data-chord-id="chord.id"
              class="chord-item"
              :style="{
                top: `${chord.position.y}px`,
                width: `${GRID_CELL_WIDTH - 20}px`,
                height: `${GRID_CELL_HEIGHT}px`
              }"
              :ref="el => el && setupDraggable(el as HTMLElement, chord.id)"
            >
              <button
                @click="removeChord(chord.id)"
                class="remove-button"
                title="Remove chord"
              >
                ×
              </button>
              <Chord :chord="chord.chord" />
            </div>
          </div>
        </div>

        <!-- Add column button at the end -->
        <button
          class="add-column-button end-button"
          @click="addColumn(columns.length)"
          title="Add column"
          :style="{
            left: `${columns.length * GRID_CELL_WIDTH + 10}px`
          }"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chord-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1rem;
}

.chord-grid {
  position: relative;
  width: 100%;
  height: calc(100vh - 150px);
  border: 1px dashed #ccc;
  border-radius: 8px;
  margin-top: 0.5rem;
  overflow: auto;
  background-color: #f9f9f9;
}

.columns-container {
  position: relative;
  min-height: 100%;
  display: flex;
}

.column {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.02);
  border-right: 1px dashed #ccc;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #ddd;
  height: 40px;
  cursor: move;
}

.column-drag-handle {
  display: flex;
  align-items: center;
  cursor: move;
}

.drag-icon {
  font-size: 20px;
  color: #666;
}

.column-content {
  position: relative;
  flex: 1;
  padding: 10px;
  overflow: visible;
  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: v-bind('`100% ${GRID_CELL_HEIGHT}px`');
}

.add-column-button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  border: none;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.add-column-button:hover {
  opacity: 1;
}

.add-column-button.end-button {
  position: absolute;
  top: 10px;
}

.chord-item {
  position: absolute;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: move;
  transition: box-shadow 0.2s, transform 0.2s;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  left: 0;
}

.chord-item:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  z-index: 2;
  transform: scale(1.02);
}

.remove-button {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #f44336;
  color: white;
  border: none;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  z-index: 3;
}

.remove-button:hover {
  opacity: 1;
  background-color: #d32f2f;
}


button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chord-search {
  width: 100%;
  max-width: 500px;
  margin-bottom: 1rem;
}

.chord-search form {
  display: flex;
  gap: 0.5rem;
}

.chord-search input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.chord-search input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.error-message {
  color: #d32f2f;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
</style>
