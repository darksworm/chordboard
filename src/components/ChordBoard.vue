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
import { healthcheck } from '../services/chordserverapi';
import { useBoardPanning } from "@/composables/useBoardPanning.ts";

// Setup refs
const inputRef = ref<HTMLInputElement | null>(null);
const gridRef = ref<HTMLElement | null>(null);
const columns = ref<GridColumn[]>([]);

// Healthcheck state
const isHealthcheckLoading = ref(false);

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
} = useChordManagement(columns, findEmptyGridPosition, gridToPixelPosition);

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

const { setupPanning, cleanupPanning } = useBoardPanning(gridRef);

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

  // Perform healthcheck to wake up the server
  isHealthcheckLoading.value = true;
  healthcheck()
    .then(() => {
      // Healthcheck complete, regardless of success or failure
      isHealthcheckLoading.value = false;
    })
    .catch(() => {
      // Ensure loading state is reset even if there's an unhandled error
      isHealthcheckLoading.value = false;
    });

  setupPanning();
});

// Clean up when component unmounts
onUnmounted(() => {
  // Clean up auto-save interval
  if (cleanupAutoSave) {
    cleanupAutoSave();
  }

  cleanupPanning();

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

  // Then handle Enter key ourselves to use our wrapper function
  if (event.key === 'Enter' && searchSuggestions.value.length > 0) {
    event.preventDefault();
    handleSelectSuggestion(selectedSuggestionIndex.value);
    return;
  }

  // First let the original handler handle navigation (up/down arrows)
  handleSuggestionKeyDown(event);
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
              <Chord
                :chord="chord.chord"
                :selectedFingering="chord.selectedFingering"
                @positionChanged="(v) => { chord.selectedFingering = v; saveState(); }"
              />
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
    <!-- Healthcheck loading indicator -->
    <div v-if="isHealthcheckLoading" class="healthcheck-loading">
      <div class="loading-spinner"></div>
      <span>Waking up server...</span>
    </div>
  </div>
</template>

<!-- all styles live in the css file below-->
<style>
@import '../assets/ChordBoard.css';
</style>
