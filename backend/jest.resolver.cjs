/**
 * Custom Jest resolver that walks up the directory tree from basedir,
 * mimicking Node.js's native module resolution algorithm.
 */
const path = require('path');
const fs = require('fs');

function findInNestedNodeModules(request, startDir) {
  let dir = startDir;
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, 'node_modules', request);
    if (fs.existsSync(candidate)) {
      // Found the package directory — find its main file
      const pkgJsonPath = path.join(candidate, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          // Try "main" field
          const main = pkg.main;
          if (main) {
            const mainPath = path.join(candidate, main);
            if (fs.existsSync(mainPath)) return mainPath;
            // Try with .js extension
            if (fs.existsSync(mainPath + '.js')) return mainPath + '.js';
          }
          // Default index.js
          const indexPath = path.join(candidate, 'index.js');
          if (fs.existsSync(indexPath)) return indexPath;
        } catch {}
      }
      // If no package.json, try index.js
      const indexPath = path.join(candidate, 'index.js');
      if (fs.existsSync(indexPath)) return indexPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function resolve(request, options) {
  // Only handle bare module specifiers (not relative paths)
  if (!request.startsWith('.') && !path.isAbsolute(request) && options.basedir) {
    // Try Node.js-style resolution from basedir upward
    const nested = findInNestedNodeModules(request, options.basedir);
    if (nested) return nested;
  }

  // Fall through to default resolver
  return options.defaultResolver(request, options);
}

module.exports = resolve;
