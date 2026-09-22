# Plan: 라이트모드/다크모드 지원

## Goal
Add a user-selectable light/dark appearance mode to the existing React/Vite web app. The selected mode must apply consistently across the current screens and controls, persist across reloads using the app's existing local-storage settings pattern, initialize safely for existing users, and remain accessible and usable at desktop and mobile widths. Done means the settings screen exposes the mode control, the document theme updates without navigation, reload preserves the choice, and automated checks cover both behavior and layout.

## Scope

### In scope
- Extend the existing client-side settings model in `apps/web/src/lib.ts` with a light/dark theme preference and a backward-compatible default.
- Apply the preference from `apps/web/src/main.tsx` to the document root, alongside the existing motion/effects data attributes.
- Add a localized settings control for selecting light or dark mode.
- Refactor the existing hard-coded palette in `apps/web/src/style.css` into theme tokens and add a light-theme override while preserving the current dark/pixel-terminal appearance as the default dark theme.
- Update visual/e2e coverage to exercise both modes and verify the preference survives reload.

### Explicitly out of scope
- System-following or three-way `system/light/dark` mode; the request is limited to light and dark modes.
- Server/account synchronization of the theme preference.
- Redesigning the pixel-terminal visual language, typography, layout, or unrelated settings.
- Changing game logic, persistence formats outside the settings object, or non-web packages.

## Phases

### Phase 1 — Settings contract and state application
**Changes**
- In `apps/web/src/lib.ts`, add a `theme: 'light' | 'dark'` field to `Settings` and set `settingsDefault.theme` to `'dark'` so existing users retain the current appearance. Keep the existing `read` fallback behavior so older serialized settings objects remain usable; normalize missing/invalid theme values at the state boundary if needed.
- In `apps/web/src/main.tsx`, apply `settings.theme` to `document.documentElement.dataset.theme` in the existing settings effect. Ensure the effect also writes the full settings object through `write('keybit.settings', settings)`, preserving the current local persistence convention.
- Add the theme control to the existing settings panel, using the same accessible control style and localization pattern as language and the existing switches. Use a two-option select or segmented control rather than introducing a new component; expose an explicit accessible label and make the current selection clear.
- Add Korean and English translation keys for the theme label and the light/dark option labels/description.

**Tests and verification**
- Add or extend a focused unit test if the current test setup can import the settings default/normalization; verify the default is dark and missing theme data does not break startup.
- Run `npm run check`.
- Manually verify the settings control changes `document.documentElement.dataset.theme` without a route change and writes `keybit.settings`.

### Phase 2 — Theme tokenization and visual implementation
**Changes**
- In `apps/web/src/style.css`, define semantic color variables for page background, panels, text, muted text, borders, controls, shadows, selected states, editor surfaces, status colors, and syntax accents. Map the existing palette to the dark theme so the current look is unchanged by default.
- Add a `[data-theme='light']` (or equivalent root selector matching the implementation from Phase 1) override with a readable high-contrast light palette. Replace hard-coded colors in the existing pixel-terminal overrides and any base rules that affect backgrounds, borders, shadows, text, buttons, editor/code surfaces, result states, and focus indicators with the semantic variables. Preserve fixed colors only where they are intentionally part of syntax/status semantics and verify contrast in both themes.
- Set `color-scheme` on the root according to the selected theme so native form controls/dialog rendering follows the selected appearance.
- Keep the dark theme visually identical to the current implementation wherever possible; reject a separate duplicated stylesheet because it would drift and has a larger maintenance surface.

**Tests and verification**
- Run `npm run check` and `npm run build`.
- Run the existing Playwright visual/layout test and inspect screenshots for `/`, `/daily`, `/battle`, `/records`, and `/settings` in both themes at desktop and mobile widths.
- Confirm no horizontal overflow and that focus-visible outlines remain visible in both themes.

### Phase 3 — Behavioral and regression coverage
**Changes**
- Extend `tests/e2e/visual.spec.ts` or add a narrowly scoped e2e test to set the theme through the settings UI, assert the root data attribute, reload, and assert the selection persists.
- Cover both explicit light and dark states on at least the settings and home routes; retain the existing viewport/route matrix so the new palette does not regress responsive behavior.
- If selectors are needed, use stable accessible labels/roles rather than implementation-specific class names.

**Tests and verification**
- Run `npm test`.
- Run `npm run test:e2e`.
- Run `npm run build` as the final production verification.

## Risks
- Existing saved settings objects do not contain `theme`; initialization must default them to dark without throwing or overwriting unrelated settings.
- Hard-coded colors may remain in lower sections of the large stylesheet, producing unreadable text or inconsistent borders in light mode; audit all color literals and inspect every screen.
- Native `select`, `dialog`, and input styling can remain dark unless `color-scheme` and explicit variables are applied.
- Syntax highlighting and status colors may lose contrast on light backgrounds; verify code previews, typing surfaces, errors, success states, and selected navigation.
- E2E tests may depend on seeded/local-storage state; use the existing initialization patterns and avoid coupling tests to generated screenshots.

## Assumptions
- The current dark pixel-terminal palette is the product's established baseline and remains the default for existing and new users.
- Theme is a local device preference, matching the existing language and settings persistence approach; no account sync is required.
- A two-option control is sufficient; system preference detection is intentionally not included.
- The settings object is a private local-storage contract, so adding an optional/missing field with a dark fallback is backward compatible.
- The implementation belongs in `apps/web/src/lib.ts`, `apps/web/src/main.tsx`, `apps/web/src/style.css`, and web e2e/localization tests only; no shared/server contract changes are needed.
- Existing test commands from `package.json` (`npm run check`, `npm run build`, `npm test`, and `npm run test:e2e`) are the verification commands the executor should use.
- A duplicated light stylesheet was considered and rejected in favor of semantic CSS variables plus one override, because the repository currently has one large stylesheet and this minimizes divergence.
- A three-state system option was considered and rejected because it introduces preference-resolution behavior not requested by the work item.

## Open questions
- None. The requested behavior and the existing code conventions are sufficient to implement without a product decision.

## Affected surface summary
- `apps/web/src/lib.ts`: settings type/default and translations.
- `apps/web/src/main.tsx`: settings initialization/application and settings UI.
- `apps/web/src/style.css`: theme variables, light override, and hard-coded palette replacements.
- `tests/e2e/visual.spec.ts` (or a nearby focused e2e test): persistence and both-theme regression coverage.
- No server, database, shared engine, or game-state changes.

## Completion criteria
- `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build` pass.
- Dark mode matches the current default appearance.
- Light mode is readable and consistent across all routes and major controls.
- The selected theme changes immediately, persists after reload, and is exposed through accessible controls.
- Existing users with no theme setting continue in dark mode without data loss.
