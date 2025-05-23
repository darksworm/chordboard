import { ref, type Ref, onUnmounted } from 'vue';
import {
  draggable,
  dropTargetForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type GridColumn } from '../types/chord-board';
import { eventBus } from './useEventBus';

// Symbol used to mark elements that already have drag-and-drop functionality
const DND_INITIALIZED = Symbol('dnd-initialized');

export function useDragAndDrop(
  columns: Ref<GridColumn[]>,
  gridRef: Ref<HTMLElement | null>,
  isPositionOccupied: (row: number, col: number, excludeChordId?: string) => boolean,
  gridToPixelPosition: (row: number, col: number) => { x: number; y: number },
  moveColumn: (fromIndex: number, toIndex: number) => void
) {
  const cleanupFunctions = ref<(() => void)[]>([]);

  // Function to set up draggable for a chord element
  const setupDraggable = (element: HTMLElement, chordId: string) => {
    if (!element) return;

    // Check if element already has drag-and-drop functionality
    if ((element as any)[DND_INITIALIZED]?.draggable) return;

    // Make the element draggable
    const cleanup = draggable({
      element,
      dragHandle: element
    });

    // Mark element as initialized
    (element as any)[DND_INITIALIZED] = {
      ...(element as any)[DND_INITIALIZED],
      draggable: true
    };

    // Store the cleanup function
    cleanupFunctions.value.push(cleanup);
  };

  // Function to set up draggable for a column
  const setupColumnDraggable = (element: HTMLElement, columnId: string, columnIndex: number) => {
    if (!element) return;

    // Check if element already has column draggable functionality
    if ((element as any)[DND_INITIALIZED]?.columnDraggable) return;

    // Find the drag handle element
    const dragHandleSelector = `[data-column-drag-handle="${columnId}"]`;
    const dragHandle = element.querySelector(dragHandleSelector);

    if (!dragHandle) return;

    // Make the column draggable by its handle
    const cleanup = draggable({
      element,
      dragHandle: dragHandle as HTMLElement
    });

    // Mark element as initialized
    (element as any)[DND_INITIALIZED] = {
      ...(element as any)[DND_INITIALIZED],
      columnDraggable: true
    };

    // Store the cleanup function
    cleanupFunctions.value.push(cleanup);
  };

  // Function to set up a column content area as a drop target for chords
  const setupColumnDropTarget = (element: HTMLElement, columnId: string, columnIndex: number) => {
    if (!element) return;

    // Check if element already has column drop target functionality
    if ((element as any)[DND_INITIALIZED]?.columnDropTarget) return;

    // Make the column content area a drop target for chords
    const cleanup = dropTargetForElements({
      element,
      onDrop: ({ source, location }) => {
        const chordId = source.element.getAttribute('data-chord-id');
        if (!chordId) return;

        // Find the chord in all columns
        let foundChord = null;
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

        // Calculate the drop position relative to the column
        const columnRect = element.getBoundingClientRect();
        const relativeY = location.current.input.clientY - columnRect.top;

        // Calculate the row based on the Y coordinate
        const row = Math.floor(relativeY / 280); // Using GRID_CELL_HEIGHT

        // Create the grid position
        const gridPosition = { row, col: columnIndex };

        // Check if the position is already occupied (excluding the chord being moved)
        if (isPositionOccupied(row, columnIndex, chordId)) {
          // Check if there's a chord at this position that we can swap with
          let targetChord = null;
          let targetChordIndex = -1;

          // Find the chord at this position
          for (let i = 0; i < columns.value[columnIndex].chords.length; i++) {
            const chord = columns.value[columnIndex].chords[i];
            if (chord.gridPosition.row === row && chord.gridPosition.col === columnIndex && chord.id !== chordId) {
              targetChord = chord;
              targetChordIndex = i;
              break;
            }
          }

          // If we found a chord to swap with
          if (targetChord && targetChordIndex !== -1) {
            // Emit event to swap the chords
            eventBus.emit('command:chordManagement:move', {
              fromPosition: {
                colIndex: foundChord.gridPosition.col,
                rowIndex: foundChord.gridPosition.row
              },
              toPosition: {
                colIndex: targetChord.gridPosition.col,
                rowIndex: targetChord.gridPosition.row
              }
            });
            return;
          }

          // If no chord to swap with, find the nearest free position
          let freeRow = row;

          // Try positions above and below until we find a free one
          for (let offset = 1; offset < 100; offset++) { // Using a large number instead of gridRows
            // Try below first
            if (!isPositionOccupied(freeRow + offset, columnIndex, chordId)) {
              freeRow = freeRow + offset;
              break;
            }

            // Then try above
            if (freeRow - offset >= 0 && !isPositionOccupied(freeRow - offset, columnIndex, chordId)) {
              freeRow = freeRow - offset;
              break;
            }
          }

          // Update the grid position with the free row
          gridPosition.row = freeRow;
        }

        // Emit event to move the chord to the new position
        eventBus.emit('command:chordManagement:move', {
          fromPosition: {
            colIndex: foundChord.gridPosition.col,
            rowIndex: foundChord.gridPosition.row
          },
          toPosition: {
            colIndex: gridPosition.col,
            rowIndex: gridPosition.row
          }
        });
      }
    });

    // Mark element as initialized
    (element as any)[DND_INITIALIZED] = {
      ...(element as any)[DND_INITIALIZED],
      columnDropTarget: true
    };

    // Store the cleanup function
    cleanupFunctions.value.push(cleanup);
  };

  // Function to set up the grid as a drop target for columns
  const setupGridDropTarget = () => {
    if (!gridRef.value) return;

    // Check if grid already has drop target functionality
    if ((gridRef.value as any)[DND_INITIALIZED]?.gridDropTarget) return;

    // Make the grid a drop target for columns
    const cleanup = dropTargetForElements({
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
        const targetColumnIndex = Math.floor(relativeX / 220); // Using GRID_CELL_WIDTH

        // Don't do anything if the column is dropped at its original position
        if (targetColumnIndex === columnIndex) return;

        // Move the column to the new position
        moveColumn(columnIndex, targetColumnIndex);
      }
    });

    // Mark grid element as initialized
    (gridRef.value as any)[DND_INITIALIZED] = {
      ...(gridRef.value as any)[DND_INITIALIZED],
      gridDropTarget: true
    };

    // Store the cleanup function
    cleanupFunctions.value.push(cleanup);
  };

  // Clean up all event listeners
  const cleanupDragAndDrop = () => {
    cleanupFunctions.value.forEach(cleanup => cleanup());
    cleanupFunctions.value = [];
  };

  // Automatically clean up when component is unmounted
  onUnmounted(cleanupDragAndDrop);

  return {
    setupDraggable,
    setupColumnDraggable,
    setupColumnDropTarget,
    setupGridDropTarget,
    cleanupDragAndDrop
  };
}
