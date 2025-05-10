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
  fingeringInput,
  isLoading,
  errorMessage,
  handleChordSubmit,
  handleFingeringSubmit,
  removeChord,
  // Search suggestions
  searchSuggestions,
  selectedSuggestionIndex,
  showSuggestions,
  noResultsFound,
  handleKeyDown: handleSuggestionKeyDown,
  selectSuggestion,
  addSuggestionToBoard,
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

// Function to handle Escape key press
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showModal.value) {
    closeModal();
  }
};

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

  // Add event listener for Escape key to close modal
  window.addEventListener('keydown', handleKeyDown);
});

// Clean up when component unmounts
onUnmounted(() => {
  // Clean up auto-save interval
  if (cleanupAutoSave) {
    cleanupAutoSave();
  }

  // Remove event listener for Escape key
  window.removeEventListener('keydown', handleKeyDown);
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
  fingeringInput.value = '';
  errorMessage.value = '';
  showSuggestions.value = false;
  noResultsFound.value = false;
};

// Check if input is a fingering pattern (6 symbols from 0-9, a-z, x)
const isFingeringPattern = (input: string): boolean => {
  // Regex to match exactly 6 characters that are digits 0-9, letters a-z, or 'x'
  const fingeringRegex = /^[0-9a-zx]{6}$/;
  return fingeringRegex.test(input);
};

// Wrap chord operations to trigger saving
const handleChordSubmitAndSave = async () => {
  // Hide suggestions dropdown and clear search state
  showSuggestions.value = false;
  searchSuggestions.value = [];
  selectedSuggestionIndex.value = 0;
  noResultsFound.value = false;

  // Determine if the input is a fingering pattern
  const isFingering = isFingeringPattern(chordInput.value);

  // If it's a fingering pattern, use handleFingeringSubmit
  if (isFingering) {
    fingeringInput.value = chordInput.value;

    if (!showModal.value) {
      // If not in modal mode, use the default behavior
      await handleFingeringSubmit();
    } else {
      // If in modal mode, use the selected cell
      if (selectedCell.value) {
        await handleFingeringSubmit(selectedCell.value.columnIndex, selectedCell.value.row);
        if (!errorMessage.value) {
          // Only close the modal if there was no error
          closeModal();
        }
      }
    }
  } else {
    // Otherwise, use handleChordSubmit for chord names
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

// Wrapper function to handle selecting a suggestion and closing the modal
const handleSelectSuggestion = (index: number) => {
  if (index >= 0 && index < searchSuggestions.value.length) {
    const suggestion = searchSuggestions.value[index];

    // If in modal mode, use the selected cell position
    if (showModal.value && selectedCell.value) {
      addSuggestionToBoard(suggestion, selectedCell.value.columnIndex, selectedCell.value.row);
      // Close the modal after adding the chord
      closeModal();
    } else {
      // Otherwise use the default behavior
      selectSuggestion(index);
    }
  }
};

// Custom keyboard handler for suggestions that uses our wrapper function
const handleSuggestionNavigation = (event: KeyboardEvent) => {
  if (!showSuggestions.value) return;

  // First let the original handler handle navigation (up/down arrows)
  handleSuggestionKeyDown(event);

  // Then handle Enter key ourselves to use our wrapper function
  if (event.key === 'Enter' && searchSuggestions.value.length > 0) {
    event.preventDefault();
    handleSelectSuggestion(selectedSuggestionIndex.value);
  }
};
</script>

<template>
  <div class="chord-board">
    <!-- Modal for adding chords -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content" :class="{ 'loading': isLoading }">
        <form @submit.prevent="handleChordSubmitAndSave().then(focusInput)">
          <input
            ref="inputRef"
            v-model="chordInput"
            type="text"
            placeholder="Enter chord name (e.g., Am) or fingering pattern (e.g., x02110)"
            :disabled="isLoading"
            :class="{ 'rounded-bottom': !showSuggestions && !noResultsFound }"
            @keydown="(e) => {
              // Handle both modal escape and suggestion navigation
              handleKeyDown(e);
              if (showSuggestions) {
                handleSuggestionNavigation(e);
              }
            }"
          />
          <button type="submit" :disabled="isLoading" class="hidden-submit"></button>
        </form>

        <!-- Search suggestions dropdown -->
        <div class="suggestions-dropdown" v-if="showSuggestions && searchSuggestions.length > 0">
          <div
            v-for="(suggestion, index) in searchSuggestions"
            :key="`${suggestion.key}${suggestion.suffix}-${index}`"
            class="suggestion-item"
            :class="{ 'selected': index === selectedSuggestionIndex }"
            @click="handleSelectSuggestion(index)"
          >
            <span class="suggestion-key">{{ suggestion.key }}</span>
            <span class="suggestion-suffix">{{ suggestion.suffix }}</span>
            <span v-if="suggestion.positions && suggestion.positions.length > 0" class="suggestion-fingering">{{ suggestion.positions[0].frets }}</span>
          </div>
        </div>

        <!-- No results message -->
        <div class="no-results-message" v-if="noResultsFound">
          No results found
        </div>
      </div>
      <!-- Error message container positioned below the input -->
      <div class="error-container" v-show="errorMessage">
        <p class="error-message">{{ errorMessage }}</p>
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
              v-for="row in 50"
              :key="`empty-${columnIndex}-${row-1}`"
              class="empty-cell"
              :class="{ 'selected-cell': showModal && selectedCell && selectedCell.columnIndex === columnIndex && selectedCell.row === row-1 }"
              :style="{
                top: `${(row-1) * GRID_CELL_HEIGHT}px`,
                width: `${GRID_CELL_WIDTH}px`,
                height: `${GRID_CELL_HEIGHT}px`
              }"
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
  overflow: hidden;
}

.chord-grid {
  position: relative;
  width: 100%;
  height: 100%;
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
  height: calc(50 * 280px); /* 50 rows * GRID_CELL_HEIGHT */
  display: flex;
}

.column {
  position: absolute;
  top: 0;
  min-height: 100%;
  height: calc(50 * 280px); /* 50 rows * GRID_CELL_HEIGHT */
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
  height: calc(50 * 280px - 25px); /* 50 rows * GRID_CELL_HEIGHT - column-header height */
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
  color: white; /* Changed to white for better contrast with red background */
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  display: block;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.7); /* Changed to black shadow for better visibility */
  width: 100%;
  text-align: center;
  word-break: break-word;
}

@keyframes errorGlow {
  0% {
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
  }
  50% {
    text-shadow: 0 0 20px rgba(255, 0, 0, 1);
  }
  100% {
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
  }
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

/* Modal styles - Modern minimal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* 10% darker backdrop */
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 5px 10px rgba(0, 0, 0, 0.05);
  width: 90%;
  margin-top: 26vh;
  max-width: 600px;
  padding: 0;
  position: relative;
  overflow: visible;
  transition: all 0.2s ease;
}

.modal-content.loading {
  opacity: 0.8;
}

.modal-content form {
  display: flex;
  width: 100%;
}

.modal-content input {
  flex: 1;
  padding: 16px 20px;
  border: none;
  font-size: 16px;
  background-color: #111;
  color: white;
  width: 100%;
  transition: all 0.2s ease;
  box-shadow: none;
  opacity: 0.7;
  border-radius: 12px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.modal-content input:focus {
  outline: none;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

.modal-content input.rounded-bottom {
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.hidden-submit {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  display: none;
}

.error-container {
  min-height: 24px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  background-color: rgba(255, 51, 51, 0.8); /* Increased opacity for better contrast */
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
  z-index: 1001; /* Ensure it's above the modal backdrop */
  position: absolute; /* Position relative to the modal-backdrop */
  top: 50%; /* Align with the center of the screen */
  left: 50%;
  transform: translate(-50%, 12px); /* Center horizontally and position below the modal */
  margin-top: 20px; /* Additional space between modal and error container */
}

/* Suggestions dropdown styles */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: #111;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: 1002;
  max-height: 250px;
  overflow-y: hidden;
  margin-top: -1px; /* Connect seamlessly with input */
}

.suggestion-item {
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  color: white;
  opacity: 0.8;
}

.suggestion-item:hover, .suggestion-item.selected {
  background-color: #333;
  opacity: 1;
}

.suggestion-key {
  font-weight: bold;
  margin-right: 4px;
}

.suggestion-suffix {
  opacity: 0.8;
}

.suggestion-fingering {
  opacity: 0.7;
  margin-left: auto;
  font-family: monospace;
  font-size: 14px;
  color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

/* No results message */
.no-results-message {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  padding: 12px 20px;
  color: white;
  opacity: 0.8;
  text-align: center;
  background-color: #111;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  font-style: italic;
  z-index: 1002;
  margin-top: -1px; /* Connect seamlessly with input */
}
</style>
