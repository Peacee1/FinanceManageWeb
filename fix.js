const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');

// Also handle the edge case in <div className="quick-actions" style={{gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
content = content.replace(/className="quick-actions" style=\{\{gridTemplateColumns:\s*'1fr 1fr',\s*gap:\s*'10px'\}\}/g, 'className="quick-actions grid-responsive-1-1" style={{gap: \'10px\'}}');

content = content.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'(2fr 1fr|1fr 1fr|1fr 1fr 1fr|repeat\(3, 1fr\))'(.*?)\}\}/g, 
  (match, p1, p2) => {
    let className = 'grid-responsive';
    if (p1 === '2fr 1fr') className = 'grid-responsive-2-1';
    else if (p1 === '1fr 1fr') className = 'grid-responsive-1-1';
    else if (p1 === '1fr 1fr 1fr') className = 'grid-responsive-1-1-1';
    else if (p1 === 'repeat(3, 1fr)') className = 'grid-responsive-3';
    
    let remainingStyle = p2.trim().replace(/^,\s*/, '');
    if (remainingStyle) {
      return 'className="' + className + '" style={{' + remainingStyle + '}}';
    } else {
      return 'className="' + className + '"';
    }
  });

fs.writeFileSync('frontend/src/pages/Dashboard.jsx', content);
console.log('Replaced successfully');
