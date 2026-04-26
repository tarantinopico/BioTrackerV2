const fs = require('fs');

const updateFile = (path, search, replacement) => {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(search, replacement);
  fs.writeFileSync(path, content, 'utf8');
}

updateFile('src/components/Dashboard.tsx', 'pb-8', 'pb-32');
updateFile('src/components/Substances.tsx', 'pb-10', 'pb-32');
updateFile('src/components/Settings.tsx', 'pb-8', 'pb-32');
console.log('Spacings updated');
