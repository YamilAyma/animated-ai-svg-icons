---
name: animated-svg-generator
description: >
  Expert workflow for generating highly parameterizable, micro-animated SVG vector icons in cute hand-drawn outline style.
  Make sure to use this skill whenever the user wants to generate new animated SVG icons, create a collection of vector graphics, design animated custom loaders, or requests parameters-driven CSS animated vector elements for modern web applications.
---

# Animated SVG Generator

This skill guides the agent in generating high-quality, professional, cute-style micro-animated SVG icons. The generated SVG code is structurally parameterizable via CSS custom variables, making it natively compatible with customizer platforms and live playground editors.

## 📐 Structural & Visual Constraints

1. **ViewBox & Alignment:** Always map the icon artwork inside a standardized `viewBox="0 0 100 100"`. Center elements precisely and maintain readable, cute padding boundaries.
2. **Line Outlines:** Outlines must use thick stroke shapes (`2px`–`6px`) with rounded joins (`stroke-linejoin="round"`) and rounded caps (`stroke-linecap="round"`).
3. **Non-Scaling Outlines:** Apply `vector-effect: non-scaling-stroke;` to static outlines to ensure consistency. 
   > [!WARNING]
   > Do NOT use `vector-effect: non-scaling-stroke;` on elements that utilize `stroke-dasharray` or `stroke-dashoffset` draw-in/erase-out animations. Combining them breaks calculations and fragments the stroke rendering across modern browsers!
4. **Code Comments:** Keep internal SVG and CSS comments exclusively in **English**. Keep them brief, concise, and technically meaningful.

---

## 🎨 CSS Variable Parameterization & Scoping

To allow external customizable dashboards and live editors to dynamically parse, read, and override the SVG's parameters, you MUST declare all parameters inside a scoped `svg` selector within the `<style>` block:

```css
svg {
  /* Dynamic Palette - Use inline comments on the same line to act as customizer UI labels! */
  --primary-color: #3C95EA; /* Main Outline */
  --secondary-color: #FF9824; /* Accent Fill / Glow */
  /* --color-1, --color-2 ... are optional additional colors. Add descriptive comments! */
  
  /* Outline Properties */
  --stroke-width: 4px; /* Border Thickness */
  
  /* Animation Timing & Parameters */
  --animation-duration: 3s; /* Speed */
  --curve: cubic-bezier(0.34, 1.56, 0.64, 1); /* Motion Curve */
  --animation-loop: infinite; /* Loop Count */
  --animation-direction: alternate; /* Play Direction */
}
```

---

## 🎬 Animation Rules & Property Declarations

1. **Cross-Browser Stability:** To prevent parsing quirks across multiple rendering engines, declare CSS animations using individual properties rather than shorthand declarations:
   ```css
   .animated-part {
     animation-name: bounce;
     animation-duration: var(--animation-duration);
     animation-timing-function: var(--curve);
     animation-iteration-count: var(--animation-loop);
     animation-direction: var(--animation-direction);
   }
   ```
2. **Precise Coordinate Transform Center:** Define explicit coordinate `transform-origin` bounds inside the stylesheet (e.g. `transform-origin: 50px 50px;` if the element center sits at 50,50) rather than relying on browser-calculated defaults. This prevents elements from flying off the screen during active scale or rotate keyframe states.
3. **Variable-Driven Keyframes:** Do NOT write hardcoded hex, HSL, or RGB colors inside `@keyframes` blocks. If you are animating color transitions, you MUST reference the custom CSS variables instead (e.g. `stroke: var(--secondary-color);`). This keeps the animation compliant with real-time UI customizers.
4. **Seamless Loops:** Ensure animation paths, timings, and values wrap around to form a perfectly seamless perpetual cycle without jarring leaps or visual glitches.

---

## 🌟 Gold Standard Reference (Few-Shot Pattern)

When generating new animated SVGs, always model the styling structure after this clean, optimized pattern:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <style>
      /* Scoped custom variables easily readable by customizer parsers */
      svg {
        --primary-color: #3C95EA; /* Main Shape */
        --secondary-color: #FF9824; /* Accent Glow */
        --stroke-width: 4px; /* Outline Thickness */
        --animation-duration: 3s; /* Animation Speed */
        --curve: cubic-bezier(0.34, 1.56, 0.64, 1); /* Transition Curve */
        --animation-loop: infinite; /* Animation Iteration */
        --animation-direction: alternate; /* Play Direction */
      }

      /* Class stylings referencing CSS variables */
      .icon-element {
        fill: none;
        stroke: var(--primary-color);
        stroke-width: var(--stroke-width);
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .accent-element {
        fill: none;
        stroke: var(--secondary-color);
        stroke-width: var(--stroke-width);
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
      }

      /* Animated components with granular property scoping */
      .main-body {
        transform-origin: 50px 50px;
        animation-name: pulse-glow;
        animation-duration: var(--animation-duration);
        animation-timing-function: var(--curve);
        animation-iteration-count: var(--animation-loop);
        animation-direction: var(--animation-direction);
      }

      .sparkle {
        transform-origin: 80px 20px;
        animation-name: twinkle;
        animation-duration: var(--animation-duration);
        animation-timing-function: var(--curve);
        animation-iteration-count: var(--animation-loop);
        animation-direction: var(--animation-direction);
      }

      /* Keyframe declarations utilizing CSS variable bindings */
      @keyframes pulse-glow {
        0% {
          transform: scale(0.9) rotate(-5deg);
          stroke: var(--primary-color);
        }
        100% {
          transform: scale(1.1) rotate(5deg);
          stroke: var(--secondary-color);
        }
      }

      @keyframes twinkle {
        0%, 20% {
          transform: scale(0);
          opacity: 0;
        }
        60%, 100% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
    </style>
  </defs>

  <!-- SVG elements inside a 100x100 frame -->
  <g class="main-body">
    <polygon points="50,15 61,38 86,38 66,54 73,78 50,63 27,78 34,54 14,38 39,38" class="icon-element" />
  </g>
  
  <g class="sparkle">
    <path d="M 80,10 L 80,30 M 70,20 L 90,20" class="accent-element" />
  </g>
</svg>
```

---

## 📚 Reference Assets
For a complete, real-world verified example of the parameterization and motion design patterns, refer to:
*   [check.svg](file:///c:/Users/yamilayma/Desktop/animated-nice-icons/.agent/skills/animated-svg-generator/references/check.svg) (Draw-in and erase-out path animations utilizing CSS variables and standardized sizing).
