<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1130fa76-d660-413e-a959-9505c023d46f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` if you add Gemini-powered features later
3. Run the app:
   `npm run dev`

## Publish in this repo

Build the GitHub Pages output into `../../articles/retro-gaming-reporter` with:

`npm run build:pages`
