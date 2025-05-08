import { type Ref } from 'vue';
import { type GridColumn, generateId } from '../types/chord-board';
import {eventBus} from "@/composables/useEventBus.ts";

export function useColumnManagement(
  columns: Ref<GridColumn[]>,
  gridColumns: Ref<number>,
) {
  // Function to add a new column at the specified index
  const addColumn = (index: number) => {
    // Create a new column
    const newColumn: GridColumn = {
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

  // Function to adjust the number of columns based on available space
  const adjustColumnCount = () => {
    // Ensure we have enough columns to fill the available space
    // but don't remove columns that have chords in them
    // Use a minimum of 3 columns initially to avoid showing just one column
    const desiredColumnCount = Math.max(3, gridColumns.value);

    // Add columns if needed
    while (columns.value.length < desiredColumnCount) {
      addColumn(columns.value.length);
    }
  };

  // Function to update column indices after reordering
  const updateColumnIndices = () => {
    columns.value.forEach((column, index) => {
      column.index = index;
    });
  };

  // Function to move a column from one index to another
  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // Remove the column from its current position
    const [movedColumn] = columns.value.splice(fromIndex, 1);

    // Insert it at the new position
    columns.value.splice(toIndex, 0, movedColumn);

    // Update all column indices
    updateColumnIndices();

    eventBus.emit('command:boardPersistence:save');
  };

  return {
    addColumn,
    adjustColumnCount,
    updateColumnIndices,
    moveColumn
  };
}
