# Copilot Instructions

## Package Manager

This project uses **yarn** as the package manager. Do not use npm.

### Commands to use:

- Install dependencies: `yarn install`
- Add a dependency: `yarn add <package>`
- Add a dev dependency: `yarn add -D <package>`
- Remove a dependency: `yarn remove <package>`
- Run scripts: `yarn <script>` (e.g., `yarn dev`, `yarn build`)
- Run dev server: `yarn dev`
- Build for production: `yarn build`
- Preview build: `yarn preview`
- Deploy: `yarn deploy`

### Do NOT use:

- `npm install`
- `npm run`
- `npm add`
- Any npm commands

### Lock file

Only `yarn.lock` should be committed. Do not commit `package-lock.json`.

## UI/UX Guidelines

### Clickable Elements

All clickable elements must have `cursor: pointer`. This is already handled globally in `src/style.css` for standard elements (buttons, links, selects, etc.), but when adding custom clickable elements:

- Add the `cursor-pointer` class from Tailwind CSS
- Or ensure the element is a button/link/etc. that gets the global style

### Modals

All modals must:

- Close when pressing the Escape key
- Close when clicking outside the modal (on the backdrop)
