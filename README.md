# Run and deploy your AI Studio app

Source files live in `src/` and are compiled using Vite. The compiled
JavaScript is written to the `dist/` directory.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Build the compiled files: `npm run build` (output in `dist/`)
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
4. Run the app locally (using Vite): `npm run dev`

Using Vite or another tool for local development is optional. Deployment only
requires serving the files in this repository as-is.

## GitHub Pages

The `main` branch only contains source code. On every push a GitHub Actions
workflow runs `npm run build` and deploys the `dist/` folder to GitHub Pages.
