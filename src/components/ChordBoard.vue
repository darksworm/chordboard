<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Chord from './Chord.vue';

// Import types and composables
import { GRID_CELL_WIDTH, GRID_CELL_HEIGHT, type Column } from '../types/chord-board';
import { useGridCalculations } from '../composables/useGridCalculations';
import { useColumnManagement } from '../composables/useColumnManagement';
import { useChordManagement } from '../composables/useChordManagement';
import { useDragAndDrop } from '../composables/useDragAndDrop';

// Setup refs
const inputRef = ref<HTMLInputElement | null>(null);
const gridRef = ref<HTMLElement | null>(null);
const columns = ref<Column[]>([]);

// Initialize composables with dependencies
const {
  gridColumns,
  gridToPixelPosition,
  isPositionOccupied,
  findEmptyGridPosition,
  updateGridDimensions,
  totalColumnsWidth
} = useGridCalculations(gridRef, columns);

const {
  adjustColumnCount,
  moveColumn
} = useColumnManagement(columns, gridColumns, updateGridDimensions);

const {
  chordInput,
  isLoading,
  errorMessage,
  handleChordSubmit,
  removeChord,
  moveChord,
  swapChords
} = useChordManagement(columns, findEmptyGridPosition, gridToPixelPosition, adjustColumnCount);

const {
  setupDraggable,
  setupColumnDraggable,
  setupColumnDropTarget,
  setupGridDropTarget
} = useDragAndDrop(
  columns,
  gridRef,
  isPositionOccupied,
  gridToPixelPosition,
  moveColumn,
  moveChord,
  swapChords
);

// Set up drag and drop functionality
onMounted(() => {
  if (!gridRef.value) return;

  // Calculate grid dimensions and adjust column count
  updateGridDimensions();

  // Explicitly call adjustColumnCount to ensure columns are created
  adjustColumnCount();

  // Add window resize listener to recalculate grid dimensions
  const handleResize = () => {
    updateGridDimensions();
    adjustColumnCount();
  };
  window.addEventListener('resize', handleResize);

  // Set up the grid as a drop target for columns
  setupGridDropTarget();
});

// Focus on input after submitting
const focusInput = () => {
  setTimeout(() => {
    inputRef.value?.focus();
  }, 0);
};
</script>

<template>
  <div class="chord-board">
    <div class="chord-search">
      <form @submit.prevent="handleChordSubmit().then(focusInput)">
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
      <div class="columns-container" :style="{ width: totalColumnsWidth }">
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
          </div>

          <div
            class="column-content"
            :ref="el => el && setupColumnDropTarget(el as HTMLElement, column.id, columnIndex)"
          >
            <div
              v-for="chord in column.chords"
              :key="chord.id"
              :data-chord-id="chord.id"
              class="chord-item"
              :style="{
                top: `${chord.position.y}px`,
                width: `${GRID_CELL_WIDTH}px`,
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
  overflow-y: auto;
  overflow-x: hidden;
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
  background-color: transparent;
}

.column-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 8px;
  background-color: #e0e0e0;
  border: 1px solid #ccc;
  border-bottom: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  height: 25px;
  cursor: move;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
  margin-right: 0;
  position: relative;
  z-index: 1;
}

.column-drag-handle {
  display: flex;
  align-items: center;
  cursor: move;
  width: 100%;
  justify-content: center;
}

.drag-icon {
  font-size: 16px;
  color: #555;
}

.column-content {
  position: relative;
  flex: 1;
  padding: 10px;
  overflow: visible;
  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: v-bind('`100% ${GRID_CELL_HEIGHT}px`');
  border: 1px solid #ccc;
  border-top: none;
  background-color: #f9f9f9;
  margin-right: 0;
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
  margin-right: -10px; /* Compensate for the column-content padding */
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
