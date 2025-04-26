# Anki Browser Windsurf

A web app to browse and review your Anki decks using Ankiconnect.

## Features
- Browse your Anki decks
- List and review cards
- Mark cards as reviewed (syncs with Anki via Ankiconnect)

## Getting Started

1. Make sure you have [Ankiconnect](https://foosoft.net/projects/anki-connect/) installed and Anki running.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.
5. Build the project for production:
   ```bash
   npm run build
   ```
6. Preview the production build (serves from `dist`):
   ```bash
   npm run preview
   ```

## Configuration
- The app assumes Ankiconnect is running at `http://localhost:8765`.
- No backend server required; all requests are made from the browser.

---
MIT License
