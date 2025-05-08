# Apis

## Guitar Chord HTTP API

Base URL  
http://<host>:8080, assume localhost for development

Endpoint  
GET /chords/{name}

Response (200 OK)  
Content-Type: application/json  
Schema:

    {
      "key": "string",        # root note
      "suffix": "string",     # chord type/extension
      "positions": [
        {
          "frets": "string",   # e.g. "x022x0"
          "fingers": "string", # e.g. "001200"
          "barres": "string",  # optional, fret number(s) for barre
          "capo": "string"     # optional, "true" if capo required
        }
      ]
    }

Errors  
400 Bad Request – missing/empty name  
404 Not Found – no matching chord

Examples  
curl http://localhost:8080/chords/Am  
curl http://localhost:8080/chords/F%23maj  
curl http://localhost:8080/chords/Am13%2FG
