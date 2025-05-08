# Structure

This document contains the high-level structure of the code for the ChordBoard project. Use this as a map to locate code.

## Code Structure

The ChordBoard project follows a standard Vue 3 application structure:

```
chordboard/
├── public/               # Static assets that will be served as-is
│   └── favicon.ico       # Website favicon
├── src/                  # Source code
│   ├── assets/           # Static assets that will be processed by the build tool
│   │   ├── base.css      # Base CSS styles
│   │   ├── logo.svg      # Vue logo
│   │   └── main.css      # Main CSS styles
│   ├── components/       # Vue components
│   │   ├── ChordDisplay.vue  # Component for displaying guitar chords
│   │   └── ...           # Other components
│   ├── router/           # Vue Router configuration
│   │   └── index.ts      # Router setup and route definitions
│   ├── views/            # Vue components used as pages
│   │   ├── HomeView.vue  # Home page component
│   │   └── AboutView.vue # About page component
│   ├── App.vue           # Root component
│   └── main.ts           # Application entry point
├── index.html            # HTML entry point
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── ...                   # Other configuration files
```

### Key Components

- **ChordDisplay.vue**: The main component that displays guitar chords using the vexchords library. It includes:
  - A set of buttons for selecting different chords (A Minor, C Major, F Major)
  - A display area for rendering the selected chord
  - Logic for rendering and updating the chord display

- **HomeView.vue**: The main page component that includes the ChordDisplay component.

- **App.vue**: The root component that provides the application layout and includes the router view.
