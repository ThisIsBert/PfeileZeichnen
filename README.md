# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies (optional for development only):
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app locally:
   `npm run dev`

## GitHub Pages

Compiled JavaScript files (`*.js`) are included in the repository so the app can
be served directly from GitHub Pages without a build step. Simply enable Pages
for the repository and point it at the root directory.
