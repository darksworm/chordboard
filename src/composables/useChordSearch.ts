import { ref, watch } from 'vue';
import { fetchSearchSuggestions, type Chord as ChordType } from '../services/chordserverapi';

export function useChordSearch() {
  const chordInput = ref('');
  const fingeringInput = ref('');
  const isLoading = ref(false);
  const errorMessage = ref('');

  // Search suggestions
  const searchSuggestions = ref<ChordType[]>([]);
  const selectedSuggestionIndex = ref(0);
  const showSuggestions = ref(false);
  const noResultsFound = ref(false);
  let debounceTimeout: number | null = null;

  // Fetch search suggestions with debounce
  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      searchSuggestions.value = [];
      showSuggestions.value = false;
      noResultsFound.value = false;
      return;
    }

    // Clear previous timeout
    if (debounceTimeout !== null) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout (300ms debounce)
    debounceTimeout = setTimeout(async () => {
      const result = await fetchSearchSuggestions(query);

      if (result.isOk()) {
        // Limit to top 5 suggestions
        searchSuggestions.value = result.value.slice(0, 5);
        selectedSuggestionIndex.value = 0; // Always select the first suggestion
        showSuggestions.value = searchSuggestions.value.length > 0;
        noResultsFound.value = query.trim().length > 0 && searchSuggestions.value.length === 0;
      } else {
        searchSuggestions.value = [];
        showSuggestions.value = false;
        noResultsFound.value = false;
      }
    }, 300) as unknown as number;
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!showSuggestions.value) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % searchSuggestions.value.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedSuggestionIndex.value = (selectedSuggestionIndex.value - 1 + searchSuggestions.value.length) % searchSuggestions.value.length;
        break;
      case 'Enter':
        event.preventDefault();
        break;
      case 'Escape':
        event.preventDefault();
        showSuggestions.value = false;
        break;
    }
  };

  // Check if input is a fingering pattern (6 symbols from 0-9, a-z, x)
  const isFingeringPattern = (input: string): boolean => {
    // Regex to match exactly 6 characters that are digits 0-9, letters a-z, or 'x'
    const fingeringRegex = /^[0-9a-zx]{6}$/;
    return fingeringRegex.test(input);
  };

  // Clear search state
  const clearSearchState = () => {
    showSuggestions.value = false;
    searchSuggestions.value = [];
    selectedSuggestionIndex.value = 0;
    noResultsFound.value = false;
  };

  // Watch for changes in the chord input to fetch suggestions
  watch(chordInput, (newValue) => {
    fetchSuggestions(newValue);
  });

  return {
    // State
    chordInput,
    fingeringInput,
    isLoading,
    errorMessage,
    searchSuggestions,
    selectedSuggestionIndex,
    showSuggestions,
    noResultsFound,

    // Methods
    fetchSuggestions,
    handleKeyDown,
    isFingeringPattern,
    clearSearchState
  };
}
