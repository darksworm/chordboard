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
      { fret: 2, string: 3 },
      { fret: 3, string: 4 },
      { fret: 3, string: 5 },
    ],
    barres: [{ fromString: 6, toString: 1, fret: 1 }]
  }
};

// Input for custom chord
const chordInput = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const chordTitle = ref('A Minor');

// Function to fetch chord data from the API
const fetchChordData = async (chordName: string) => {
  if (!chordName.trim()) {
    errorMessage.value = 'Please enter a chord name';
    return null;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch(`http://localhost:8080/chords/${encodeURIComponent(chordName)}`);

    if (!response.ok) {
      if (response.status === 404) {
        errorMessage.value = `Chord "${chordName}" not found`;
      } else {
        errorMessage.value = `Error: ${response.statusText}`;
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    errorMessage.value = `Error fetching chord data: ${error instanceof Error ? error.message : String(error)}`;
    return null;
  } finally {
    isLoading.value = false;
  }
};

// Current chord state
const currentChord = ref('Amin');

// Reference to the chord container
const chordContainer = ref<HTMLElement | null>(null);

// Function to render the chord
const renderChord = (apiChordData?: any) => {
  if (!chordContainer.value) return;

  // Clear previous chord
  chordContainer.value.innerHTML = '';

  // Create new chord
  const chord = new ChordBox(chordContainer.value, {
    width: 200,
    height: 240,
    showTuning: true
  });

  if (apiChordData) {
    // Handle API response format
    const firstPosition = apiChordData.positions[0];

    // Update chord title
    chordTitle.value = `${apiChordData.key}${apiChordData.suffix || ''}`;

    // Convert frets string to positions array
    // Format: "x022x0" where x is muted string and numbers are fret positions
    const frets = firstPosition.frets.split('');

    // Get fingers if available
    // Format: "001200" where 0 means no finger and 1-4 represent index, middle, ring, pinky
    const fingers = firstPosition.fingers ? firstPosition.fingers.split('') : null;

    const chordPositions = frets.map((fret, index) => {
      // In vexchords, strings are 1-6 where 1 is high E and 6 is low E
      // In the API response, the first character is the low E string
      const string = 6 - index;

      // If fret is 'x', it's a muted string
      if (fret === 'x') {
        return [string, 'x'];
      }

      const fretNum = parseInt(fret, 10);

      // If fretNum is 0, it's an open string
      if (fretNum === 0) {
        return [string, 0];
      }

      // If we have finger information, include it as the third element
      if (fingers && fingers[index] !== '0') {
        return [string, fretNum, fingers[index]];
      }

      return [string, fretNum];
    }).filter(pos => pos[1] !== 0); // Filter out open strings

    // Parse barres if present
    const barres: { fromString: number; toString: number; fret: number }[] = [];
    if (firstPosition.barres) {
      const barresFrets = firstPosition.barres.split(',').map(Number);
      barresFrets.forEach(fret => {
        // Find the range of strings that have this fret
        let fromString = 6;
        let toString = 1;
        frets.forEach((f, i) => {
          if (parseInt(f, 10) === fret) {
            fromString = Math.min(fromString, 6 - i);
            toString = Math.max(toString, 6 - i);
          }
        });
        barres.push({ fromString, toString, fret });
      });
    }

    // Draw the chord
    chord.draw({
      chord: chordPositions,
      barres,
      position: 0,
      positionText: 0
    });

    // Clear the input field after successful rendering
    chordInput.value = '';
  } else {
    // Get the chord data from predefined chords
    const chordData = chords[currentChord.value as keyof typeof chords];

    // Update chord title
    chordTitle.value = chordData.name;

    // Convert positions to the format expected by vexchords
    const chordPositions = chordData.positions.map((pos) => [pos.string, pos.fret]);

    // Draw the chord
    chord.draw({
      chord: chordPositions,
      barres: chordData.barres,
      position: 0,
      positionText: 0
    });
  }
};

// Change the current chord
const changeChord = (chord: string) => {
  currentChord.value = chord;
  renderChord();
};

// Handle custom chord submission
const handleChordSubmit = async () => {
  if (!chordInput.value.trim()) {
    errorMessage.value = 'Please enter a chord name';
    return;
  }

  const chordData = await fetchChordData(chordInput.value);

  if (chordData) {
    renderChord(chordData);
  }
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

    <div class="chord-search">
      <form @submit.prevent="handleChordSubmit">
        <input
          v-model="chordInput"
          type="text"
          placeholder="Enter chord name (e.g., Am, F#maj, G7)"
          :disabled="isLoading"
        />
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Loading...' : 'Show Chord' }}
        </button>
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>

    <h3 class="chord-title">{{ chordTitle }}</h3>

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
  margin-bottom: 1.5rem;
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

button.active {
  background-color: #4CAF50;
  color: white;
}

.chord-search {
  width: 100%;
  max-width: 500px;
  margin-bottom: 1.5rem;
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

.chord-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.chord-container {
  width: 200px;
  height: 240px;
}
</style>
