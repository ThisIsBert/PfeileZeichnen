# Run and deploy your AI Studio app

This project is maintained entirely in plain JavaScript. The compiled `.js` files
are committed to the repository so there is no build step required when
deploying.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies (optional for development only): `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app locally (using Vite): `npm run dev`

Using Vite or another tool for local development is optional. Deployment only
requires serving the files in this repository as-is.

## GitHub Pages

Compiled JavaScript files (`*.js`) are included in the repository so the app can
be served directly from GitHub Pages without a build step. Simply enable Pages
for the repository and point it at the root directory.
