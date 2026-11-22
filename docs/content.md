# Practice content 2.0.0 / Battle content 3.0.0

The catalog contains 220 original function/method snippets: 10 intermediate (6–10 lines) and 10 advanced (8–14 lines) per language. Battle rain contains 330 original beginner/standard method or function calls: 15 per level in each of 11 languages. Each call occupies 2–3 source lines, with 24–40 target characters for beginner and 40–64 for standard; each target line is at most 28 characters. Standard examples compose calls or chain operations. Source indentation is displayed but omitted from the typing target; all targets are ASCII. Examples are displayed as text and are never executed by the game.

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

New practice settings use intermediate/advanced; legacy beginner/standard practice requests normalize to intermediate/advanced. Daily challenges always use intermediate, 60 seconds, and the date/language/content-version seed. Battle requests continue to accept only beginner/standard. New battle snippets and results use BATTLE_VERSION 3.0.0, independently of practice VERSION 2.0.0; historical results retain their original versions. Browser storage uses separate keybit.practiceDifficulty and keybit.battleDifficulty preferences, falling back to keybit.difficulty on first use. Historical result objects are never relabeled. Best comparisons include difficulty and content version.

## IME regression verification

Automated browser tests cover composition completion, missing completion, delayed final input, keyCode 229, blur/refocus, English recovery without lost/duplicate characters, all three modes, real displayed typo glyphs, overflow, backspace and server reattachment. These synthetic composition tests do not by themselves prove native OS IME behavior.

## Validation performed (2026-09-13)

- `npm test`: 34 unit/server/database/archive/latency checks passed.
- Browser checks: 27 existing/new regression cases across Chromium, Firefox and WebKit passed; the Firefox timed-practice case was rerun successfully after a development-server reload interrupted the first run. Three responsive screen checks (1440, 1280 and 390 widths) and one Chromium editing-protocol IME check also passed. The Chromium-only protocol check is intentionally skipped on Firefox/WebKit.
- The browser IME test drives `Input.imeSetComposition` through Chromium's editing engine and verifies composition draft preservation, ignored Korean commits, and exactly-once English input. Native macOS Ctrl+Space switching was exercised in Chrome for Testing, but an in-progress native Korean composition was not conclusively observed; that exact physical-input scenario remains a manual acceptance check for practice and battle.
- JavaScript, TypeScript, Python, C, C++, Java, Swift and Bash examples passed available local parser/type checks. Rust, Go and C# received source review; their compilers are not installed in this environment.
- `npm run build` passes. Vite reports a non-fatal >500 kB application chunk warning.
- Screenshots are under ignored `output/playwright/pixel-*` and `home-1280-*`.

## Battle call context and input

These are fragments inside a function or method, not standalone programs. Receivers,
arguments, and result variables are assumed to be declared with the types appropriate
to that example. Each example has its own scope (for example, a result can be a string,
number, collection, or boolean in different examples).

- JavaScript/TypeScript use ES2022 string, array, object, JSON, and numeric APIs.
- Python uses Python 3 built-ins, strings, lists, and dictionaries. Separators are nonempty.
- Java uses java.lang and java.util; C# uses System and System.Collections.Generic.
  Numeric input parses successfully, and IFormatProvider arguments are valid.
- Go uses strings, strconv, and fmt. Output variables are declared by the surrounding
  function; parse errors are returned in err. Count arguments are nonnegative.
- Rust uses std string and vector APIs. String receivers mutated by push_str are
  owned mutable Strings; names holds &str in the basic trim example and String in
  the lowercase example. Indices are usize, within range; repeated counts fit memory.
- Swift uses standard-library strings and arrays; call results have matching inferred
  types in the surrounding scope. Collection indices and counts are within bounds.
- C uses stdio.h, string.h, stdlib.h, math.h, and errno.h. Strings are NUL-terminated;
  the nested strchr/strrchr examples assume the requested delimiters exist. Copy and
  fill destinations have enough writable capacity, FILE pointers are valid, parsed
  numbers are valid and representable, and abs input excludes INT_MIN.
- C++17 uses string, vector, algorithm, and cmath. Sizes and indices are size_t;
  substring and mutation bounds are valid, numeric conversion input is valid, and
  integer abs inputs exclude the minimum representable value.
- Bash uses Bash 3.2+ commands with explicit backslash continuations and pipelines.
  Referenced files and variables belong to the surrounding shell context. Commands
  are only displayed by the game, never executed.

Enter inserts exactly one newline. The renderer supplies the next source line's
indentation automatically, including dedenting at the closing parenthesis. Leading
spaces are neither transmitted nor scored. Backspace over a newline returns the
cursor to the previous line; Escape clears the target buffer, and Up/Down select
another target only while the buffer is empty. Wrapping caused by viewport width
never introduces an input character. Existing IME composition protections remain.

For phases starting at 0/40/80 seconds, beginner spawn intervals are 6.75/6/5.25
seconds and fall times 24/22.5/21 seconds. Standard intervals are 6/5.25/4.5 seconds
and fall times 18/16.5/15 seconds. Attacks share the phase fall time. The 120-second
match, health, combo rules, attack warning/cooldown/cap, and tie-breakers are unchanged.

## Battle validation (2026-10-30)

- Content tests check all 330 snippets for counts per language/level, uniqueness,
  printable ASCII, line/character limits, calls, and target indentation removal.
- JavaScript and TypeScript fragments parse as JavaScript (they use its shared
  syntax). All Python fragments passed ast.parse; all Bash fragments passed bash -n.
- C99, C++17, Java, and Swift calls passed compiler checks in typed fixture functions
  with the context above (result assignments were omitted to infer return types).
- Go, Rust, and C# call syntax and API usage were reviewed; those toolchains are not
  installed in this workspace. Native OS IME switching remains a manual check.
- Engine and browser regressions cover timing boundaries, equal decks, newline
  accounting, attacks, Enter/dedent/Backspace, IME recovery, reconnect, and card
  visibility on desktop and mobile.
