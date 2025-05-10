<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Chord from './Chord.vue';

// Import types and composables
import { GRID_CELL_WIDTH, GRID_CELL_HEIGHT, type GridColumn } from '../types/chord-board';
import { useGridCalculations } from '../composables/useGridCalculations';
import { useColumnManagement } from '../composables/useColumnManagement';
import { useChordManagement } from '../composables/useChordManagement';
import { useDragAndDrop } from '../composables/useDragAndDrop';
import { useBoardPersistence } from '../composables/useBoardPersistence';

// Setup refs
const inputRef = ref<HTMLInputElement | null>(null);
const gridRef = ref<HTMLElement | null>(null);
const columns = ref<GridColumn[]>([]);

// Modal state
const showModal = ref(false);
const selectedCell = ref<{ columnIndex: number, row: number } | null>(null);

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
} = useColumnManagement(columns, gridColumns);

const {
  chordInput,
  isLoading,
  errorMessage,
  handleChordSubmit,
  removeChord,
} = useChordManagement(columns, findEmptyGridPosition, gridToPixelPosition, gridColumns);

// Initialize board persistence
const {
  saveState,
  loadState,
  setupAutoSave,
  error: persistenceError
} = useBoardPersistence(columns);

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
);

// Variable to store cleanup function for auto-save
let cleanupAutoSave: (() => void) | null = null;

// Set up drag and drop functionality and persistence
onMounted(() => {
  if (!gridRef.value) return;

  // Try to load saved state first
  const stateLoaded = loadState();

  // Calculate grid dimensions and adjust column count
  updateGridDimensions();

  // Only create default columns if no state was loaded
  if (!stateLoaded) {
    // Explicitly call adjustColumnCount to ensure columns are created
    adjustColumnCount();
  }

  // Add window resize listener to recalculate grid dimensions
  const handleResize = () => {
    updateGridDimensions();
    adjustColumnCount();
  };
  window.addEventListener('resize', handleResize);

  // Set up the grid as a drop target for columns
  setupGridDropTarget();

  // Set up automatic saving every 5 seconds
  cleanupAutoSave = setupAutoSave(5000);
});

// Clean up when component unmounts
onUnmounted(() => {
  // Clean up auto-save interval
  if (cleanupAutoSave) {
    cleanupAutoSave();
  }
});

// Focus on input after submitting
const focusInput = () => {
  setTimeout(() => {
    inputRef.value?.focus();
  }, 0);
};

// Show modal for adding a chord to a specific cell
const showChordModal = (columnIndex: number, row: number) => {
  selectedCell.value = { columnIndex, row };
  showModal.value = true;
  // Focus on input after modal is shown
  setTimeout(() => {
    inputRef.value?.focus();
  }, 50);
};

// Close the modal
const closeModal = () => {
  showModal.value = false;
  selectedCell.value = null;
  chordInput.value = '';
  errorMessage.value = '';
};

// Wrap chord operations to trigger saving
const handleChordSubmitAndSave = async () => {
  if (!showModal.value) {
    // If not in modal mode, use the default behavior
    await handleChordSubmit();
  } else {
    // If in modal mode, use the selected cell
    if (selectedCell.value) {
      await handleChordSubmit(selectedCell.value.columnIndex, selectedCell.value.row);
      if (!errorMessage.value) {
        // Only close the modal if there was no error
        closeModal();
      }
    }
  }
  // Save state after adding a chord
  saveState();
  return Promise.resolve();
};

const removeChordAndSave = (id: string) => {
  removeChord(id);
  // Save state after removing a chord
  saveState();
};
</script>

<template>
  <div class="chord-board">
    <!-- Modal for adding chords -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content" :class="{ 'loading': isLoading }">
        <div class="modal-header">
          <h3>Add Chord</h3>
          <button class="close-button" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleChordSubmitAndSave()">
            <input
              ref="inputRef"
              v-model="chordInput"
              type="text"
              placeholder="Enter chord name (e.g., Am, F#maj, G7)"
              :disabled="isLoading"
            />
            <button type="submit" :disabled="isLoading">
              {{ isLoading ? 'Loading...' : 'Add Chord' }}
            </button>
          </form>
          <div class="error-container">
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Top search bar (hidden when using the new UI) -->
    <div class="chord-search" v-if="false">
      <form @submit.prevent="handleChordSubmitAndSave().then(focusInput)">
        <input
          ref="inputRef"
          v-model="chordInput"
          type="text"
          placeholder="Enter chord name (e.g., Am, F#maj, G7)"
          :disabled="isLoading"
        />
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="persistenceError" class="error-message">Storage error: {{ persistenceError }}</p>
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
            <!-- Existing chords -->
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
                @click="removeChordAndSave(chord.id)"
                class="remove-button"
                title="Remove chord"
              >
                ×
              </button>
              <Chord :chord="chord.chord" />
            </div>

            <!-- Empty cells with plus buttons -->
            <div
              v-for="row in 20"
              :key="`empty-${columnIndex}-${row-1}`"
              class="empty-cell"
              :class="{ 'selected-cell': showModal && selectedCell && selectedCell.columnIndex === columnIndex && selectedCell.row === row-1 }"
              :style="{
                top: `${(row-1) * GRID_CELL_HEIGHT}px`,
                width: `${GRID_CELL_WIDTH}px`,
                height: `${GRID_CELL_HEIGHT}px`
              }"
              v-if="!isPositionOccupied(row-1, columnIndex)"
            >
              <button
                class="add-button"
                @click="showChordModal(columnIndex, row-1)"
                title="Add chord here"
              >
                +
              </button>
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
  height: 100vh;
  padding: 0;
}

.chord-grid {
  position: relative;
  width: 100%;
  height: 100vh;
  border: 1px dashed #ccc;
  border-radius: 0;
  margin-top: 0;
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
  color: #ff6b6b;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
  text-shadow: 0 0 5px rgba(255, 0, 0, 0.3);
  display: block;
}

/* Empty cell styles */
.empty-cell {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1; /* Always visible */
  transition: opacity 0.2s;
  z-index: 0;
  left: 0; /* Fix the offset issue */
}

.empty-cell:hover {
  z-index: 2;
}

.selected-cell {
  z-index: 3;
  box-shadow: 0 0 0 2px #ff3333, 0 0 20px rgba(255, 0, 0, 0.5);
  border-radius: 8px;
  background-color: rgba(255, 0, 0, 0.1);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 2px #ff3333, 0 0 20px rgba(255, 0, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 0 4px #ff3333, 0 0 30px rgba(255, 0, 0, 0.7);
  }
  100% {
    box-shadow: 0 0 0 2px #ff3333, 0 0 20px rgba(255, 0, 0, 0.5);
  }
}

.add-button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: white; /* White background */
  color: #999999; /* Gray plus sign */
  border: 2px solid #cccccc; /* Gray border */
  font-size: 20px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s, border-color 0.2s, color 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.add-button:hover {
  transform: scale(1.1);
  background-color: #4CAF50; /* Green background on hover */
  color: white; /* White plus sign on hover */
  border-color: #4CAF50; /* Green border on hover */
}

/* Modal styles - Rock themed */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.modal-content {
  background-color: #1a1a1a;
  border-radius: 4px;
  box-shadow: 0 0 30px rgba(255, 0, 0, 0.2), 0 0 10px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 500px;
  padding: 1.5rem;
  position: relative;
  border: 1px solid #333;
  color: #fff;
}

.modal-content.loading {
  opacity: 0.8;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.75rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

.close-button {
  background: none;
  border: 1px solid #444;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #fff;
  transition: all 0.2s;
}

.close-button:hover {
  background-color: #ff3333;
  border-color: #ff3333;
  transform: scale(1.1);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-body form {
  display: flex;
  gap: 0.5rem;
}

.modal-body input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 1rem;
  background-color: #2a2a2a;
  color: #fff;
}

.modal-body input:focus {
  outline: none;
  border-color: #ff3333;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
}

.modal-body button {
  background-color: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
}

.modal-body button:hover:not(:disabled) {
  background-color: #ff3333;
  border-color: #ff3333;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
}

.error-container {
  min-height: 35px; /* Increased height to fully accommodate the error message with font height */
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
}
</style>
