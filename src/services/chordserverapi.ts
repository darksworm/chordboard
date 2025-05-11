import {err, ok, Result, ResultAsync} from "neverthrow";

export interface Chord {
  key: string
  suffix: string
  positions: Position[]
}

export interface Position {
  frets: string
  fingers: string
  barres?: string
  capo?: string
}

export interface SearchResult {
  chords: Chord[]
}

/**
 * Sends a request to the healthcheck endpoint to wake up the server
 * @returns A promise that resolves when the healthcheck is complete
 */
export const healthcheck = async (): Promise<Result<boolean, string>> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  try {
    const response = await fetch(`${apiUrl}/healthcheck`);

    if (!response.ok) {
      return err(`Healthcheck failed: ${response.statusText}`);
    }

    return ok(true);
  } catch (error) {
    return err(`Healthcheck error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Fetches search suggestions from the API based on the query
 * @param query The search query (chord name or fingering pattern)
 * @returns An array of chord suggestions or an error message
 */
export const fetchSearchSuggestions = async (query: string): Promise<Result<Chord[], string>> => {
  if (!query.trim()) {
    return ok([]);
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const response = await fetch(`${apiUrl}/search/${encodeURIComponent(query)}`);

  if (!response.ok) {
    if (response.status === 404) {
      return ok([]); // Return empty array for no results
    } else {
      return err(`Error: ${response.statusText}`);
    }
  }

  const results = await response.json();
  return ok(Array.isArray(results) ? results : []);
};


/**
 * Fetches chord data from the API by chord name
 * @param chordName The name of the chord to fetch
 * @returns The chord data or null if there was an error
 */
export const fetchChordData = async (chordName: string): Promise<Result<Chord, string>> => {
  if (!chordName.trim()) {
    throw new Error('Please enter a chord name');
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const response = await fetch(`${apiUrl}/chords/${encodeURIComponent(chordName)}`);

  if (!response.ok) {
    if (response.status === 404) {
      return err(`Chord "${chordName}" not found`);
    } else {
      return err(`Error: ${response.statusText}`);
    }
  }

  return ok(await response.json());
};

/**
 * Fetches chord data from the API by fingering pattern
 * @param fingering The fingering pattern to search for (e.g., "x02110")
 * @returns The chord data or null if there was an error
 */
export const fetchChordByFingering = async (fingering: string): Promise<Result<Chord, string>> => {
  if (!fingering.trim()) {
    throw new Error('Please enter a fingering pattern');
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const response = await fetch(`${apiUrl}/fingers/${encodeURIComponent(fingering)}`);

  if (!response.ok) {
    if (response.status === 404) {
      return err(`No chord found with fingering "${fingering}"`);
    } else {
      return err(`Error: ${response.statusText}`);
    }
  }

  // The API returns an array of potential matches, so we take the first match
  const matches = await response.json();
  if (Array.isArray(matches) && matches.length > 0) {
    return ok(matches[0]);
  } else {
    return err(`No valid chord found with fingering "${fingering}"`);
  }
};
