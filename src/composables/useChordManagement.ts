import { ref, type Ref } from 'vue';
import { fetchChordData, type Chord as ChordType } from '../services/chordserverapi';
import { type ChordInGrid, type GridColumn, generateChordId } from '../types/chord-board';
import {eventBus} from "@/composables/useEventBus.ts";

export function useChordManagement(
  columns: Ref<GridColumn[]>,
  findEmptyGridPosition: (columnIndex?: number) => { row: number; col: number },
  gridToPixelPosition: (row: number, col: number) => { x: number; y: number },
) {
  const chordInput = ref('');
  const isLoading = ref(false);
  const errorMessage = ref('');
  const currentChord = ref<ChordType | null>(null);

  // Handle chord submission
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

      // Find the column with the fewest chords
      let columnIndex = 0;
      let minChords = Infinity;

      for (let i = 0; i < columns.value.length; i++) {
        const chordCount = columns.value[i].chords.length;
        if (chordCount < minChords) {
          minChords = chordCount;
          columnIndex = i;
        }
      }

      // Find an empty grid position for the new chord in the selected column
      const gridPosition = findEmptyGridPosition(columnIndex);

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

  // Move a chord from one column to another
  const moveChord = (
    chordId: string,
    sourceColumnIndex: number,
    sourceChordIndex: number,
    targetColumnIndex: number,
    targetGridPosition: { row: number; col: number }
  ) => {
    // Get the chord from the source column
    const chord = columns.value[sourceColumnIndex].chords[sourceChordIndex];

    if (!chord) return;

    // Remove from source column
    columns.value[sourceColumnIndex].chords.splice(sourceChordIndex, 1);

    // Update the chord's position
    chord.gridPosition = targetGridPosition;
    chord.position = gridToPixelPosition(targetGridPosition.row, targetGridPosition.col);

    // Add to target column
    columns.value[targetColumnIndex].chords.push(chord);

    eventBus.emit('command:boardPersistence:save');
  };

  // Swap positions of two chords
  const swapChords = (
    sourceChordId: string,
    sourceColumnIndex: number,
    sourceChordIndex: number,
    targetChordId: string,
    targetColumnIndex: number,
    targetChordIndex: number
  ) => {
    // Get both chords
    const sourceChord = columns.value[sourceColumnIndex].chords[sourceChordIndex];
    const targetChord = columns.value[targetColumnIndex].chords[targetChordIndex];

    if (!sourceChord || !targetChord) return;

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

    eventBus.emit('command:boardPersistence:save');
  };

  return {
    chordInput,
    isLoading,
    errorMessage,
    currentChord,
    handleChordSubmit,
    removeChord,
    moveChord,
    swapChords
  };
}
