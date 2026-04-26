import fs from 'fs';

const filePath = 'src/components/Analytics.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/backdrop-blur-\[30px\]/g, 'backdrop-blur-[40px]');
content = content.replace(/className="w-full bg-white\/5 dark:bg-black\/20 backdrop-blur-\[40px\] border border-white\/10 rounded-\[2rem\] shadow-\[0_8px_30px_rgba\(0,0,0,0\.12\)\] relative overflow-hidden /g, 'className="w-full bg-white/5 dark:bg-black/30 backdrop-blur-md border border-white/5 rounded-[1.5rem] shadow-sm relative overflow-hidden group hover:bg-white/10 transition-colors ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
