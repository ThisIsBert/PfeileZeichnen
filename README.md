# Run and deploy your AI Studio app

Source files now live under `src/` and are compiled using Vite. The generated
JavaScript in the repository root can still be served directly on GitHub Pages.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Build the compiled files: `npm run build`
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
4. Run the app locally (using Vite): `npm run dev`

Using Vite or another tool for local development is optional. Deployment only
requires serving the files in this repository as-is.

## GitHub Pages

The compiled JavaScript files are checked in so the app can be hosted directly
from the repository root. After editing the sources run `npm run build` and
commit the updated files before pushing to GitHub Pages.
