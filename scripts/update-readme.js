const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const README_PATH = path.join(ROOT_DIR, 'README.md');

const CATEGORIES = {
  emojis: {
    dir: path.join(ROOT_DIR, 'svg-icons/emojis'),
    startTag: '<!-- EMOJIS_TABLE_START -->',
    endTag: '<!-- EMOJIS_TABLE_END -->'
  },
  lines: {
    dir: path.join(ROOT_DIR, 'svg-icons/lines'),
    startTag: '<!-- LINES_TABLE_START -->',
    endTag: '<!-- LINES_TABLE_END -->'
  },
  particles: {
    dir: path.join(ROOT_DIR, 'svg-icons/particles'),
    startTag: '<!-- PARTICLES_TABLE_START -->',
    endTag: '<!-- PARTICLES_TABLE_END -->'
  },
  animals: {
    dir: path.join(ROOT_DIR, 'svg-icons/animals'),
    startTag: '<!-- ANIMALS_TABLE_START -->',
    endTag: '<!-- ANIMALS_TABLE_END -->'
  },
  plants: {
    dir: path.join(ROOT_DIR, 'svg-icons/plants'),
    startTag: '<!-- PLANTS_TABLE_START -->',
    endTag: '<!-- PLANTS_TABLE_END -->'
  },
  things: {
    dir: path.join(ROOT_DIR, 'svg-icons/things'),
    startTag: '<!-- THINGS_TABLE_START -->',
    endTag: '<!-- THINGS_TABLE_END -->'
  }
};

/**
 * Traverses directories recursively to find all .svg files.
 */
function getFilesRecursively(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      files = files.concat(getFilesRecursively(filePath));
    } else if (file.endsWith('.svg')) {
      files.push(filePath);
    }
  });
  return files;
}

/**
 * Builds a beautiful responsive 3-column HTML grid matching the README style.
 */
function buildHtmlGrid(svgFiles) {
  if (svgFiles.length === 0) {
    return '<table><tr><td align="center"><em>No icons available</em></td></tr></table>';
  }

  const COLUMNS = 3;
  let html = '<table>\n';
  
  for (let i = 0; i < svgFiles.length; i += COLUMNS) {
    const chunk = svgFiles.slice(i, i + COLUMNS);
    html += '  <tr>\n';
    
    chunk.forEach(filePath => {
      // Normalize paths to forward slashes for cross-platform compatibility on GitHub
      const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
      const filename = path.basename(filePath);
      
      html += '    <td align="center" width="250" style="padding: 20px; border: 1px solid #f0f0f0;">\n';
      html += `      <img src="${relPath}" width="100" height="100" alt="${filename}" /><br />\n`;
      html += '      <br />\n';
      html += `      <strong>${filename}</strong><br />\n`;
      html += `      <a href="${relPath}" download>💾 Download SVG</a>\n`;
      html += '    </td>\n';
    });
    
    // Fill remaining empty cells in the row
    for (let j = chunk.length; j < COLUMNS; j++) {
      html += '    <td align="center" width="250" style="padding: 20px; border: 1px solid #f0f0f0;"></td>\n';
    }
    html += '  </tr>\n';
  }
  
  html += '</table>';
  return html;
}

/**
 * Scans directories and dynamically updates the README showcase tables.
 */
function updateReadme() {
  try {
    let readme = fs.readFileSync(README_PATH, 'utf8');
    let totalIcons = 0;

    for (const [catName, cat] of Object.entries(CATEGORIES)) {
      const svgFiles = getFilesRecursively(cat.dir).sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
      totalIcons += svgFiles.length;
      
      const gridHtml = buildHtmlGrid(svgFiles);
      
      const startIdx = readme.indexOf(cat.startTag);
      const endIdx = readme.indexOf(cat.endTag);
      
      if (startIdx === -1 || endIdx === -1) {
        console.warn(`[WARNING] Placeholder flags for category "${catName}" not found in README.md`);
        continue;
      }
      
      readme = 
        readme.substring(0, startIdx + cat.startTag.length) +
        '\n' + gridHtml + '\n' +
        readme.substring(endIdx);
    }
    
    fs.writeFileSync(README_PATH, readme);
    console.log(`✨ README.md successfully updated with ${totalIcons} animated icons across all categories!`);
  } catch (err) {
    console.error('[ERROR] Failed to update README:', err);
  }
}

updateReadme();
