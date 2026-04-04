const fs = require('fs');

const files = [
  './src/components/Dashboard.tsx',
  './src/components/Logger.tsx',
  './src/components/Settings.tsx',
  './src/components/Substances.tsx',
  './src/components/DoseHistory.tsx',
  './src/components/QuickActions.tsx',
  './src/App.tsx'
];

files.forEach(path => {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  content = content.replace(/bg-theme-secondary\/40 backdrop-blur-3xl rounded-3xl border border-theme-border/g, 'glass-card');
  content = content.replace(/bg-theme-card\/90 backdrop-blur-xl border border-theme-border/g, 'glass-card');
  content = content.replace(/bg-theme-card border border-theme-border/g, 'glass-card');
  content = content.replace(/bg-theme-subtle border border-theme-border/g, 'glass-card');
  content = content.replace(/bg-theme-subtle/g, 'bg-white/5');
  content = content.replace(/bg-theme-secondary/g, 'bg-white/5');
  content = content.replace(/border-theme-border/g, 'border-white/10');
  content = content.replace(/text-theme-text/g, 'text-white');
  content = content.replace(/text-ios-gray/g, 'text-gray-500');
  content = content.replace(/text-ios-blue/g, 'text-[#00e5ff]');
  content = content.replace(/text-ios-green/g, 'text-[#00e676]');
  content = content.replace(/text-ios-red/g, 'text-[#ff1744]');
  content = content.replace(/text-ios-orange/g, 'text-[#ff9100]');
  content = content.replace(/cyan-primary/g, '#00e5ff');
  content = content.replace(/bg-theme-bg/g, 'bg-black');
  content = content.replace(/bg-theme-card/g, 'bg-white/5');
  content = content.replace(/ios-card/g, 'glass-card');
  content = content.replace(/bg-ios-secondary/g, 'bg-white/5');
  content = content.replace(/text-ios-gray/g, 'text-gray-500');
  content = content.replace(/bg-ios-blue\/10/g, 'bg-[#00e5ff]/10');
  content = content.replace(/text-ios-blue/g, 'text-[#00e5ff]');
  content = content.replace(/bg-ios-green\/10/g, 'bg-[#00e676]/10');
  content = content.replace(/text-ios-green/g, 'text-[#00e676]');
  content = content.replace(/bg-ios-red\/10/g, 'bg-[#ff1744]/10');
  content = content.replace(/text-ios-red/g, 'text-[#ff1744]');
  content = content.replace(/bg-ios-orange\/10/g, 'bg-[#ff9100]/10');
  content = content.replace(/text-ios-orange/g, 'text-[#ff9100]');
  content = content.replace(/ios-input/g, 'glass-input');
  content = content.replace(/bg-ios-bg/g, 'bg-black');
  content = content.replace(/border-ios-border/g, 'border-white/10');
  content = content.replace(/text-ios-text/g, 'text-white');
  content = content.replace(/bg-ios-card/g, 'bg-white/5');

  fs.writeFileSync(path, content);
});

console.log('Done');
