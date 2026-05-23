const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const ICONS_DIR = path.join(ROOT_DIR, 'svg-icons');

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
 * Validates a single SVG file against the animated-svg-generator guidelines.
 */
function validateSvg(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
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
    const colorVarMatches = svgBlock.match(/(--(?:primary|secondary|color-\d+)-color\s*:[^;\n]+;[^\n]*)/g) || [];
    colorVarMatches.forEach(colorLine => {
      if (!/\/\*[\s\S]*?\*\//.test(colorLine)) {
        warnings.push(`Color variable declaration lacks an inline comment label for UI rendering: "${colorLine.trim()}"`);
      }
    });
  }

  // 6. Check Shorthand Animation vs Discrete Properties
  // Matches "animation: " but avoids properties like "animation-name", "animation-duration", etc.
  const shorthandMatch = styleContent.match(/(?<!-)animation\s*:\s*(?!\s*var)/i);
  if (shorthandMatch) {
    warnings.push('Avoid shorthand CSS "animation" rule. Declare individual properties (animation-name, animation-duration, etc.) to prevent parsing issues.');
  }

  // 7. Check Keyframe Hardcoded Colors
  const keyframesMatches = styleContent.match(/@keyframes[\s\S]*?\{([\s\S]*?)\n\s*\}/g) || [];
  keyframesMatches.forEach(keyframeBlock => {
    const nameMatch = keyframeBlock.match(/@keyframes\s+(\w+)/);
    const keyframeName = nameMatch ? nameMatch[1] : 'unknown';
    
    // Check for raw color hex, rgb, or hsl inside keyframe blocks
    const hardcodedColors = keyframeBlock.match(/(#[a-fA-F0-9]{3,8}|rgba?\(|hsla?\()/g);
    if (hardcodedColors) {
      errors.push(`Hardcoded color "${hardcodedColors[0]}" found in keyframe "${keyframeName}". Animating colors must reference CSS variables via "var(...)".`);
    }
  });

  // 8. vector-effect Conflict Check (Critical Bug Detection)
  // Check if non-scaling-stroke is combined with stroke-dashoffset / stroke-dasharray animations
  if (styleContent.includes('vector-effect') && styleContent.includes('non-scaling-stroke')) {
    // Find classes using vector-effect
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
  const spanishRegex = /[áéíóúñÁÉÍÓÚÑ]/; // Basic detection of common Spanish accent characters
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

  const files = getFilesRecursively(ICONS_DIR);
  let totalErrors = 0;
  let totalWarnings = 0;
  let invalidFiles = 0;

  files.forEach(file => {
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
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

  // Exit with failure code if errors exist
  process.exit(totalErrors > 0 ? 1 : 0);
}

runValidator();
