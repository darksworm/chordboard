import { ref, type Ref } from 'vue';
import { type GridColumn } from '../types/chord-board';
import { useEvent } from "@/composables/useEventBus.ts";

const STORAGE_KEY = 'chord-board-state';

export function useBoardPersistence(columns: Ref<GridColumn[]>) {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Save the current board state to localStorage
   */
  const saveState = () => {
    try {
      const state = JSON.stringify(columns.value);
      localStorage.setItem(STORAGE_KEY, state);
      error.value = null;
    } catch (e) {
      console.error('Failed to save board state:', e);
      error.value = e instanceof Error ? e.message : 'Unknown error saving board state';
    }
  };

  /**
   * Load the saved board state from localStorage
   * @returns boolean indicating if state was successfully loaded
   */
  const loadState = (): boolean => {
    isLoading.value = true;
    error.value = null;

    try {
      const savedState = localStorage.getItem(STORAGE_KEY);

      if (savedState) {
        const parsedState = JSON.parse(savedState) as GridColumn[];
        columns.value = parsedState;
        isLoading.value = false;
        return true;
      }
    } catch (e) {
      console.error('Failed to load board state:', e);
      error.value = e instanceof Error ? e.message : 'Unknown error loading board state';
    }

    isLoading.value = false;
    return false;
  };

  /**
   * Clear the saved board state from localStorage
   */
  const clearState = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      error.value = null;
    } catch (e) {
      console.error('Failed to clear board state:', e);
      error.value = e instanceof Error ? e.message : 'Unknown error clearing board state';
    }
  };

  /**
   * Setup automatic saving at regular intervals
   * @param intervalMs Interval in milliseconds between saves
   * @returns Cleanup function to clear the interval
   */
  const setupAutoSave = (intervalMs = 5000) => {
    const intervalId = setInterval(saveState, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  };

  useEvent('command:boardPersistence:save', () => {
    saveState();
  })

  return {
    saveState,
    loadState,
    clearState,
    setupAutoSave,
    isLoading,
    error
  };
}

declare module './useEventBus' {
  interface EventsMap {
    'command:boardPersistence:save': void,
  }
}
