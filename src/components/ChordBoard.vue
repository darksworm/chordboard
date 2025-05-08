<script setup lang="ts">
import {ref} from 'vue';
import {fetchChordData} from '../services/chordserverapi';
import Chord from './Chord.vue';

const chordInput = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const currentChord = ref<any>(null);

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
  }

  isLoading.value = false;
};
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
          {{ isLoading ? 'Loading...' : 'Show Chord' }}
        </button>
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>

    <Chord
      v-if="currentChord"
      :chord="currentChord"
    />
  </div>
</template>

<style scoped>
.chord-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
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
</style>
