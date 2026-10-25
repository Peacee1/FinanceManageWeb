# Peacee1 Tasks web client

Source recovered from the existing production Tasks deployment before the monochrome refresh. Uses the shared authenticated `/api/tasks` backend. No changes to account ownership or task permissions.

Deploy `index.html`, `app.js`, `language.js`, `style.css`, `theme.js`, `refinements.css` and `assets/tasks-monochrome.svg` into the existing Nginx Tasks root; preserve all existing assets. The native app is in `../tasks-mobile`.

Run `node --test test/*.test.cjs` and `node --check app.js` before deployment.
