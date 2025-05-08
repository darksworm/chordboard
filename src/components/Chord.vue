<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ChordBox } from 'vexchords';

// Define props for the component
const props = defineProps<{
  // API chord data (if provided)
  chord?: any;
  // Or use predefined chord data
  chordKey?: string;
  chordName?: string;
  positions?: Array<{ fret: number; string: number }>;
  barres?: Array<{ fromString: number; toString: number; fret: number }>;
}>();

// Reference to the chord container
const chordContainer = ref<HTMLElement | null>(null);
const chordTitle = ref(props.chordName || '');

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

  if (props.chord) {
    // Handle API response format
    const firstPosition = props.chord.positions[0];

    // Update chord title
    chordTitle.value = `${props.chord.key}${props.chord.suffix || ''}`;

    // Convert frets string to positions array
    // Format: "x022x0" where x is muted string and numbers are fret positions
    const frets = firstPosition.frets.split('');

    // Get fingers if available
    // Format: "001200" where 0 means no finger and 1-4 represent index, middle, ring, pinky
    const fingers = firstPosition.fingers ? firstPosition.fingers.split('') : null;

    // Parse barres if present - do this first to identify barred positions
    const barres: { fromString: number; toString: number; fret: number }[] = [];
    // Track which strings and frets are part of barres
    const barredPositions = new Set<string>();

    if (firstPosition.barres) {
      const barresFrets = firstPosition.barres.split(',').map(Number);
      barresFrets.forEach(fret => {
        // Find the range of strings that have this fret
        let fromString = 1;
        let toString = 6;
        frets.forEach((f, i) => {
          if (parseInt(f, 10) === fret) {
            const string = 6 - i;
            fromString = Math.max(fromString, string);
            toString = Math.min(toString, string);
            // Mark this position as part of a barre
            barredPositions.add(`${string}-${fret}`);
          }
        });
        barres.push({ fromString, toString, fret: fret });
      });
    }

    // Now map frets to positions, excluding those that are part of barres
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
    }).filter(pos => {
      // Filter out open strings
      if (pos[1] === 0) return false;

      // Filter out positions that are part of a barre
      if (typeof pos[1] === 'number' && barredPositions.has(`${pos[0]}-${pos[1]}`)) {
        return false;
      }

      return true;
    });

    // Draw the chord
    chord.draw({
      chord: chordPositions,
      barres,
      position: 0,
      positionText: 0
    });
  } else if (props.positions && props.chordKey) {
    // Update chord title if provided
    if (props.chordName) {
      chordTitle.value = props.chordName;
    }

    // Convert positions to the format expected by vexchords
    const chordPositions = props.positions.map((pos) => [pos.string, pos.fret]);

    // Draw the chord
    chord.draw({
      chord: chordPositions,
      barres: props.barres || [],
      position: 0,
      positionText: 0
    });
  }
};

// Watch for changes in props to re-render the chord
watch(() => props.chord, renderChord, { immediate: false });
watch(() => props.chordKey, renderChord, { immediate: false });

// Initialize the chord display when the component is mounted
onMounted(() => {
  renderChord();
});
</script>

<template>
  <div class="chord-component">
    <h3 class="chord-title">{{ chordTitle }}</h3>
    <div ref="chordContainer" class="chord-container"></div>
  </div>
</template>

<style scoped>
.chord-component {
  display: flex;
  flex-direction: column;
  align-items: center;
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
