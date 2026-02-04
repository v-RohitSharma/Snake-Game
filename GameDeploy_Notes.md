# Instructions for Deploying the Snake Game - Dist folder

To deploy the Snake Game, run following commmands in terminal / pwsh:
npm run build
git add dist -f
git commit -m "Update: [describe changes]"
git push origin main
git subtree push --prefix dist origin gh-pages