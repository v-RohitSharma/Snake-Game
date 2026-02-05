# Instructions for Deploying the Snake Game - Dist folder

To deploy the Snake Game, run following commands in terminal / pwsh:

```bash
npm run build
git add dist -f  # -f forces adding dist folder (normally ignored)
git commit -m "Update: [describe changes]"
git push origin main
git subtree push --prefix dist origin gh-pages
```

## Notes:
- The `dist` folder is in `.gitignore` so we use `git add dist -f` to force include it
- Replace `[describe changes]` with what you changed (e.g., "Add wrap-around borders feature")
- Your live game will be at: https://v-rohitsharma.github.io/Snake-Game/