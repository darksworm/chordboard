<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChordBox } from 'vexchords';

// Define the available chords
const chords = {
  Amin: {
    name: 'A Minor',
    positions: [
      { fret: 1, string: 2 },
      { fret: 2, string: 4 },
      { fret: 2, string: 3 }
    ],
    barres: []
  },
  Cmaj: {
    name: 'C Major',
    positions: [
      { fret: 1, string: 2 },
      { fret: 2, string: 4 },
      { fret: 3, string: 5 }
    ],
    barres: []
  },
  Fmaj: {
    name: 'F Major',
    positions: [
      { fret: 1, string: 1 },
      { fret: 1, string: 2 },
      { fret: 2, string: 3 },
      { fret: 3, string: 4 },
      { fret: 3, string: 5 },
      { fret: 1, string: 6 }
    ],
    barres: [{ fromString: 6, toString: 1, fret: 1 }]
  }
};

// Current chord state
const currentChord = ref('Amin');

// Reference to the chord container
const chordContainer = ref<HTMLElement | null>(null);

// Function to render the chord
const renderChord = () => {
  if (!chordContainer.value) return;

  // Clear previous chord
  chordContainer.value.innerHTML = '';

  // Create new chord
  const chord = new ChordBox(chordContainer.value, {
    width: 200,
    height: 240,
    showTuning: true
  });

  // Get the chord data
  const chordData = chords[currentChord.value as keyof typeof chords];

  // Draw the chord
  chord.draw({
    positions: chordData.positions,
    barres: chordData.barres,
    title: chordData.name
  });
};

// Change the current chord
const changeChord = (chord: string) => {
  currentChord.value = chord;
  renderChord();
};

// Initialize the chord display when the component is mounted
onMounted(() => {
  renderChord();
});
</script>

<template>
  <div class="chord-display">
    <h2>Chord Display</h2>

    <div class="buttons">
      <button
        v-for="(chord, key) in chords"
        :key="key"
        @click="changeChord(key)"
        :class="{ active: currentChord === key }"
      >
        {{ chord.name }}
      </button>
    </div>

    <div ref="chordContainer" class="chord-container"></div>
  </div>
</template>

<style scoped>
.chord-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
}

.buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background-color: #e0e0e0;
}

button.active {
  background-color: #4CAF50;
  color: white;
}

.chord-container {
  width: 200px;
  height: 240px;
}
</style>
