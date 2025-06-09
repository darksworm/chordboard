# Changes Implemented

## Docker Support

1. Created a `Dockerfile` with a multi-stage build:
   - First stage: Builds the Vue.js application using Node.js
   - Second stage: Copies the built files to an nginx container for serving

2. Created an `nginx.conf` file to properly serve the Vue SPA:
   - Configured to handle client-side routing
   - Enabled gzip compression
   - Set appropriate cache headers for static assets
   - Configured error pages

## GitHub Actions Workflow

1. Created a GitHub Actions workflow file (`.github/workflows/docker-publish.yml`):
   - Triggers on pushes to the main branch
   - Builds the Docker image
   - Pushes the image to GitHub Container Registry (ghcr.io)
   - Tags the image with 'latest' and the short SHA of the commit

## Documentation

1. Updated the README.md file with:
   - Information about the Docker setup
   - Instructions for building and running the Docker image locally
   - Explanation of the CI/CD workflow
   - Instructions for using the published Docker image

## How to Use

1. To build and run the Docker image locally:
   ```sh
   docker build -t chordboard .
   docker run -p 8080:80 chordboard
   ```

2. To use the published Docker image from GitHub Container Registry:
   ```sh
   docker pull ghcr.io/[owner]/chordboard:latest
   docker run -p 8080:80 ghcr.io/[owner]/chordboard:latest
   ```

3. The GitHub Actions workflow will automatically build and publish the Docker image when changes are pushed to the main branch.
