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
