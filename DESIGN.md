---
version: "alpha"
name: "Starter Design System"
description: "Neutral baseline design guidance for projects that have not defined their own visual system."
colors:
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-muted: "#EEF2F7"
  text: "#172033"
  text-muted: "#5D6B82"
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  on-primary: "#FFFFFF"
typography:
  display:
    fontFamily: "Public Sans"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Public Sans"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Public Sans"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Public Sans"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  app-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
  surface-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 16px
  quiet-control:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: 8px
  primary-action:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  primary-action-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
---

# Design System

## Overview

- This is a starter visual system for projects that have not defined their own design rules yet.
- User-authored tokens, brand rules and later product decisions take precedence over this starter baseline.
- Keep durable color, typography, spacing, radius, component and interaction choices here so future UI work does not drift.

## Colors

- Use `canvas` for the page background, `surface` for panels and `surface-muted` for quiet controls or secondary regions.
- Keep primary actions on `primary` with `on-primary` text; use `primary-hover` for hover and active emphasis.
- Avoid introducing decorative gradients, random accent colors or single-hue palettes unless the product brand explicitly calls for them.

## Typography

- Use `display` only for true page-level emphasis, `title` for section and panel headings, `body` for readable content and `label` for controls.
- Preserve hierarchy through size, weight and spacing before adding extra colors or decoration.

## Layout

- Start with clear page structure: canvas, surfaces, primary action, secondary controls and readable content regions.
- Use the spacing scale consistently; dense operational screens can reduce vertical whitespace, while marketing or editorial surfaces can breathe more.
- On small screens, stack content in priority order and keep primary actions reachable without overlapping other UI.

## Components

- Buttons, inputs, cards, navigation and dialogs need default, hover, active, focus, disabled, loading and error states when they are user-facing.
- Use `surface-card` for contained groups, `quiet-control` for low-emphasis controls and `primary-action` for the main command.
- Prefer clear affordances, visible focus states and stable dimensions so labels, icons and dynamic text do not resize the layout.

## Do's and Don'ts

- Do use this file as the first design fact source before generating mockups, Figma screens or frontend UI.
- Do replace or extend this starter when the project has a real brand, product category or design system.
- Do keep accessibility, responsive behavior and interaction states explicit.
- Don't treat this starter as a user brand decision once project-specific rules exist.
- Don't add generic AI-looking hero gradients, oversized cards or decorative blobs unless the product direction asks for them.
