<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { fetchChordData, type Chord as ChordType } from '../services/chordserverapi';
import Chord from './Chord.vue';
import {
  draggable,
  dropTargetForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

interface ChordItem {
  id: string;
  chord: ChordType;
  position: { x: number; y: number };
}

const chordInput = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const gridRef = ref<HTMLElement | null>(null);

const currentChord = ref<ChordType | null>(null);
const chords = ref<ChordItem[]>([]);
const cleanupFunctions = ref<(() => void)[]>([]);

// Generate a unique ID for each chord
const generateId = () => `chord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

    // Automatically add the chord to the pinboard
    // Add the chord to the grid with a random position
    const newChord: ChordItem = {
      id: generateId(),
      chord: fetchedChord.value,
      position: {
        x: Math.random() * (window.innerWidth - 250),
        y: Math.random() * (window.innerHeight - 300)
      }
    };

    chords.value.push(newChord);

    // Clear the input field for the next chord
    chordInput.value = '';
  }

  isLoading.value = false;
};


// Remove a chord from the grid
const removeChord = (id: string) => {
  const index = chords.value.findIndex(chord => chord.id === id);
  if (index !== -1) {
    chords.value.splice(index, 1);
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

// Set up drag and drop functionality
onMounted(() => {
  if (!gridRef.value) return;

  // Make the grid a drop target
  const cleanup = dropTargetForElements({
    element: gridRef.value,
    onDrop: ({ source, location }) => {
      const chordId = source.element.getAttribute('data-chord-id');
      if (!chordId) return;

      const chordIndex = chords.value.findIndex(c => c.id === chordId);
      if (chordIndex === -1) return;

      // Update the chord's position
      chords.value[chordIndex].position = {
        x: location.clientX - 100, // Center the chord
        y: location.clientY - 120  // Center the chord
      };
    }
  });

  // Store the cleanup function
  cleanupFunctions.value.push(cleanup);
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
          v-model="chordInput"
          type="text"
          placeholder="Enter chord name (e.g., Am, F#maj, G7)"
          :disabled="isLoading"
        />
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Loading...' : 'Search Chord' }}
        </button>
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>


    <h2 class="grid-title">Chord Pinboard - Search to add chords</h2>
    <div ref="gridRef" class="chord-grid">
      <div
        v-for="chord in chords"
        :key="chord.id"
        :data-chord-id="chord.id"
        class="chord-item"
        :style="{
          left: `${chord.position.x}px`,
          top: `${chord.position.y}px`
        }"
        :ref="el => el && setupDraggable(el, chord.id)"
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

.grid-title {
  font-size: 1.5rem;
  color: #333;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  text-align: center;
  width: 100%;
}

.chord-grid {
  position: relative;
  width: 100%;
  height: calc(100vh - 150px);
  border: 1px dashed #ccc;
  border-radius: 8px;
  margin-top: 0.5rem;
  overflow: hidden;
  background-color: #f9f9f9;
}

.chord-item {
  position: absolute;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: move;
  transition: box-shadow 0.2s;
  z-index: 1;
}

.chord-item:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  z-index: 2;
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
