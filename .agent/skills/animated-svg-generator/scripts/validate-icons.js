const fs = require('fs');
const path = require('path');

// Determine target directory: command-line argument or current working directory
const targetArg = process.argv[2];
const SCAN_DIR = targetArg ? path.resolve(targetArg) : process.cwd();

// ANSI escape codes for beautiful console formatting
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const MANDATORY_VARS = [
  '--primary-color',
  '--stroke-width',
  '--animation-duration',
  '--curve',
  '--animation-loop',
  '--animation-direction'
];

/**
 * Recursively fetches all .svg files from a directory.
 */
function getFilesRecursively(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  
  // If the target is a single file, return it directly if it's an SVG
  if (fs.statSync(dir).isFile()) {
    if (dir.endsWith('.svg')) {
      files.push(dir);
    }
    return files;
  }

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
 * Validates a single SVG file against the animated-svg-generator guidelines.
 */
function validateSvg(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  const warnings = [];

  // 1. Check XML / SVG Validity
  if (!content.trim().startsWith('<svg') || !content.trim().endsWith('</svg>')) {
    errors.push('File must be a self-contained SVG starting with <svg> and ending with </svg>.');
    return { errors, warnings };
  }

  // 2. Check viewBox Standard (0 0 100 100)
  const viewBoxMatch = content.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!viewBoxMatch) {
    errors.push('Missing viewBox attribute.');
  } else {
    const viewBoxValues = viewBoxMatch[1].trim().replace(/\s+/g, ' ');
    if (viewBoxValues !== '0 0 100 100') {
      errors.push(`viewBox must be exactly "0 0 100 100" (found: "${viewBoxValues}").`);
    }
  }

  // 3. Extract <style> Block
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) {
    errors.push('Missing <style> tag inside defs/svg. Animated styles are required.');
    return { errors, warnings };
  }
  const styleContent = styleMatch[1];

  // 4. Check Variable Scope (Must be scoped to svg, not :root)
  if (styleContent.includes(':root')) {
    errors.push('CSS custom variables must be scoped to the "svg { ... }" selector, NOT ":root", to prevent inline document leaks.');
  }

  // 5. Check Custom Variables Declared inside "svg { ... }"
  const svgBlockMatch = styleContent.match(/svg\s*\{([\s\S]*?)\}/i);
  if (!svgBlockMatch) {
    errors.push('Missing "svg { ... }" style block containing your customization variables.');
  } else {
    const svgBlock = svgBlockMatch[1];
    MANDATORY_VARS.forEach(variable => {
      if (!svgBlock.includes(variable)) {
        errors.push(`Missing mandatory customizable variable: "${variable}".`);
      }
    });

    // Color Label Metadata Check (Warn if color variable does not have a comment label)
    const colorVarMatches = svgBlock.match(/(--(--?\w+-)*color\s*:[^;\n]+;[^\n]*)|(--(?:primary|secondary|color-\d+)-color\s*:[^;\n]+;[^\n]*)/g) || [];
    colorVarMatches.forEach(colorLine => {
      if (!/\/\*[\s\S]*?\*\//.test(colorLine)) {
        warnings.push(`Color variable declaration lacks an inline comment label for UI rendering: "${colorLine.trim()}"`);
      }
    });
  }

  // 6. Check Shorthand Animation vs Discrete Properties
  const shorthandMatch = styleContent.match(/(?<!-)animation\s*:\s*(?!\s*var)/i);
  if (shorthandMatch) {
    warnings.push('Avoid shorthand CSS "animation" rule. Declare individual properties (animation-name, animation-duration, etc.) to prevent parsing issues.');
  }

  // 7. Check Keyframe Hardcoded Colors
  const keyframesMatches = styleContent.match(/@keyframes[\s\S]*?\{([\s\S]*?)\n\s*\}/g) || [];
  keyframesMatches.forEach(keyframeBlock => {
    const nameMatch = keyframeBlock.match(/@keyframes\s+(\w+)/);
    const keyframeName = nameMatch ? nameMatch[1] : 'unknown';
    
    const hardcodedColors = keyframeBlock.match(/(#[a-fA-F0-9]{3,8}|rgba?\(|hsla?\()/g);
    if (hardcodedColors) {
      errors.push(`Hardcoded color "${hardcodedColors[0]}" found in keyframe "${keyframeName}". Animating colors must reference CSS variables via "var(...)".`);
    }
  });

  // 8. vector-effect Conflict Check (Critical Bug Detection)
  if (styleContent.includes('vector-effect') && styleContent.includes('non-scaling-stroke')) {
    const cssRules = styleContent.match(/([.\w\s,-]+)\{([\s\S]*?)\}/g) || [];
    cssRules.forEach(rule => {
      const hasVectorEffect = rule.includes('vector-effect') && rule.includes('non-scaling-stroke');
      const hasDashAnimation = rule.includes('stroke-dashoffset') || rule.includes('stroke-dasharray') || rule.includes('animation');
      
      if (hasVectorEffect && hasDashAnimation) {
        warnings.push(`Element combines "vector-effect: non-scaling-stroke" and animated/dashed properties. Ensure it is NOT applied to active draw-in paths as it breaks browser rendering.`);
      }
    });
  }

  // 9. Comments in non-English Check (Simple detection for accented Spanish characters in comments)
  const comments = content.match(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g) || [];
  const spanishRegex = /[áéíóúñÁÉÍÓÚÑ]/;
  comments.forEach(comment => {
    if (spanishRegex.test(comment)) {
      warnings.push(`Comment contains non-English special characters: "${comment.trim().substring(0, 50)}..."`);
    }
  });

  return { errors, warnings };
}

function runValidator() {
  console.log(`${COLORS.bold}${COLORS.cyan}===============================================`);
  console.log(`🔍   Animated SVG Icon Validation Engine   🔍`);
  console.log(`===============================================${COLORS.reset}\n`);
  console.log(`${COLORS.bold}Scanning target:${COLORS.reset} ${SCAN_DIR}\n`);

  if (!fs.existsSync(SCAN_DIR)) {
    console.error(`${COLORS.bold}${COLORS.red}[ERROR] Path "${SCAN_DIR}" does not exist.${COLORS.reset}`);
    process.exit(1);
  }

  const files = getFilesRecursively(SCAN_DIR);
  let totalErrors = 0;
  let totalWarnings = 0;
  let invalidFiles = 0;

  if (files.length === 0) {
    console.log(`${COLORS.yellow}No .svg files found in the specified path.${COLORS.reset}`);
    process.exit(0);
  }

  files.forEach(file => {
    const relativePath = path.relative(SCAN_DIR, file).replace(/\\/g, '/');
    const { errors, warnings } = validateSvg(file);

    if (errors.length > 0 || warnings.length > 0) {
      if (errors.length > 0) {
        invalidFiles++;
        console.log(`${COLORS.bold}${COLORS.red}❌ FAIL: ${relativePath}${COLORS.reset}`);
      } else {
        console.log(`${COLORS.bold}${COLORS.yellow}⚠️ WARN: ${relativePath}${COLORS.reset}`);
      }

      errors.forEach(err => console.log(`   ${COLORS.red}• [ERROR] ${err}${COLORS.reset}`));
      warnings.forEach(warn => console.log(`   ${COLORS.yellow}• [WARNING] ${warn}${COLORS.reset}`));
      console.log('');
      
      totalErrors += errors.length;
      totalWarnings += warnings.length;
    } else {
      console.log(`${COLORS.green}✅ PASS: ${relativePath}${COLORS.reset}`);
    }
  });

  console.log(`\n${COLORS.bold}=================== SUMMARY ===================`);
  console.log(`📂 Total SVGs Scanned: ${files.length}`);
  if (totalErrors === 0) {
    console.log(`✨ Status: ${COLORS.green}SUCCESS (All icons are valid!)${COLORS.reset}`);
  } else {
    console.log(`✨ Status: ${COLORS.red}FAILED (${invalidFiles} invalid files detected)${COLORS.reset}`);
  }
  console.log(`❌ Total Errors:   ${totalErrors}`);
  console.log(`⚠️ Total Warnings: ${totalWarnings}`);
  console.log(`===============================================${COLORS.reset}`);

  process.exit(totalErrors > 0 ? 1 : 0);
}

runValidator();
