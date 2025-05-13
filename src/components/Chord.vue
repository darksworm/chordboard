<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {type Chord as VexBoxChord, ChordBox} from 'vexchords';
import type {Chord} from "@/services/chordserverapi.ts";

// Define props and emits
const props = withDefaults(defineProps<{
  chord: Chord; // Required
  selectedFingering?: number; // Optional
}>(), {
  selectedFingering: 0
})

const emit = defineEmits(['positionChanged']);

// Create internal position state
const currentPosition = ref(props.selectedFingering);

// Reference to the chord container
const chordContainer = ref<HTMLElement | null>(null);
const chordTitle = ref('');

// Function to change position
const changePosition = (newPosition: number) => {
  if (newPosition >= 0 && newPosition < props.chord.positions.length &&
    newPosition !== currentPosition.value) {
    currentPosition.value = newPosition;
    emit('positionChanged', newPosition);
    renderChord();
  }
};

// Function to render the chord
const renderChord = () => {
  if (!chordContainer.value || !props.chord) return;

  // Clear previous chord
  chordContainer.value.innerHTML = '';

  // Create new chord
  const chord = new ChordBox(chordContainer.value, {
    width: 200,
    height: 240,
    showTuning: true
  });

  // Handle API response format
  if (!props.chord.positions || props.chord.positions.length === 0) return;

  const position = props.chord.positions[currentPosition.value];

  // Update chord title
  chordTitle.value = `${props.chord.key}${props.chord.suffix || ''}`;

  // Convert frets string to positions array
  const frets = position.frets.split('');

  // Get fingers if available
  const fingers = position.fingers ? position.fingers.split('') : null;

  // Parse barres if present
  const barres: { fromString: number; toString: number; fret: number }[] = [];
  const barredPositions = new Set<string>();

  if (position.barres) {
    const barresFrets = position.barres.split(',').map(Number);
    barresFrets.forEach(fret => {
      let fromString = 1;
      let toString = 6;
      frets.forEach((f, i) => {
        if (parseInt(f, 10) === fret) {
          const string = 6 - i;
          fromString = Math.max(fromString, string);
          toString = Math.min(toString, string);
          barredPositions.add(`${string}-${fret}`);
        }
      });
      barres.push({fromString, toString, fret: fret});
    });
  }

  // Map frets to positions
  const chordPositions = frets.map((fret, index) => {
    const string = 6 - index;

    if (fret === 'x') {
      return [string, 'x'];
    }

    const fretNum = parseInt(fret, 10);

    if (fretNum === 0) {
      return [string, 0];
    }

    if (fingers && fingers[index] !== '0') {
      return [string, fretNum, fingers[index]];
    }

    return [string, fretNum];
  }).filter(pos => {
    if (pos[1] === 0) return false;

    if (typeof pos[1] === 'number' && barredPositions.has(`${pos[0]}-${pos[1]}`)) {
      return false;
    }

    return true;
  });

  // Draw the chord
  chord.draw({
    chord: chordPositions as VexBoxChord,
    barres,
    position: 0,
    positionText: 0
  });
};

// Watch for changes in props to re-render the chord
watch(() => props.chord, () => {
  currentPosition.value = props.selectedFingering;
  renderChord();
}, {immediate: true});

watch(() => props.selectedFingering, (newPosition) => {
  // only re-render if the position does not match the internal one
  if (currentPosition.value !== newPosition) {
    currentPosition.value = newPosition;
    renderChord();
  }
});

// Initialize the chord display when the component is mounted
onMounted(() => {
  if (props.chord) {
    renderChord();
  }
});
</script>

<template>
  <div class="chord-component">
    <h3 class="chord-title">{{ chordTitle }}</h3>
    <div ref="chordContainer" class="chord-container"></div>

    <div class="fingerings-nav" v-if="props.chord.positions && props.chord.positions.length > 1">
      <span
        class="nav-button"
        :style="{ opacity: currentPosition > 0 ? 1 : 0 }"
        @click="changePosition(currentPosition - 1)"
      >&lt;</span>
      <span class="position-indicator">{{ currentPosition + 1 }} / {{ props.chord.positions.length }}</span>
      <span
        class="nav-button"
        v-if="currentPosition < props.chord.positions.length - 1"
        @click="changePosition(currentPosition + 1)"
      >&gt;</span>
    </div>
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
  height: 0;
  color: #666666;
}

.fingerings-nav {
  height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  color: black;
}

.nav-button {
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
  user-select: none;
}
.position-indicator {
  font-size: 0.9rem;
  color: #666;
}
</style>
