const fs = require('fs');

const filePath = 'src/components/Analytics.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /{([^}]+)}\s*{\/\* Category Breakdown \*\/}[\s\S]*?{/\* Substance List \*\//g;

const match = regex.exec(content);
if (match) {
  console.log("Found match, replacing...", match[0].substring(0, 100));
} else {
  console.log("No match found");
}
