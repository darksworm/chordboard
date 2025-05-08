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


/**
 * Fetches chord data from the API
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
