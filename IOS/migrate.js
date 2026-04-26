const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src').concat(['./App.tsx']);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Rename contexts
  content = content.replace(/\/context\//g, '/contexts/');
  
  // 2. Rename api to services
  content = content.replace(/\/api\/services/g, '/services/services');
  content = content.replace(/\/api\/axios/g, '/services/axios');

  // 3. Migrate constants (theme vs config)
  // Neu co utils/constants
  if(content.includes('utils/constants')) {
      // Split imports
      if (content.match(/import\s+{([^}]*)}\s+from\s+['"]([^'"]*)utils\/constants['"]/)) {
         let match = content.match(/import\s+{([^}]*)}\s+from\s+['"]([^'"]*)utils\/constants['"]/);
         let args = match[1].split(',').map(s => s.trim());
         let relativePath = match[2];
         
         let envArgs = args.filter(a => ['API_BASE_URL', 'IMAGE_BASE_URL', 'TOKEN_KEY'].includes(a));
         let themeArgs = args.filter(a => !['API_BASE_URL', 'IMAGE_BASE_URL', 'TOKEN_KEY'].includes(a));
         
         let replacement = '';
         if (envArgs.length > 0) {
             replacement += `import { ${envArgs.join(', ')} } from '${relativePath}config/env';\n`;
         }
         if (themeArgs.length > 0) {
             replacement += `import { ${themeArgs.join(', ')} } from '${relativePath}theme';`;
         }
         
         content = content.replace(match[0], replacement);
      }
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated: ' + file);
  }
});
