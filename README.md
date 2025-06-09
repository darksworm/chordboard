# Chordboard

A Vue 3 application for chord management and visualization.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

### API Configuration

The application uses environment variables to configure the API URL. You can customize the API URL by setting the `VITE_API_URL` environment variable in the appropriate `.env` file:

- `.env`: Default environment variables for all environments
- `.env.development`: Environment variables for development (overrides `.env`)
- `.env.production`: Environment variables for production (overrides `.env`)

Example:
```
VITE_API_URL=http://localhost:8080
```

During the build process, the environment variables are embedded in the final build, so you don't need to configure them at runtime.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Docker

This project includes Docker support for easy deployment.

### Building the Docker Image Locally

```sh
docker build -t chordboard .
```

### Running the Docker Container Locally

```sh
docker run -p 8080:80 chordboard
```

The application will be available at http://localhost:8080.

## CI/CD with GitHub Actions

This project uses GitHub Actions to automatically build and publish a Docker image to GitHub Container Registry (GHCR) when changes are pushed to the main branch.

### Workflow

The GitHub Actions workflow:
1. Builds the application
2. Creates a Docker image
3. Pushes the image to GitHub Container Registry

### Using the Published Docker Image

Once the workflow has run successfully, you can pull and run the image from GHCR:

```sh
docker pull ghcr.io/[owner]/chordboard:latest
docker run -p 8080:80 ghcr.io/[owner]/chordboard:latest
```

Replace `[owner]` with the GitHub username or organization name that owns the repository.
