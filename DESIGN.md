---
name: Exam Prep MVP
description: A calm product interface for turning personal study material into grounded certification practice.
colors:
  background-warm-parchment: "oklch(0.978 0.008 80)"
  background-warm-parchment-deep: "oklch(0.954 0.01 84)"
  surface-quiet-paper: "oklch(0.992 0.004 80)"
  surface-study-mist: "oklch(0.968 0.009 200)"
  border-soft-sand: "oklch(0.88 0.012 82)"
  text-ink-navy: "oklch(0.285 0.02 240)"
  text-muted-slate: "oklch(0.49 0.018 220)"
  primary-study-teal: "oklch(0.58 0.105 198)"
  primary-study-teal-strong: "oklch(0.49 0.11 198)"
  success-verified-green: "oklch(0.62 0.11 150)"
  warning-focus-amber: "oklch(0.72 0.13 80)"
  danger-review-red: "oklch(0.58 0.18 25)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 700
    lineHeight: 1.2
  eyebrow:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "24px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary-study-teal}"
    textColor: "{colors.surface-quiet-paper}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface-study-mist}"
    textColor: "{colors.text-ink-navy}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.surface-quiet-paper}"
    textColor: "{colors.text-ink-navy}"
    rounded: "{rounded.sm}"
    padding: "11px 12px"
  status-pill:
    backgroundColor: "{colors.surface-study-mist}"
    textColor: "{colors.text-muted-slate}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "34px"
---

# Design System: Exam Prep MVP

## 1. Overview

**Creative North Star: "The Quiet Study Desk"**

The interface should feel like a clean, well-lit study surface: calm, organized, and precise. The product is not trying to entertain the user. It is helping an individual learner turn trusted source material into focused certification practice.

The visual system is restrained by default. Warm paper neutrals carry most of the surface, with study teal reserved for primary action and active navigation. Technical details stay available, but the main experience should explain progress in plain language and keep the learner moving through Sources, Generate, Review, and History.

It explicitly rejects busy LMS dashboards, enterprise admin panels, cluttered upload portals, and generic AI SaaS layouts. Dribbble and Behance are valid references for polish and spacing, but the app must remain a usable product, not a decorative concept shot.

**Key Characteristics:**
- Warm, readable, low-noise surfaces.
- One clear primary action per workflow moment.
- Source visibility before generation.
- Interactive review states that feel deliberate, not game-like.
- Technical depth on demand, never as the default screen.

## 2. Colors

The palette is warm-neutral and study-focused: paper-like backgrounds, inked navy text, and a disciplined teal accent for action and selection.

### Primary
- **Study Teal** (`primary-study-teal`): Use for the main action button, active tab, selected source emphasis, and core interactive affordances.
- **Deep Study Teal** (`primary-study-teal-strong`): Use when the primary accent needs more authority, especially hover, pressed, or compact emphasis states.

### Tertiary
- **Verified Green** (`success-verified-green`): Use for correct answers, ready status, completed states, and positive verification.
- **Focus Amber** (`warning-focus-amber`): Use sparingly for caution or in-progress states that need attention without alarm.
- **Review Red** (`danger-review-red`): Use only for failed jobs, destructive local actions, upload errors, and incorrect answers.

### Neutral
- **Warm Parchment** (`background-warm-parchment`): Page background. It gives the product a study-room warmth without looking yellowed or old.
- **Deep Warm Parchment** (`background-warm-parchment-deep`): Lower end of the page gradient, used to create subtle depth without adding visual noise.
- **Quiet Paper** (`surface-quiet-paper`): Main panels, cards, inputs, and elevated surfaces.
- **Study Mist** (`surface-study-mist`): Secondary buttons, pills, hints, technical details, and muted state containers.
- **Soft Sand Border** (`border-soft-sand`): Thin dividers and low-contrast boundaries.
- **Ink Navy** (`text-ink-navy`): Primary text and strong labels.
- **Muted Slate** (`text-muted-slate`): Supporting copy, labels, metadata, and secondary descriptions.

### Named Rules

**The Teal Earns Attention Rule.** Study Teal is for action, selection, and progress. Do not spread it across decorative backgrounds.

**The Paper Before Panels Rule.** Use tonal contrast first. Add borders and shadows only when the user needs structural separation.

## 3. Typography

**Display Font:** System UI sans stack.
**Body Font:** System UI sans stack.
**Label/Mono Font:** System UI for labels, system monospace for technical details.

**Character:** The type is pragmatic and composed. It should read like a high-quality productivity tool, not a marketing page or a classroom worksheet.

### Hierarchy
- **Display** (700, `1.6rem`, `1.15`): App title and the highest-level product context.
- **Headline** (700, `1.35rem`, `1.2`): Primary section titles such as Material sources, Generate exam, Review, and Saved exam history.
- **Title** (700, `1rem`, `1.3`): Card titles, question labels, source titles, and job rows.
- **Body** (400, `1rem`, `1.5`): Explanatory copy and question prompts. Keep long explanatory text around 65 to 75 characters per line.
- **Label** (700, `0.9rem`, `1.2`): Form labels and field descriptions.
- **Eyebrow** (800, `0.74rem`, `0.08em`, uppercase): Small context labels such as Exam Prep Phase 2. Use rarely.

### Named Rules

**The Study Voice Rule.** Use direct labels and short sentences. Do not make headings repeat the paragraph below them.

**The Calm Hierarchy Rule.** Use weight and spacing before dramatic type size jumps. This is a product workspace, not a landing page hero.

## 4. Elevation

The system uses a hybrid of tonal layering, thin borders, and one ambient shadow. Surfaces should feel placed on a desk rather than floating above it. Depth is structural, not decorative.

### Shadow Vocabulary
- **Ambient Panel Shadow** (`0 18px 42px rgba(33, 47, 58, 0.07)`): Use on top-level panels, side panels, and the header shell. It should never become dark, sharp, or dramatic.

### Named Rules

**The Desk Surface Rule.** If a container looks like a floating SaaS card, it is too elevated. Reduce the shadow, rely on the border, or use tonal separation.

## 5. Components

### Buttons

- **Shape:** Soft rectangular corners (8px).
- **Primary:** Study Teal background, Quiet Paper text, 40px minimum height, compact horizontal padding.
- **Hover / Focus:** Add a clear focus ring and slight tonal shift. Do not animate layout properties.
- **Secondary / Ghost:** Secondary buttons sit on Study Mist with Ink Navy text. Ghost buttons are transparent and should be reserved for low-commitment actions.
- **Danger:** Use Review Red only for destructive or failure-related actions. Keep it quiet unless the action is irreversible.

### Chips

- **Style:** Pills use Study Mist, Soft Sand Border, Ink Navy or Muted Slate text, and 999px radius.
- **State:** Selected chips should use restrained teal tinting. Do not use saturated filled chips for every selected source.

### Cards / Containers

- **Corner Style:** Soft rectangular corners (8px).
- **Background:** Quiet Paper for primary containers, Study Mist for secondary or explanation blocks.
- **Shadow Strategy:** Use the Ambient Panel Shadow only on major shells. Inner items rely on borders and tonal fills.
- **Border:** Soft Sand Border, 1px.
- **Internal Padding:** Use 16px for inner cards and 20px to 24px for major panels.

### Inputs / Fields

- **Style:** Quiet Paper background, Soft Sand Border, 8px radius, 11px to 12px internal padding.
- **Focus:** Use an obvious keyboard-visible outline or border shift in Study Teal.
- **Error / Disabled:** Error text uses Review Red. Disabled controls lower opacity but must remain legible.

### Navigation

Tabs are compact product navigation, not marketing pills. The active tab uses Study Teal and Quiet Paper text. Inactive tabs use Quiet Paper, Soft Sand Border, and Ink Navy text. On smaller screens, tabs wrap naturally and keep the same interaction model.

### Review Question

Question cards are the signature learning surface. Choices are full-width action buttons with selected, correct, and incorrect states. Hint and answer panels use Study Mist and Verified Green tinting so learning feedback feels calm rather than punitive.

## 6. Do's and Don'ts

### Do:

- **Do** show selected source material clearly before generation.
- **Do** keep the Sources, Generate, Review, and History path visible and predictable.
- **Do** use Study Teal only for action, active state, and selection.
- **Do** keep technical details available behind disclosure controls.
- **Do** use keyboard-visible focus states on buttons, tabs, inputs, choices, and summaries.
- **Do** keep motion reduced-motion friendly and limited to opacity, transform, or color transitions.

### Don't:

- **Don't** create busy LMS dashboards.
- **Don't** create enterprise admin panels.
- **Don't** create cluttered upload portals.
- **Don't** use generic AI SaaS layouts with excessive gradients, glass effects, or repeated identical cards.
- **Don't** turn Dribbble or Behance polish into decorative concept UI that weakens the workflow.
- **Don't** use gradient text, side-stripe card borders, or glassmorphism as default styling.
- **Don't** hide source status or selected materials when the user is about to generate an exam.
