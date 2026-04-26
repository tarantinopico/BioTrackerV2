import fs from 'fs';

const filePath = 'src/components/Analytics.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/className="md3-card /g, 'className="bg-white/5 dark:bg-black/20 backdrop-blur-[30px] border border-white/10 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden ');
content = content.replace(/className="w-full md3-card /g, 'className="w-full bg-white/5 dark:bg-black/20 backdrop-blur-[30px] border border-white/10 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden ');
content = content.replace(/className="lg:col-span-2 md3-card /g, 'className="lg:col-span-2 bg-white/5 dark:bg-black/20 backdrop-blur-[30px] border border-white/10 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
