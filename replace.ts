import fs from 'fs';
import path from 'path';

const dir = './src';

function replaceInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const replacements: Record<string, string> = {
    'ios-bg': 'md3-bg',
    'ios-text': 'md3-text',
    'ios-card': 'md3-card',
    'ios-secondary': 'md3-secondary',
    'ios-border': 'md3-border',
    'ios-glass': 'md3-glass',
    'ios-subtle': 'md3-subtle',
    'ios-subtle-hover': 'md3-subtle-hover',
    'ios-blue': 'md3-primary',
    'ios-green': 'md3-green',
    'ios-red': 'md3-error',
    'ios-orange': 'md3-orange',
    'ios-gray': 'md3-gray',
    'ios-purple': 'md3-primary-container',
    'ios-button': 'md3-button',
    'ios-input': 'md3-input',
    'text-glow-blue': 'text-glow-primary',
    'text-glow-red': 'text-glow-error',
    'bg-ios-bg': 'bg-md3-bg',
    'text-ios-text': 'text-md3-text',
    'bg-ios-card': 'bg-md3-card',
    'border-ios-border': 'border-md3-border',
    'text-ios-gray': 'text-md3-gray',
    'text-ios-blue': 'text-md3-primary',
    'bg-ios-secondary': 'bg-md3-secondary',
    'bg-ios-blue': 'bg-md3-primary',
    'bg-ios-green': 'bg-md3-green',
    'bg-ios-red': 'bg-md3-error',
    'bg-ios-orange': 'bg-md3-orange',
    'text-ios-green': 'text-md3-green',
    'text-ios-red': 'text-md3-error',
    'text-ios-orange': 'text-md3-orange',
    'text-ios-purple': 'text-md3-primary-container',
    'bg-ios-purple': 'bg-md3-primary-container',
  };

  let newContent = content;
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(key, 'g');
    newContent = newContent.replace(regex, value);
  }

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      replaceInFile(filePath);
    }
  }
}

walk(dir);
