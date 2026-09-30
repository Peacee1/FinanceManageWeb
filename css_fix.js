const fs = require('fs');
let css = fs.readFileSync('frontend/src/index.css', 'utf8');
css = css.replace(/@media \(max-width: 768px\) \{\s*\.grid-responsive-1-1,\s*\.grid-responsive-2-1,\s*\.grid-responsive-3,\s*\.grid-responsive-1-1-1 \{\s*grid-template-columns: 1fr !important;\s*\}\s*\}/g, 
`@media (max-width: 768px) {
  .dashboard-scroll { padding: 10px !important; }
  .cal-cell { padding: 2px !important; min-height: 50px !important; }
  .cal-date { font-size: 0.75rem !important; }
  .tx-badge { font-size: 0.6rem !important; white-space: normal !important; word-break: break-all; }
  .cal-header-row { font-size: 0.7rem !important; }
  .grid-responsive-1-1,
  .grid-responsive-2-1,
  .grid-responsive-3,
  .grid-responsive-1-1-1 { 
    grid-template-columns: 1fr !important; 
  }
}`);
fs.writeFileSync('frontend/src/index.css', css);
console.log('Replaced successfully');
