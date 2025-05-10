import { ref, type Ref, onMounted, watch } from 'vue';
import { fetchChordData, fetchChordByFingering, fetchSearchSuggestions, type Chord as ChordType } from '../services/chordserverapi';
import { type ChordInGrid, type GridColumn, generateChordId } from '../types/chord-board';
import {eventBus, useEvent} from "@/composables/useEventBus.ts";

export function useChordManagement(
  columns: Ref<GridColumn[]>,
  findEmptyGridPosition: (columnIndex?: number) => { row: number; col: number },
  gridToPixelPosition: (row: number, col: number) => { x: number; y: number },
) {
  const chordInput = ref('');
  const fingeringInput = ref('');
  const isLoading = ref(false);
  const errorMessage = ref('');
  const currentChord = ref<ChordType | null>(null);

  // Search suggestions
  const searchSuggestions = ref<ChordType[]>([]);
  const selectedSuggestionIndex = ref(0);
  const showSuggestions = ref(false);
  const noResultsFound = ref(false);
  let debounceTimeout: number | null = null;

  // Handle chord submission
  const handleChordSubmit = async (specificColumnIndex?: number, specificRow?: number) => {
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

      let columnIndex: number;
      let gridPosition: { row: number; col: number };

      if (specificColumnIndex !== undefined && specificRow !== undefined) {
        // Use the specific cell if provided
        columnIndex = specificColumnIndex;
        gridPosition = { row: specificRow, col: specificColumnIndex };
      } else {
        // Find the column with the fewest chords, preferring visible columns
        columnIndex = 0;
        let minChords = Infinity;

        // If gridColumns is provided, prefer visible columns
        const visibleColumns = gridColumns?.value || columns.value.length;

        // First try to find a column within the visible range
        for (let i = 0; i < Math.min(visibleColumns, columns.value.length); i++) {
          const chordCount = columns.value[i].chords.length;
          if (chordCount < minChords) {
            minChords = chordCount;
            columnIndex = i;
          }
        }

        // If all visible columns have chords, fall back to any column
        if (minChords === Infinity) {
          for (let i = 0; i < columns.value.length; i++) {
            const chordCount = columns.value[i].chords.length;
            if (chordCount < minChords) {
              minChords = chordCount;
              columnIndex = i;
            }
          }
        }

        // Find an empty grid position for the new chord in the selected column
        gridPosition = findEmptyGridPosition(columnIndex);
      }

      // Convert grid position to pixel coordinates
      const pixelPosition = gridToPixelPosition(gridPosition.row, gridPosition.col);

      // Automatically add the chord to the pinboard
      const newChord: ChordInGrid = {
        id: generateChordId(),
        chord: fetchedChord.value,
        position: pixelPosition,
        gridPosition: gridPosition
      };

      // Add the chord to the appropriate column
      columns.value[columnIndex].chords.push(newChord);

      // Clear the input field for the next chord
      chordInput.value = '';
    }

    isLoading.value = false;
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

    eventBus.emit('command:boardPersistence:save');
  };

  // Handle chord movement event
  const handleChordMove = (data: {
    fromPosition: { colIndex: number, rowIndex: number };
    toPosition: { colIndex: number, rowIndex: number };
  }) => {
    // Find source chord at fromPosition
    let sourceChord = null;
    let sourceChordIndex = -1;
    let sourceColumnIndex = data.fromPosition.colIndex;

    // Find the chord at the source position
    for (let i = 0; i < columns.value[sourceColumnIndex].chords.length; i++) {
      const chord = columns.value[sourceColumnIndex].chords[i];
      if (chord.gridPosition.col === data.fromPosition.colIndex &&
          chord.gridPosition.row === data.fromPosition.rowIndex) {
        sourceChord = chord;
        sourceChordIndex = i;
        break;
      }
    }

    if (!sourceChord) return;

    // Find target chord at toPosition (if any)
    let targetChord = null;
    let targetChordIndex = -1;
    let targetColumnIndex = data.toPosition.colIndex;

    // Find the chord at the target position (if any)
    for (let i = 0; i < columns.value[targetColumnIndex].chords.length; i++) {
      const chord = columns.value[targetColumnIndex].chords[i];
      if (chord.gridPosition.col === data.toPosition.colIndex &&
          chord.gridPosition.row === data.toPosition.rowIndex) {
        targetChord = chord;
        targetChordIndex = i;
        break;
      }
    }

    if (targetChord) {
      // Handle swap operation
      // Store the original positions
      const sourceGridPosition = { ...sourceChord.gridPosition };
      const targetGridPosition = { ...targetChord.gridPosition };

      // Remove both chords from their columns
      columns.value[sourceColumnIndex].chords.splice(sourceChordIndex, 1);

      // If both chords are in the same column and the target chord is after the source chord,
      // we need to adjust the index because removing the source chord shifts the array
      const adjustedTargetIndex = sourceColumnIndex === targetColumnIndex && targetChordIndex > sourceChordIndex
        ? targetChordIndex - 1
        : targetChordIndex;

      columns.value[targetColumnIndex].chords.splice(adjustedTargetIndex, 1);

      // Update positions
      sourceChord.gridPosition = targetGridPosition;
      sourceChord.position = gridToPixelPosition(targetGridPosition.row, targetGridPosition.col);

      targetChord.gridPosition = sourceGridPosition;
      targetChord.position = gridToPixelPosition(sourceGridPosition.row, sourceGridPosition.col);

      // Add chords back to their new positions
      columns.value[targetColumnIndex].chords.push(sourceChord);
      columns.value[sourceColumnIndex].chords.push(targetChord);
    } else {
      // Handle move operation
      // Remove from source column
      columns.value[sourceColumnIndex].chords.splice(sourceChordIndex, 1);

      // Update the chord's position
      const newGridPosition = { row: data.toPosition.rowIndex, col: data.toPosition.colIndex };
      sourceChord.gridPosition = newGridPosition;
      sourceChord.position = gridToPixelPosition(newGridPosition.row, newGridPosition.col);

      // Add to target column
      columns.value[targetColumnIndex].chords.push(sourceChord);
    }

    eventBus.emit('command:boardPersistence:save');
  };

  // Fetch search suggestions with debounce
  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      searchSuggestions.value = [];
      showSuggestions.value = false;
      noResultsFound.value = false;
      return;
    }

    // Clear previous timeout
    if (debounceTimeout !== null) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout (300ms debounce)
    debounceTimeout = setTimeout(async () => {
      const result = await fetchSearchSuggestions(query);

      if (result.isOk()) {
        // Limit to top 5 suggestions
        searchSuggestions.value = result.value.slice(0, 5);
        selectedSuggestionIndex.value = 0; // Always select the first suggestion
        showSuggestions.value = searchSuggestions.value.length > 0;
        noResultsFound.value = query.trim().length > 0 && searchSuggestions.value.length === 0;
      } else {
        searchSuggestions.value = [];
        showSuggestions.value = false;
        noResultsFound.value = false;
      }
    }, 300) as unknown as number;
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!showSuggestions.value) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % searchSuggestions.value.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedSuggestionIndex.value = (selectedSuggestionIndex.value - 1 + searchSuggestions.value.length) % searchSuggestions.value.length;
        break;
      case 'Enter':
        event.preventDefault();
        if (searchSuggestions.value.length > 0) {
          selectSuggestion(selectedSuggestionIndex.value);
          // No need to trigger form submission as the chord is added directly to the board
        }
        break;
      case 'Escape':
        event.preventDefault();
        showSuggestions.value = false;
        break;
    }
  };

  // Add a suggestion directly to the board
  const addSuggestionToBoard = (suggestion: ChordType, specificColumnIndex?: number, specificRow?: number) => {
    let columnIndex: number;
    let gridPosition: { row: number; col: number };

    if (specificColumnIndex !== undefined && specificRow !== undefined) {
      // Use the specific cell if provided
      columnIndex = specificColumnIndex;
      gridPosition = { row: specificRow, col: specificColumnIndex };
    } else {
      // Find an empty grid position for the new chord
      gridPosition = findEmptyGridPosition();
      columnIndex = gridPosition.col;
    }

    // Convert grid position to pixel coordinates
    const pixelPosition = gridToPixelPosition(gridPosition.row, gridPosition.col);

    // Add the chord to the pinboard
    const newChord: ChordInGrid = {
      id: generateChordId(),
      chord: suggestion,
      position: pixelPosition,
      gridPosition: gridPosition
    };

    // Add the chord to the appropriate column
    columns.value[columnIndex].chords.push(newChord);

    // Clear search state
    showSuggestions.value = false;
    noResultsFound.value = false;
    chordInput.value = '';

    // Emit save event
    eventBus.emit('command:boardPersistence:save');
  };

  // Select a suggestion by index
  const selectSuggestion = (index: number) => {
    if (index >= 0 && index < searchSuggestions.value.length) {
      const suggestion = searchSuggestions.value[index];
      // Instead of populating the text input, add the chord directly to the board
      addSuggestionToBoard(suggestion);
    }
  };

  // Watch for changes in the chord input to fetch suggestions
  watch(chordInput, (newValue) => {
    fetchSuggestions(newValue);
  });

  onMounted(() => {
    useEvent('command:chordManagement:move', handleChordMove);
  });

  // Handle fingering submission
  const handleFingeringSubmit = async (specificColumnIndex?: number, specificRow?: number) => {
    if (!fingeringInput.value.trim()) {
      errorMessage.value = 'Please enter a fingering pattern';
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';

    const fetchedChord = await fetchChordByFingering(fingeringInput.value);

    if (fetchedChord.isErr()) {
      errorMessage.value = fetchedChord.error;
      currentChord.value = null;
    } else {
      currentChord.value = fetchedChord.value;

      let columnIndex: number;
      let gridPosition: { row: number; col: number };

      if (specificColumnIndex !== undefined && specificRow !== undefined) {
        // Use the specific cell if provided
        columnIndex = specificColumnIndex;
        gridPosition = { row: specificRow, col: specificColumnIndex };
      } else {
        // Find an empty grid position for the new chord
        gridPosition = findEmptyGridPosition();
        columnIndex = gridPosition.col;
      }

      // Convert grid position to pixel coordinates
      const pixelPosition = gridToPixelPosition(gridPosition.row, gridPosition.col);

      // Automatically add the chord to the pinboard
      const newChord: ChordInGrid = {
        id: generateChordId(),
        chord: fetchedChord.value,
        position: pixelPosition,
        gridPosition: gridPosition
      };

      // Add the chord to the appropriate column
      columns.value[columnIndex].chords.push(newChord);

      // Clear the input field for the next chord
      fingeringInput.value = '';
    }

    isLoading.value = false;
  };

  return {
    chordInput,
    fingeringInput,
    isLoading,
    errorMessage,
    currentChord,
    handleChordSubmit,
    handleFingeringSubmit,
    removeChord,
    // Search suggestions
    searchSuggestions,
    selectedSuggestionIndex,
    showSuggestions,
    noResultsFound,
    handleKeyDown,
    selectSuggestion,
    addSuggestionToBoard,
  };
}

declare module './useEventBus' {
  interface EventsMap {
    'command:chordManagement:move': {
      fromPosition: { colIndex: number, rowIndex: number };
      toPosition: { colIndex: number, rowIndex: number };
    },
  }
}
