# Practice content 2.0.0

The catalog contains 220 original function/method snippets: 10 intermediate (6–10 lines) and 10 advanced (8–14 lines) per language. Rain retains 330 short beginner/standard fragments. Source indentation is displayed but omitted from the typing target; all targets are ASCII. Examples are displayed as text and are never executed by the game.

## Dependencies and input contracts

- JavaScript: ES2022; fetch, AbortSignal and timers are browser/modern Node globals. TypeScript adds strict generic interfaces to the same algorithms. Object helpers accept records with the named fields. Interval endpoints are ordered; width/size values are positive integers. Memoizers and stores are synchronous; Go memoizers are intended for single-goroutine use.
- Python: Python 3; standard-library imports are inside the relevant functions. `atomic_write` accepts a pathlib.Path whose parent exists. Graph traversal keys must be hashable. Merge inputs are sorted.
- C: C99 or newer. Arrays have nonnegative counts within their allocated bounds; arithmetic inputs and totals fit the return type. `heap_push` requires a valid min-heap and space for one additional element. Intersection requires sorted inputs and an output buffer large enough for the result. `majority_candidate` uses -1 for no majority, so values must be nonnegative. Clamping requires low <= high.
- C++: C++17 with `<vector>` and `<string>`. Same algorithm contracts as C. Mutable vectors must be sized, not merely reserved, for all indexed writes.
- Java / C#: methods belong inside a class; the array and integer contracts above apply. No external libraries are needed.
- Go: Go 1.18+; use package declaration and imports `context`, `time`, `sync`, `fmt` for the functions that reference them. The channel forwarding helper owns closing its output channel.
- Rust: Rust 2021; only std is needed. Collection and integer algorithms assume totals fit i32; clamp requires an ordered bound pair.
- Swift: Swift 5.7+ with standard concurrency support; no external modules. Arithmetic results must fit Int. Memoized closures are not shared across actors; concurrentMap requires Sendable values.
- Bash: Bash 3.2+ and standard macOS/POSIX utilities; not zsh. Bytewise URL encoding uses LC_ALL=C. Arrays and process substitution require Bash. `unique_sorted` expects sorted stdin. Atomic writes intentionally produce mode 600. Temporary/lock helpers operate on paths supplied by their caller. Examples must only be executed with disposable test paths during validation.

## Compatibility

New practice settings use intermediate/advanced; legacy beginner/standard practice requests normalize to intermediate/advanced. Daily challenges always use intermediate, 60 seconds, and the date/language/content-version seed. Battle requests continue to accept only beginner/standard. Browser storage uses separate keybit.practiceDifficulty and keybit.battleDifficulty preferences, falling back to keybit.difficulty on first use. Historical result objects are never relabeled. Best comparisons include difficulty and content version.

## IME regression verification

Automated browser tests cover composition completion, missing completion, delayed final input, keyCode 229, blur/refocus, English recovery without lost/duplicate characters, all three modes, real displayed typo glyphs, overflow, backspace and server reattachment. These synthetic composition tests do not by themselves prove native OS IME behavior.

## Validation performed (2026-09-13)

- `npm test`: 34 unit/server/database/archive/latency checks passed.
- Browser checks: 27 existing/new regression cases across Chromium, Firefox and WebKit passed; the Firefox timed-practice case was rerun successfully after a development-server reload interrupted the first run. Three responsive screen checks (1440, 1280 and 390 widths) and one Chromium editing-protocol IME check also passed. The Chromium-only protocol check is intentionally skipped on Firefox/WebKit.
- The browser IME test drives `Input.imeSetComposition` through Chromium's editing engine and verifies composition draft preservation, ignored Korean commits, and exactly-once English input. Native macOS Ctrl+Space switching was exercised in Chrome for Testing, but an in-progress native Korean composition was not conclusively observed; that exact physical-input scenario remains a manual acceptance check for practice and battle.
- JavaScript, TypeScript, Python, C, C++, Java, Swift and Bash examples passed available local parser/type checks. Rust, Go and C# received source review; their compilers are not installed in this environment.
- `npm run build` passes. Vite reports a non-fatal >500 kB application chunk warning.
- Screenshots are under ignored `output/playwright/pixel-*` and `home-1280-*`.
