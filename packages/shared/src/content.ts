export const LANGUAGES = [
  'javascript',
  'typescript',
  'java',
  'rust',
  'go',
  'python',
  'c',
  'cpp',
  'csharp',
  'swift',
  'bash',
] as const;
export type Language = (typeof LANGUAGES)[number];
export type Difficulty = 'beginner' | 'standard';
export const LANGUAGE_NAMES: Record<Language, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  rust: 'Rust',
  go: 'Go',
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  swift: 'Swift',
  bash: 'Bash',
};
export const EXTENSIONS: Record<Language, string> = {
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  rust: 'rs',
  go: 'go',
  python: 'py',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  swift: 'swift',
  bash: 'sh',
};
export type Snippet = {
  id: string;
  language: Language;
  difficulty: Difficulty;
  kind: 'block' | 'rain';
  source: string;
  target: string;
  version: string;
};
export const VERSION = '1.0.0';
export const targetOf = (source: string) =>
  source
    .split('\n')
    .map((line) => line.replace(/^ +/, ''))
    .join('\n');
const basics: Record<Language, string[]> = {
  javascript: [
    'const score = 42;',
    'let total = 100;',
    'const ready = true;',
    'const bits = [1, 0];',
    'let count = 0;',
    'const name = "keybit";',
    'const limit = 60;',
    'let streak = 3;',
    'const speed = 240;',
    'const lives = 5;',
  ],
  typescript: [
    'const score: number = 42;',
    'let total: number = 100;',
    'const ready: boolean = true;',
    'const bits: number[] = [1, 0];',
    'let count: number = 0;',
    'const name: string = "keybit";',
    'const limit: number = 60;',
    'let streak: number = 3;',
    'const speed: number = 240;',
    'const lives: number = 5;',
  ],
  java: [
    'int score = 42;',
    'int total = 100;',
    'boolean ready = true;',
    'int[] bits = {1, 0};',
    'int count = 0;',
    'String name = "keybit";',
    'int limit = 60;',
    'int streak = 3;',
    'int speed = 240;',
    'int lives = 5;',
  ],
  rust: [
    'let score = 42;',
    'let total = 100;',
    'let ready = true;',
    'let bits = [1, 0];',
    'let mut count = 0;',
    'let name = "keybit";',
    'let limit = 60;',
    'let streak = 3;',
    'let speed = 240;',
    'let lives = 5;',
  ],
  go: [
    'score := 42',
    'total := 100',
    'ready := true',
    'bits := []int{1, 0}',
    'count := 0',
    'name := "keybit"',
    'limit := 60',
    'streak := 3',
    'speed := 240',
    'lives := 5',
  ],
  python: [
    'score = 42',
    'total = 100',
    'ready = True',
    'bits = [1, 0]',
    'count = 0',
    'name = "keybit"',
    'limit = 60',
    'streak = 3',
    'speed = 240',
    'lives = 5',
  ],
  c: [
    'int score = 42;',
    'int total = 100;',
    'int ready = 1;',
    'int bits[] = {1, 0};',
    'int count = 0;',
    'char name[] = "keybit";',
    'int limit = 60;',
    'int streak = 3;',
    'int speed = 240;',
    'int lives = 5;',
  ],
  cpp: [
    'int score = 42;',
    'auto total = 100;',
    'bool ready = true;',
    'int bits[] = {1, 0};',
    'int count = 0;',
    'auto name = "keybit";',
    'int limit = 60;',
    'int streak = 3;',
    'int speed = 240;',
    'int lives = 5;',
  ],
  csharp: [
    'int score = 42;',
    'var total = 100;',
    'bool ready = true;',
    'int[] bits = {1, 0};',
    'int count = 0;',
    'string name = "keybit";',
    'int limit = 60;',
    'int streak = 3;',
    'int speed = 240;',
    'int lives = 5;',
  ],
  swift: [
    'let score = 42',
    'var total = 100',
    'let ready = true',
    'let bits = [1, 0]',
    'var count = 0',
    'let name = "keybit"',
    'let limit = 60',
    'let streak = 3',
    'let speed = 240',
    'let lives = 5',
  ],
  bash: [
    'score=42',
    'total=100',
    'ready=true',
    'bits=(1 0)',
    'count=0',
    'name="keybit"',
    'limit=60',
    'streak=3',
    'speed=240',
    'lives=5',
  ],
};
const advanced: Record<Language, string[]> = {
  javascript: [
    'const sum = values.reduce((a, b) => a + b, 0);',
    'const active = users.filter(user => user.active);',
    'const names = users.map(user => user.name);',
    'const unique = [...new Set(values)];',
    'const sorted = [...values].sort((a, b) => a - b);',
    'const result = await Promise.resolve(42);',
    'const config = { ...defaults, timeout: 1000 };',
    'const found = values.find(value => value > 10);',
    'const valid = values.every(value => value >= 0);',
    'const message = `Hello, ${name}!`;',
  ],
  typescript: [
    'const sum: number = values.reduce((a, b) => a + b, 0);',
    'const active = users.filter(user => user.active);',
    'const names: string[] = users.map(user => user.name);',
    'const unique = [...new Set<number>(values)];',
    'const sorted = [...values].sort((a, b) => a - b);',
    'const result: number = await Promise.resolve(42);',
    'const config = { ...defaults, timeout: 1000 };',
    'const found = values.find(value => value > 10);',
    'const valid: boolean = values.every(value => value >= 0);',
    'const message: string = `Hello, ${name}!`;',
  ],
  java: [
    'int sum = values.stream().mapToInt(Integer::intValue).sum();',
    'var active = users.stream().filter(User::isActive).toList();',
    'var names = users.stream().map(User::getName).toList();',
    'var unique = new HashSet<>(values);',
    'values.sort(Integer::compareTo);',
    'var result = CompletableFuture.completedFuture(42);',
    'var config = new HashMap<String, Integer>();',
    'var found = values.stream().filter(v -> v > 10).findFirst();',
    'boolean valid = values.stream().allMatch(v -> v >= 0);',
    'String message = String.format("Hello, %s!", name);',
  ],
  rust: [
    'let sum: i32 = values.iter().sum();',
    'let active: Vec<_> = users.iter().filter(|u| u.active).collect();',
    'let names: Vec<_> = users.iter().map(|u| &u.name).collect();',
    'let unique: HashSet<_> = values.iter().collect();',
    'let mut sorted = values.clone();',
    'let result: Result<i32, &str> = Ok(42);',
    'let mut config = HashMap::new();',
    'let found = values.iter().find(|&&v| v > 10);',
    'let valid = values.iter().all(|&v| v >= 0);',
    'let message = format!("Hello, {}!", name);',
  ],
  go: [
    'sum := 0\nfor _, value := range values {\n    sum += value\n}',
    'active := make([]User, 0)\nfor _, user := range users {\n    if user.Active { active = append(active, user) }\n}',
    'names := make([]string, len(users))',
    'unique := make(map[int]bool)',
    'sorted := append([]int(nil), values...)',
    'result := make(chan int, 1)',
    'config := map[string]int{"timeout": 1000}',
    'found := slices.Contains(values, 42)',
    'valid := len(values) > 0',
    'message := fmt.Sprintf("Hello, %s!", name)',
  ],
  python: [
    'total = sum(value for value in values)',
    'active = [user for user in users if user.active]',
    'names = [user.name for user in users]',
    'unique = list(set(values))',
    'ordered = sorted(values, reverse=True)',
    'result = {"status": "ok", "score": 42}',
    'config = {**defaults, "timeout": 1000}',
    'found = next((v for v in values if v > 10), None)',
    'valid = all(value >= 0 for value in values)',
    'message = f"Hello, {name}!"',
  ],
  c: [
    'int sum = 0;\nfor (int i = 0; i < size; i++) {\n    sum += values[i];\n}',
    'int active = ready && lives > 0;',
    'char names[3][16] = {"Ada", "Lin", "Ken"};',
    'int unique[3] = {1, 2, 3};',
    'int sorted[3] = {10, 20, 30};',
    'int result = score > 0 ? score : 0;',
    'struct Config { int timeout; int retries; };',
    'int found = -1;\nfor (int i = 0; i < size; i++) {\n    if (values[i] == 42) found = i;\n}',
    'int valid = size > 0 && values != NULL;',
    'char message[64];\nsnprintf(message, sizeof(message), "Hello, %s!", name);',
  ],
  cpp: [
    'int sum = std::accumulate(values.begin(), values.end(), 0);',
    'bool active = ready && lives > 0;',
    'std::vector<std::string> names = {"Ada", "Lin", "Ken"};',
    'std::set<int> unique(values.begin(), values.end());',
    'std::sort(values.begin(), values.end());',
    'auto result = std::max(score, 0);',
    'std::map<std::string, int> config = {{"timeout", 1000}};',
    'auto found = std::find(values.begin(), values.end(), 42);',
    'bool valid = std::all_of(values.begin(), values.end(), [](int v) { return v >= 0; });',
    'std::string message = "Hello, " + name + "!";',
  ],
  csharp: [
    'int sum = values.Sum();',
    'var active = users.Where(user => user.Active).ToList();',
    'var names = users.Select(user => user.Name).ToList();',
    'var unique = values.Distinct().ToList();',
    'var sorted = values.OrderBy(value => value).ToList();',
    'var result = await Task.FromResult(42);',
    'var config = new Dictionary<string, int> { ["timeout"] = 1000 };',
    'var found = values.FirstOrDefault(value => value > 10);',
    'bool valid = values.All(value => value >= 0);',
    'string message = $"Hello, {name}!";',
  ],
  swift: [
    'let sum = values.reduce(0, +)',
    'let active = users.filter { $0.active }',
    'let names = users.map { $0.name }',
    'let unique = Array(Set(values))',
    'let sorted = values.sorted(by: <)',
    'let result: Result<Int, Error> = .success(42)',
    'let config = ["timeout": 1000, "retries": 3]',
    'let found = values.first { $0 > 10 }',
    'let valid = values.allSatisfy { $0 >= 0 }',
    'let message = "Hello, \\(name)!"',
  ],
  bash: [
    'sum=0\nfor value in "${values[@]}"; do\n    sum=$((sum + value))\ndone',
    'if [ "$ready" = true ]; then\n    printf "%s\\n" "ready"\nfi',
    'names=("Ada" "Lin" "Ken")',
    'unique=$(printf "%s\\n" "${values[@]}" | sort -u)',
    'sorted=$(printf "%s\\n" "${values[@]}" | sort -n)',
    'result=$((score > 0 ? score : 0))',
    'timeout=1000\nretries=3',
    'found=$(printf "%s\\n" "${values[@]}" | grep -m 1 "42")',
    'if [ "${#values[@]}" -gt 0 ]; then\n    valid=true\nfi',
    'message="Hello, ${name}!"',
  ],
};
// Original teaching fragments, not full executable programs. No code is executed by keybit.
function block(lang: Language, i: number, hard: boolean) {
  const rows = basics[lang];
  if (!hard) {
    let s = [rows[i], rows[(i + 3) % 10], rows[(i + 6) % 10]].join('\n');
    if (s.length < 40)
      s +=
        '\n' +
        (lang === 'bash'
          ? `printf "%s\\n" "$${['score', 'total', 'count', 'limit', 'speed'][i % 5]}"`
          : rows[(i + 8) % 10]);
    return s;
  }
  let s = [rows[i], advanced[lang][i]].join('\n');
  if (targetOf(s).length < 100) {
    const text = 'checkpoint ready: type carefully and keep your fingers moving';
    const filler =
      lang === 'bash'
        ? `checkpoint="${text}"`
        : lang === 'python'
          ? `checkpoint = "${text}"`
          : lang === 'go'
            ? `checkpoint := "${text}"`
            : lang === 'swift'
              ? `let checkpoint = "${text}"`
              : lang === 'rust'
                ? `let checkpoint = "${text}";`
                : lang === 'java'
                  ? `String checkpoint = "${text}";`
                  : lang === 'c'
                    ? `char checkpoint[] = "${text}";`
                    : lang === 'cpp'
                      ? `const auto checkpoint = "${text}";`
                      : lang === 'csharp'
                        ? `string checkpoint = "${text}";`
                        : `const checkpoint = "${text}";`;
    s += '\n' + filler;
  }
  return s;
}
function rain(lang: Language, hard: boolean): string[] {
  const semicolon = !['python', 'go', 'swift', 'bash'].includes(lang);
  const end = semicolon ? ';' : '';
  const names = ['score', 'total', 'count', 'limit', 'speed'];
  if (lang === 'bash')
    return names.flatMap((n, i) =>
      hard
        ? [`${n}=$((\$${n} + ${i + 1}))`, `echo "\$${n} bits"`, `printf "%s" "\$${n}"`]
        : [`${n}=$((1 + ${i}))`, `echo "$${n}"`, `${n}="ready"`],
    );
  const result = names.flatMap((n, i) =>
    hard
      ? [`${n} = ${n} + ${i + 10}${end}`, `${n} = ${n} * 2${end}`, `${n} = ${n} - 1${end}`]
      : [`${n} = ${i + 10}${end}`, `${n} = 100${end}`, `${n} = 42${end}`],
  );
  return result;
}
export const SNIPPETS: Snippet[] = LANGUAGES.flatMap((language) =>
  (['beginner', 'standard'] as const).flatMap((difficulty) => [
    ...Array.from({ length: 10 }, (_, i) => {
      const source = block(language, i, difficulty === 'standard');
      return {
        id: `${language}-${difficulty}-block-${i}`,
        language,
        difficulty,
        kind: 'block' as const,
        source,
        target: targetOf(source),
        version: VERSION,
      };
    }),
    ...rain(language, difficulty === 'standard').map((source, i) => ({
      id: `${language}-${difficulty}-rain-${i}`,
      language,
      difficulty,
      kind: 'rain' as const,
      source,
      target: source,
      version: VERSION,
    })),
  ]),
);
export function hash(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function shuffled<T>(items: T[], seed: string): T[] {
  let h = hash(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function deck(lang: Language, difficulty: Difficulty, kind: 'block' | 'rain', seed: string) {
  return shuffled(
    SNIPPETS.filter((s) => s.language === lang && s.difficulty === difficulty && s.kind === kind),
    seed,
  );
}
export function dayKey(now = Date.now()) {
  return new Date(now + 9 * 3600000).toISOString().slice(0, 10);
}
export function dayBefore(day: string) {
  return new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
}
export function streaks(days: string[], today = dayKey()) {
  const unique = [...new Set(days)].sort();
  let longest = 0,
    run = 0,
    last = '';
  for (const d of unique) {
    run = last === dayBefore(d) ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = d;
  }
  let current = 0;
  let d = unique.includes(today) ? today : dayBefore(today);
  while (unique.includes(d)) {
    current++;
    d = dayBefore(d);
  }
  return { current, longest };
}
