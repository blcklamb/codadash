import type { Language, PracticeDifficulty } from './content';

// Original practice functions. See docs/content.md for dependencies and contracts.
export const BLOCKS: Record<Language, Record<PracticeDifficulty, string[]>> = {
  javascript: {
    intermediate: [
      `function groupByStatus(items) {
  const groups = new Map();
  for (const item of items) {
    const group = groups.get(item.status) ?? [];
    group.push(item);
    groups.set(item.status, group);
  }
  return groups;
}`,
      `function chunk(values, size) {
  if (size < 1) throw new RangeError("size");
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}`,
      `function countWords(text) {
  const counts = new Map();
  for (const word of text.toLowerCase().match(/\\w+/g) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}`,
      `function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}`,
      `function parsePort(value) {
  if (!/^\\d+$/.test(value)) return null;
  const port = Number(value);
  if (port < 1 || port > 65535) {
    return null;
  }
  return port;
}`,
      `function movingAverage(values, width) {
  if (width < 1) throw new RangeError("width");
  let sum = 0;
  return values.map((value, i) => {
    sum += value - (i >= width ? values[i - width] : 0);
    return sum / Math.min(i + 1, width);
  });
}`,
      `function indexRows(rows) {
  const result = Object.create(null);
  for (const row of rows) {
    if (!row.id) continue;
    result[row.id] = { ...row };
  }
  return result;
}`,
      `function partition(values, predicate) {
  const accepted = [], rejected = [];
  for (const value of values) {
    (predicate(value) ? accepted : rejected).push(value);
  }
  return [accepted, rejected];
}`,
      `function mergeCounts(left, right) {
  const merged = new Map(left);
  for (const [key, count] of right) {
    merged.set(key, (merged.get(key) ?? 0) + count);
  }
  return merged;
}`,
      `function commonValues(left, right) {
  const available = new Set(right);
  const result = new Set();
  for (const value of left) {
    if (available.has(value)) result.add(value);
  }
  return [...result];
}`,
    ],
    advanced: [
      `async function retry(task, attempts = 3) {
  if (attempts < 1) throw new RangeError("attempts");
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt + 1 === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    }
  }
}`,
      `function lowerBound(values, target) {
  let left = 0, right = values.length;
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (values[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left;
}`,
      `function memoize(fn) {
  const cache = new Map();
  return (key) => {
    if (cache.has(key)) return cache.get(key);
    const result = fn(key);
    cache.set(key, result);
    return result;
  };
}`,
      `function debounce(fn, delay) {
  let timer;
  function schedule(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }
  schedule.cancel = () => clearTimeout(timer);
  return schedule;
}`,
      `function* windows(values, size) {
  if (size < 1) throw new RangeError("size");
  const queue = [];
  for (const value of values) {
    queue.push(value);
    if (queue.length > size) queue.shift();
    if (queue.length === size) yield [...queue];
  }
}`,
      `async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}\`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new TypeError("Expected JSON");
  return response.json();
}`,
      `function breadthFirst(graph, start) {
  const queue = [start], visited = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    for (const next of graph.get(queue[head]) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return queue;
}`,
      `function mergeIntervals(intervals) {
  const sorted = intervals.map(([a, b]) => [a, b]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (!last || last[1] < interval[0]) merged.push(interval);
    else last[1] = Math.max(last[1], interval[1]);
  }
  return merged;
}`,
      `async function* paginate(load) {
  let cursor;
  const seen = new Set();
  do {
    const page = await load(cursor);
    yield* page.items;
    cursor = page.next;
    if (cursor && seen.has(cursor)) throw new Error("Repeated cursor");
    if (cursor) seen.add(cursor);
  } while (cursor);
}`,
      `function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (next) => {
      if (Object.is(state, next)) return;
      state = next;
      for (const listener of [...listeners]) listener(state);
    },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}`,
    ],
  },
  typescript: {
    intermediate: [
      `function groupByStatus<T extends { status: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.status) ?? [];
    group.push(item);
    groups.set(item.status, group);
  }
  return groups;
}`,
      `function chunk<T>(values: T[], size: number) {
  if (size < 1) throw new RangeError("size");
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}`,
      `function countWords(text: string) {
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().match(/\\w+/g) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}`,
      `function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}`,
      `function parsePort(value: string) {
  if (!/^\\d+$/.test(value)) return null;
  const port = Number(value);
  if (port < 1 || port > 65535) {
    return null;
  }
  return port;
}`,
      `function movingAverage(values: number[], width: number) {
  if (width < 1) throw new RangeError("width");
  let sum = 0;
  return values.map((value, i) => {
    sum += value - (i >= width ? values[i - width] : 0);
    return sum / Math.min(i + 1, width);
  });
}`,
      `function indexRows<T extends { id: string }>(rows: T[]) {
  const result: Record<string, T> = Object.create(null);
  for (const row of rows) {
    if (!row.id) continue;
    result[row.id] = { ...row };
  }
  return result;
}`,
      `function partition<T>(values: T[], predicate: (value: T) => boolean) {
  const accepted: T[] = [], rejected: T[] = [];
  for (const value of values) {
    (predicate(value) ? accepted : rejected).push(value);
  }
  return [accepted, rejected];
}`,
      `function mergeCounts(left: Map<string, number>, right: Map<string, number>) {
  const merged = new Map(left);
  for (const [key, count] of right) {
    merged.set(key, (merged.get(key) ?? 0) + count);
  }
  return merged;
}`,
      `function commonValues<T>(left: T[], right: T[]) {
  const available = new Set(right);
  const result = new Set<T>();
  for (const value of left) {
    if (available.has(value)) result.add(value);
  }
  return [...result];
}`,
    ],
    advanced: [
      `async function retry<T>(task: () => Promise<T>, attempts = 3) {
  if (attempts < 1) throw new RangeError("attempts");
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt + 1 === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    }
  }
}`,
      `function lowerBound(values: number[], target: number) {
  let left = 0, right = values.length;
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (values[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left;
}`,
      `function memoize<K, V>(fn: (key: K) => V) {
  const cache = new Map<K, V>();
  return (key: K) => {
    if (cache.has(key)) return cache.get(key);
    const result = fn(key);
    cache.set(key, result);
    return result;
  };
}`,
      `function debounce<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  function schedule(...args: A) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }
  schedule.cancel = () => clearTimeout(timer);
  return schedule;
}`,
      `function* windows<T>(values: Iterable<T>, size: number) {
  if (size < 1) throw new RangeError("size");
  const queue: T[] = [];
  for (const value of values) {
    queue.push(value);
    if (queue.length > size) queue.shift();
    if (queue.length === size) yield [...queue];
  }
}`,
      `async function fetchJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}\`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new TypeError("Expected JSON");
  return response.json();
}`,
      `function breadthFirst<T>(graph: Map<T, T[]>, start: T) {
  const queue = [start], visited = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    for (const next of graph.get(queue[head]) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return queue;
}`,
      `function mergeIntervals(intervals: [number, number][]) {
  const sorted = intervals.map(([a, b]): [number, number] => [a, b]).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (!last || last[1] < interval[0]) merged.push(interval);
    else last[1] = Math.max(last[1], interval[1]);
  }
  return merged;
}`,
      `async function* paginate<T>(load: (cursor?: string) => Promise<{ items: T[]; next?: string }>) {
  let cursor: string | undefined;
  const seen = new Set();
  do {
    const page = await load(cursor);
    yield* page.items;
    cursor = page.next;
    if (cursor && seen.has(cursor)) throw new Error("Repeated cursor");
    if (cursor) seen.add(cursor);
  } while (cursor);
}`,
      `function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<(state: T) => void>();
  return {
    get: () => state,
    set: (next: T) => {
      if (Object.is(state, next)) return;
      state = next;
      for (const listener of [...listeners]) listener(state);
    },
    subscribe: (listener: (state: T) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}`,
    ],
  },
  python: {
    intermediate: [
      `def group_by_status(items):
    groups = {}
    for item in items:
        status = item["status"]
        groups.setdefault(status, []).append(item)
    return groups`,
      `def chunk(values, size):
    if size < 1:
        raise ValueError("size must be positive")
    for start in range(0, len(values), size):
        end = min(start + size, len(values))
        yield values[start:end]`,
      `def count_words(text):
    counts = {}
    for word in text.lower().split():
        word = word.strip(".,!?:;")
        if word:
            counts[word] = counts.get(word, 0) + 1
    return sorted(counts.items(), key=lambda pair: -pair[1])`,
      `def unique_by_id(items):
    seen = set()
    for item in items:
        if item["id"] in seen:
            continue
        seen.add(item["id"])
        yield item`,
      `def parse_port(value):
    if not value.isascii() or not value.isdecimal():
        return None
    port = int(value)
    if 1 <= port <= 65535:
        return port
    return None`,
      `def moving_average(values, width):
    if width < 1:
        raise ValueError("width")
    total = 0
    for index, value in enumerate(values):
        total += value
        if index >= width:
            total -= values[index - width]
        yield total / min(index + 1, width)`,
      `def index_rows(rows):
    result = {}
    for row in rows:
        if row.get("id"):
            result[row["id"]] = dict(row)
    return result`,
      `def partition(values, predicate):
    accepted, rejected = [], []
    for value in values:
        bucket = accepted if predicate(value) else rejected
        bucket.append(value)
    return accepted, rejected`,
      `def merge_counts(left, right):
    merged = dict(left)
    for key, count in right.items():
        previous = merged.get(key, 0)
        merged[key] = previous + count
    return merged`,
      `def common_values(left, right):
    available, seen = set(right), set()
    for value in left:
        if value in available and value not in seen:
            seen.add(value)
            yield value`,
    ],
    advanced: [
      `async def retry(task, attempts=3):
    import asyncio
    if attempts < 1:
        raise ValueError("attempts")
    for attempt in range(attempts):
        try:
            return await task()
        except OSError:
            if attempt + 1 == attempts:
                raise
            await asyncio.sleep(0.1 * 2 ** attempt)`,
      `def lower_bound(values, target):
    left, right = 0, len(values)
    while left < right:
        middle = left + (right - left) // 2
        if values[middle] < target:
            left = middle + 1
        else:
            right = middle
    return left`,
      `def memoize(function):
    from functools import wraps
    cache = {}
    @wraps(function)
    def wrapped(key):
        if key not in cache:
            cache[key] = function(key)
        return cache[key]
    return wrapped`,
      `def atomic_write(path, text):
    import os
    from tempfile import NamedTemporaryFile
    temporary = None
    try:
        with NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as file:
            temporary = file.name
            file.write(text)
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)`,
      `def windows(values, size):
    from collections import deque
    if size < 1:
        raise ValueError("size")
    window = deque(maxlen=size)
    for value in values:
        window.append(value)
        if len(window) == size:
            yield tuple(window)`,
      `def merge_sorted(left, right):
    left, right = iter(left), iter(right)
    sentinel = object()
    a, b = next(left, sentinel), next(right, sentinel)
    while a is not sentinel or b is not sentinel:
        if b is sentinel or (a is not sentinel and a <= b):
            yield a
            a = next(left, sentinel)
        else:
            yield b
            b = next(right, sentinel)`,
      `def breadth_first(graph, start):
    from collections import deque
    queue, visited = deque([start]), {start}
    while queue:
        node = queue.popleft()
        yield node
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)`,
      `def merge_intervals(intervals):
    merged = []
    for start, end in sorted(intervals):
        if not merged or merged[-1][1] < start:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return merged`,
      `async def paginate(load):
    cursor, seen = None, set()
    while True:
        page = await load(cursor)
        for item in page["items"]:
            yield item
        cursor = page.get("next")
        if not cursor:
            return
        if cursor in seen:
            raise ValueError("Repeated cursor")
        seen.add(cursor)`,
      `def topological_sort(graph):
    visited, active, order = set(), set(), []
    def visit(node):
        if node in active:
            raise ValueError("Cycle")
        if node in visited:
            return
        active.add(node)
        for child in graph.get(node, []):
            visit(child)
        active.remove(node)
        visited.add(node); order.append(node)
    for node in graph: visit(node)
    return order[::-1]`,
    ],
  },
  c: {
    intermediate: [
      `int compact_positive(int *values, int count) {
    int written = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] <= 0) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `int prefix_sum(int *values, int count) {
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += values[i];
        values[i] = total;
    }
    return total;
}`,
      `int count_runs(const int *values, int count) {
    if (count == 0) return 0;
    int runs = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] != values[i - 1]) runs++;
    }
    return runs;
}`,
      `int unique_sorted(int *values, int count) {
    if (count == 0) return 0;
    int written = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] == values[written - 1]) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `int parse_port(const char *text) {
    int port = 0;
    if (*text == '\\0') return -1;
    for (int i = 0; text[i] != '\\0'; i++) {
        if (text[i] < '0' || text[i] > '9') return -1;
        port = port * 10 + text[i] - '0';
        if (port > 65535) return -1;
    }
    return port > 0 ? port : -1;
}`,
      `void reverse_range(int *values, int count) {
    int left = 0, right = count - 1;
    while (left < right) {
        int saved = values[left];
        values[left++] = values[right];
        values[right--] = saved;
    }
}`,
      `int is_sorted(const int *values, int count) {
    for (int i = 1; i < count; i++) {
        if (values[i] < values[i - 1]) {
            return 0;
        }
    }
    return 1;
}`,
      `int partition_even(int *values, int count) {
    int boundary = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] % 2 != 0) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    return boundary;
}`,
      `int count_bits(unsigned int value) {
    int count = 0;
    while (value != 0) {
        value &= value - 1;
        count++;
    }
    return count;
}`,
      `int clamp_values(int *values, int count, int low, int high) {
    int changed = 0;
    for (int i = 0; i < count; i++) {
        int value = values[i];
        values[i] = value < low ? low : value > high ? high : value;
        if (value != values[i]) changed++;
    }
    return changed;
}`,
    ],
    advanced: [
      `int lower_bound(const int *values, int count, int target) {
    int left = 0, right = count;
    while (left < right) {
        int middle = left + (right - left) / 2;
        if (values[middle] < target) left = middle + 1;
        else right = middle;
    }
    return left;
}`,
      `void insertion_sort(int *values, int count) {
    for (int i = 1; i < count; i++) {
        int value = values[i], j = i;
        while (j > 0 && values[j - 1] > value) {
            values[j] = values[j - 1];
            j--;
        }
        values[j] = value;
    }
}`,
      `int max_subarray(const int *values, int count) {
    if (count == 0) return 0;
    int current = values[0], best = current;
    for (int i = 1; i < count; i++) {
        current = current > 0 ? current + values[i] : values[i];
        if (current > best) best = current;
    }
    return best;
}`,
      `int partition_pivot(int *values, int count) {
    if (count < 1) return -1;
    int pivot = values[count - 1], boundary = 0;
    for (int i = 0; i < count - 1; i++) {
        if (values[i] > pivot) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    values[count - 1] = values[boundary];
    values[boundary] = pivot;
    return boundary;
}`,
      `int merge_sorted(const int *left, int n, const int *right, int m, int *out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] <= right[j]) out[written++] = left[i++];
        else out[written++] = right[j++];
    }
    while (i < n) out[written++] = left[i++];
    while (j < m) out[written++] = right[j++];
    return written;
}`,
      `int two_sum_sorted(const int *values, int count, int target) {
    int left = 0, right = count - 1;
    while (left < right) {
        long long sum = (long long)values[left] + values[right];
        if (sum == target) return 1;
        if (sum < target) left++;
        else right--;
    }
    return 0;
}`,
      `int max_window_sum(const int *values, int count, int width) {
    if (width < 1 || width > count) return 0;
    int sum = 0;
    for (int i = 0; i < width; i++) sum += values[i];
    int best = sum;
    for (int i = width; i < count; i++) {
        sum += values[i] - values[i - width];
        if (sum > best) best = sum;
    }
    return best;
}`,
      `int heap_push(int *heap, int count, int value) {
    int child = count;
    while (child > 0) {
        int parent = (child - 1) / 2;
        if (heap[parent] <= value) break;
        heap[child] = heap[parent];
        child = parent;
    }
    heap[child] = value;
    return count + 1;
}`,
      `int majority_candidate(const int *values, int count) {
    int candidate = 0, votes = 0;
    for (int i = 0; i < count; i++) {
        if (votes == 0) candidate = values[i];
        votes += values[i] == candidate ? 1 : -1;
    }
    votes = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] == candidate) votes++;
    }
    return votes > count / 2 ? candidate : -1;
}`,
      `int compact_intersection(const int *left, int n, const int *right, int m, int *out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] < right[j]) i++;
        else if (right[j] < left[i]) j++;
        else {
            out[written++] = left[i++];
            j++;
        }
    }
    return written;
}`,
    ],
  },
  cpp: {
    intermediate: [
      `int compact_positive(std::vector<int>& values, int count) {
    int written = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] <= 0) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `int prefix_sum(std::vector<int>& values, int count) {
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += values[i];
        values[i] = total;
    }
    return total;
}`,
      `int count_runs(const std::vector<int>& values, int count) {
    if (count == 0) return 0;
    int runs = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] != values[i - 1]) runs++;
    }
    return runs;
}`,
      `int unique_sorted(std::vector<int>& values, int count) {
    if (count == 0) return 0;
    int written = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] == values[written - 1]) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `int parse_port(const std::string& text) {
    int port = 0;
    if (text.empty()) return -1;
    for (int i = 0; i < static_cast<int>(text.size()); i++) {
        if (text[i] < '0' || text[i] > '9') return -1;
        port = port * 10 + text[i] - '0';
        if (port > 65535) return -1;
    }
    return port > 0 ? port : -1;
}`,
      `void reverse_range(std::vector<int>& values, int count) {
    int left = 0, right = count - 1;
    while (left < right) {
        int saved = values[left];
        values[left++] = values[right];
        values[right--] = saved;
    }
}`,
      `int is_sorted(const std::vector<int>& values, int count) {
    for (int i = 1; i < count; i++) {
        if (values[i] < values[i - 1]) {
            return 0;
        }
    }
    return 1;
}`,
      `int partition_even(std::vector<int>& values, int count) {
    int boundary = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] % 2 != 0) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    return boundary;
}`,
      `int count_bits(unsigned int value) {
    int count = 0;
    while (value != 0) {
        value &= value - 1;
        count++;
    }
    return count;
}`,
      `int clamp_values(std::vector<int>& values, int count, int low, int high) {
    int changed = 0;
    for (int i = 0; i < count; i++) {
        int value = values[i];
        values[i] = value < low ? low : value > high ? high : value;
        if (value != values[i]) changed++;
    }
    return changed;
}`,
    ],
    advanced: [
      `int lower_bound(const std::vector<int>& values, int count, int target) {
    int left = 0, right = count;
    while (left < right) {
        int middle = left + (right - left) / 2;
        if (values[middle] < target) left = middle + 1;
        else right = middle;
    }
    return left;
}`,
      `void insertion_sort(std::vector<int>& values, int count) {
    for (int i = 1; i < count; i++) {
        int value = values[i], j = i;
        while (j > 0 && values[j - 1] > value) {
            values[j] = values[j - 1];
            j--;
        }
        values[j] = value;
    }
}`,
      `int max_subarray(const std::vector<int>& values, int count) {
    if (count == 0) return 0;
    int current = values[0], best = current;
    for (int i = 1; i < count; i++) {
        current = current > 0 ? current + values[i] : values[i];
        if (current > best) best = current;
    }
    return best;
}`,
      `int partition_pivot(std::vector<int>& values, int count) {
    if (count < 1) return -1;
    int pivot = values[count - 1], boundary = 0;
    for (int i = 0; i < count - 1; i++) {
        if (values[i] > pivot) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    values[count - 1] = values[boundary];
    values[boundary] = pivot;
    return boundary;
}`,
      `int merge_sorted(const std::vector<int>& left, int n, const std::vector<int>& right, int m, std::vector<int>& out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] <= right[j]) out[written++] = left[i++];
        else out[written++] = right[j++];
    }
    while (i < n) out[written++] = left[i++];
    while (j < m) out[written++] = right[j++];
    return written;
}`,
      `int two_sum_sorted(const std::vector<int>& values, int count, int target) {
    int left = 0, right = count - 1;
    while (left < right) {
        long long sum = (long long)values[left] + values[right];
        if (sum == target) return 1;
        if (sum < target) left++;
        else right--;
    }
    return 0;
}`,
      `int max_window_sum(const std::vector<int>& values, int count, int width) {
    if (width < 1 || width > count) return 0;
    int sum = 0;
    for (int i = 0; i < width; i++) sum += values[i];
    int best = sum;
    for (int i = width; i < count; i++) {
        sum += values[i] - values[i - width];
        if (sum > best) best = sum;
    }
    return best;
}`,
      `int heap_push(std::vector<int>& heap, int count, int value) {
    int child = count;
    while (child > 0) {
        int parent = (child - 1) / 2;
        if (heap[parent] <= value) break;
        heap[child] = heap[parent];
        child = parent;
    }
    heap[child] = value;
    return count + 1;
}`,
      `int majority_candidate(const std::vector<int>& values, int count) {
    int candidate = 0, votes = 0;
    for (int i = 0; i < count; i++) {
        if (votes == 0) candidate = values[i];
        votes += values[i] == candidate ? 1 : -1;
    }
    votes = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] == candidate) votes++;
    }
    return votes > count / 2 ? candidate : -1;
}`,
      `int compact_intersection(const std::vector<int>& left, int n, const std::vector<int>& right, int m, std::vector<int>& out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] < right[j]) i++;
        else if (right[j] < left[i]) j++;
        else {
            out[written++] = left[i++];
            j++;
        }
    }
    return written;
}`,
    ],
  },
  java: {
    intermediate: [
      `static int compact_positive(int[] values, int count) {
    int written = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] <= 0) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `static int prefix_sum(int[] values, int count) {
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += values[i];
        values[i] = total;
    }
    return total;
}`,
      `static int count_runs(int[] values, int count) {
    if (count == 0) return 0;
    int runs = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] != values[i - 1]) runs++;
    }
    return runs;
}`,
      `static int unique_sorted(int[] values, int count) {
    if (count == 0) return 0;
    int written = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] == values[written - 1]) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `static int parse_port(String text) {
    int port = 0;
    if (text.isEmpty()) return -1;
    for (int i = 0; i < text.length(); i++) {
        if (text.charAt(i) < '0' || text.charAt(i) > '9') return -1;
        port = port * 10 + text.charAt(i) - '0';
        if (port > 65535) return -1;
    }
    return port > 0 ? port : -1;
}`,
      `static void reverse_range(int[] values, int count) {
    int left = 0, right = count - 1;
    while (left < right) {
        int saved = values[left];
        values[left++] = values[right];
        values[right--] = saved;
    }
}`,
      `static int is_sorted(int[] values, int count) {
    for (int i = 1; i < count; i++) {
        if (values[i] < values[i - 1]) {
            return 0;
        }
    }
    return 1;
}`,
      `static int partition_even(int[] values, int count) {
    int boundary = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] % 2 != 0) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    return boundary;
}`,
      `static int count_bits(int value) {
    int count = 0;
    while (value != 0) {
        value &= value - 1;
        count++;
    }
    return count;
}`,
      `static int clamp_values(int[] values, int count, int low, int high) {
    int changed = 0;
    for (int i = 0; i < count; i++) {
        int value = values[i];
        values[i] = value < low ? low : value > high ? high : value;
        if (value != values[i]) changed++;
    }
    return changed;
}`,
    ],
    advanced: [
      `static int lower_bound(int[] values, int count, int target) {
    int left = 0, right = count;
    while (left < right) {
        int middle = left + (right - left) / 2;
        if (values[middle] < target) left = middle + 1;
        else right = middle;
    }
    return left;
}`,
      `static void insertion_sort(int[] values, int count) {
    for (int i = 1; i < count; i++) {
        int value = values[i], j = i;
        while (j > 0 && values[j - 1] > value) {
            values[j] = values[j - 1];
            j--;
        }
        values[j] = value;
    }
}`,
      `static int max_subarray(int[] values, int count) {
    if (count == 0) return 0;
    int current = values[0], best = current;
    for (int i = 1; i < count; i++) {
        current = current > 0 ? current + values[i] : values[i];
        if (current > best) best = current;
    }
    return best;
}`,
      `static int partition_pivot(int[] values, int count) {
    if (count < 1) return -1;
    int pivot = values[count - 1], boundary = 0;
    for (int i = 0; i < count - 1; i++) {
        if (values[i] > pivot) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    values[count - 1] = values[boundary];
    values[boundary] = pivot;
    return boundary;
}`,
      `static int merge_sorted(int[] left, int n, int[] right, int m, int[] out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] <= right[j]) out[written++] = left[i++];
        else out[written++] = right[j++];
    }
    while (i < n) out[written++] = left[i++];
    while (j < m) out[written++] = right[j++];
    return written;
}`,
      `static int two_sum_sorted(int[] values, int count, int target) {
    int left = 0, right = count - 1;
    while (left < right) {
        long sum = (long)values[left] + values[right];
        if (sum == target) return 1;
        if (sum < target) left++;
        else right--;
    }
    return 0;
}`,
      `static int max_window_sum(int[] values, int count, int width) {
    if (width < 1 || width > count) return 0;
    int sum = 0;
    for (int i = 0; i < width; i++) sum += values[i];
    int best = sum;
    for (int i = width; i < count; i++) {
        sum += values[i] - values[i - width];
        if (sum > best) best = sum;
    }
    return best;
}`,
      `static int heap_push(int[] heap, int count, int value) {
    int child = count;
    while (child > 0) {
        int parent = (child - 1) / 2;
        if (heap[parent] <= value) break;
        heap[child] = heap[parent];
        child = parent;
    }
    heap[child] = value;
    return count + 1;
}`,
      `static int majority_candidate(int[] values, int count) {
    int candidate = 0, votes = 0;
    for (int i = 0; i < count; i++) {
        if (votes == 0) candidate = values[i];
        votes += values[i] == candidate ? 1 : -1;
    }
    votes = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] == candidate) votes++;
    }
    return votes > count / 2 ? candidate : -1;
}`,
      `static int compact_intersection(int[] left, int n, int[] right, int m, int[] out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] < right[j]) i++;
        else if (right[j] < left[i]) j++;
        else {
            out[written++] = left[i++];
            j++;
        }
    }
    return written;
}`,
    ],
  },
  csharp: {
    intermediate: [
      `static int compact_positive(int[] values, int count) {
    int written = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] <= 0) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `static int prefix_sum(int[] values, int count) {
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += values[i];
        values[i] = total;
    }
    return total;
}`,
      `static int count_runs(int[] values, int count) {
    if (count == 0) return 0;
    int runs = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] != values[i - 1]) runs++;
    }
    return runs;
}`,
      `static int unique_sorted(int[] values, int count) {
    if (count == 0) return 0;
    int written = 1;
    for (int i = 1; i < count; i++) {
        if (values[i] == values[written - 1]) continue;
        values[written++] = values[i];
    }
    return written;
}`,
      `static int parse_port(string text) {
    int port = 0;
    if (text.Length == 0) return -1;
    for (int i = 0; i < text.Length; i++) {
        if (text[i] < '0' || text[i] > '9') return -1;
        port = port * 10 + text[i] - '0';
        if (port > 65535) return -1;
    }
    return port > 0 ? port : -1;
}`,
      `static void reverse_range(int[] values, int count) {
    int left = 0, right = count - 1;
    while (left < right) {
        int saved = values[left];
        values[left++] = values[right];
        values[right--] = saved;
    }
}`,
      `static int is_sorted(int[] values, int count) {
    for (int i = 1; i < count; i++) {
        if (values[i] < values[i - 1]) {
            return 0;
        }
    }
    return 1;
}`,
      `static int partition_even(int[] values, int count) {
    int boundary = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] % 2 != 0) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    return boundary;
}`,
      `static int count_bits(uint value) {
    int count = 0;
    while (value != 0) {
        value &= value - 1;
        count++;
    }
    return count;
}`,
      `static int clamp_values(int[] values, int count, int low, int high) {
    int changed = 0;
    for (int i = 0; i < count; i++) {
        int value = values[i];
        values[i] = value < low ? low : value > high ? high : value;
        if (value != values[i]) changed++;
    }
    return changed;
}`,
    ],
    advanced: [
      `static int lower_bound(int[] values, int count, int target) {
    int left = 0, right = count;
    while (left < right) {
        int middle = left + (right - left) / 2;
        if (values[middle] < target) left = middle + 1;
        else right = middle;
    }
    return left;
}`,
      `static void insertion_sort(int[] values, int count) {
    for (int i = 1; i < count; i++) {
        int value = values[i], j = i;
        while (j > 0 && values[j - 1] > value) {
            values[j] = values[j - 1];
            j--;
        }
        values[j] = value;
    }
}`,
      `static int max_subarray(int[] values, int count) {
    if (count == 0) return 0;
    int current = values[0], best = current;
    for (int i = 1; i < count; i++) {
        current = current > 0 ? current + values[i] : values[i];
        if (current > best) best = current;
    }
    return best;
}`,
      `static int partition_pivot(int[] values, int count) {
    if (count < 1) return -1;
    int pivot = values[count - 1], boundary = 0;
    for (int i = 0; i < count - 1; i++) {
        if (values[i] > pivot) continue;
        int saved = values[boundary];
        values[boundary++] = values[i];
        values[i] = saved;
    }
    values[count - 1] = values[boundary];
    values[boundary] = pivot;
    return boundary;
}`,
      `static int merge_sorted(int[] left, int n, int[] right, int m, int[] out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] <= right[j]) out[written++] = left[i++];
        else out[written++] = right[j++];
    }
    while (i < n) out[written++] = left[i++];
    while (j < m) out[written++] = right[j++];
    return written;
}`,
      `static int two_sum_sorted(int[] values, int count, int target) {
    int left = 0, right = count - 1;
    while (left < right) {
        long sum = (long)values[left] + values[right];
        if (sum == target) return 1;
        if (sum < target) left++;
        else right--;
    }
    return 0;
}`,
      `static int max_window_sum(int[] values, int count, int width) {
    if (width < 1 || width > count) return 0;
    int sum = 0;
    for (int i = 0; i < width; i++) sum += values[i];
    int best = sum;
    for (int i = width; i < count; i++) {
        sum += values[i] - values[i - width];
        if (sum > best) best = sum;
    }
    return best;
}`,
      `static int heap_push(int[] heap, int count, int value) {
    int child = count;
    while (child > 0) {
        int parent = (child - 1) / 2;
        if (heap[parent] <= value) break;
        heap[child] = heap[parent];
        child = parent;
    }
    heap[child] = value;
    return count + 1;
}`,
      `static int majority_candidate(int[] values, int count) {
    int candidate = 0, votes = 0;
    for (int i = 0; i < count; i++) {
        if (votes == 0) candidate = values[i];
        votes += values[i] == candidate ? 1 : -1;
    }
    votes = 0;
    for (int i = 0; i < count; i++) {
        if (values[i] == candidate) votes++;
    }
    return votes > count / 2 ? candidate : -1;
}`,
      `static int compact_intersection(int[] left, int n, int[] right, int m, int[] out) {
    int i = 0, j = 0, written = 0;
    while (i < n && j < m) {
        if (left[i] < right[j]) i++;
        else if (right[j] < left[i]) j++;
        else {
            out[written++] = left[i++];
            j++;
        }
    }
    return written;
}`,
    ],
  },
  go: {
    intermediate: [
      `func compactPositive(values []int) []int {
    out := values[:0]
    for _, value := range values {
        if value > 0 { out = append(out, value) }
    }
    return out
}`,
      `func prefixSum(values []int) []int {
    out := make([]int, len(values))
    total := 0
    for i, value := range values {
        total += value
        out[i] = total
    }
    return out
}`,
      `func countRuns(values []int) int {
    if len(values) == 0 { return 0 }
    runs := 1
    for i := 1; i < len(values); i++ {
        if values[i] != values[i-1] { runs++ }
    }
    return runs
}`,
      `func unique(values []int) []int {
    seen := make(map[int]bool)
    out := make([]int, 0, len(values))
    for _, value := range values {
        if seen[value] { continue }
        seen[value] = true
        out = append(out, value)
    }
    return out
}`,
      `func parsePort(text string) (int, bool) {
    port := 0
    if text == "" { return 0, false }
    for _, digit := range text {
        if digit < '0' || digit > '9' { return 0, false }
        port = port * 10 + int(digit - '0')
        if port > 65535 { return 0, false }
    }
    return port, port > 0
}`,
      `func reverse(values []int) {
    left, right := 0, len(values)-1
    for left < right {
        values[left], values[right] = values[right], values[left]
        left++
        right--
    }
}`,
      `func isSorted(values []int) bool {
    for i := 1; i < len(values); i++ {
        if values[i] < values[i-1] {
            return false
        }
    }
    return true
}`,
      `func partition(values []int) ([]int, []int) {
    even, odd := []int{}, []int{}
    for _, value := range values {
        if value%2 == 0 { even = append(even, value) } else { odd = append(odd, value) }
    }
    return even, odd
}`,
      `func mergeCounts(left, right map[string]int) map[string]int {
    out := make(map[string]int, len(left)+len(right))
    for key, count := range left { out[key] = count }
    for key, count := range right {
        out[key] += count
    }
    return out
}`,
      `func clamp(values []int, low, high int) {
    for i, value := range values {
        if value < low {
            values[i] = low
        }
        if value > high { values[i] = high }
    }
}`,
    ],
    advanced: [
      `func lowerBound(values []int, target int) int {
    left, right := 0, len(values)
    for left < right {
        middle := left + (right-left)/2
        if values[middle] < target {
            left = middle+1
        } else { right = middle }
    }
    return left
}`,
      `func insertionSort(values []int) {
    for i := 1; i < len(values); i++ {
        value, j := values[i], i
        for j > 0 && values[j-1] > value {
            values[j] = values[j-1]
            j--
        }
        values[j] = value
    }
}`,
      `func maxSubarray(values []int) (int, bool) {
    if len(values) == 0 { return 0, false }
    current, best := values[0], values[0]
    for _, value := range values[1:] {
        if current > 0 { current += value } else { current = value }
        if current > best { best = current }
    }
    return best, true
}`,
      `func memoize[K comparable, V any](fn func(K) V) func(K) V {
    cache := make(map[K]V)
    return func(key K) V {
        if value, ok := cache[key]; ok { return value }
        value := fn(key)
        cache[key] = value
        return value
    }
}`,
      `func forward(ctx context.Context, input <-chan int, output chan<- int) {
    defer close(output)
    for {
        select {
        case <-ctx.Done(): return
        case value, ok := <-input:
            if !ok { return }
            select {
            case output <- value:
            case <-ctx.Done(): return
            }
        }
    }
}`,
      `func retry(ctx context.Context, task func() error) error {
    var err error
    for attempt := 0; attempt < 3; attempt++ {
        if err = ctx.Err(); err != nil { return err }
        if err = task(); err == nil { return nil }
        if attempt == 2 { break }
        timer := time.NewTimer(time.Duration(1<<attempt) * time.Second)
        select {
        case <-ctx.Done(): timer.Stop(); return ctx.Err()
        case <-timer.C:
        }
    }
    return err
}`,
      `func breadthFirst(graph map[int][]int, start int) []int {
    queue, seen := []int{start}, map[int]bool{start: true}
    for head := 0; head < len(queue); head++ {
        for _, next := range graph[queue[head]] {
            if seen[next] { continue }
            seen[next] = true
            queue = append(queue, next)
        }
    }
    return queue
}`,
      `func mergeSorted(left, right []int) []int {
    out := make([]int, 0, len(left)+len(right))
    i, j := 0, 0
    for i < len(left) && j < len(right) {
        if left[i] <= right[j] { out = append(out, left[i]); i++ } else { out = append(out, right[j]); j++ }
    }
    out = append(out, left[i:]...)
    return append(out, right[j:]...)
}`,
      `func mapValues[T, R any](values []T, transform func(T) (R, error)) ([]R, error) {
    result := make([]R, 0, len(values))
    for _, value := range values {
        mapped, err := transform(value)
        if err != nil { return nil, err }
        result = append(result, mapped)
    }
    return result, nil
}`,
      `func withLock(mu *sync.Mutex, update func() error) (err error) {
    mu.Lock()
    defer mu.Unlock()
    defer func() {
        if recovered := recover(); recovered != nil {
            err = fmt.Errorf("update panic: %v", recovered)
        }
    }()
    return update()
}`,
    ],
  },
  rust: {
    intermediate: [
      `fn compact_positive(values: &mut Vec<i32>) -> usize {
    values.retain(|value| {
        let positive = *value > 0;
        positive
    });
    values.len()
}`,
      `fn prefix_sum(values: &[i32]) -> Vec<i32> {
    let mut total = 0;
    values.iter().map(|value| {
        total += value;
        total
    }).collect()
}`,
      `fn count_runs(values: &[i32]) -> usize {
    if values.is_empty() { return 0; }
    let changes = values.windows(2)
        .filter(|pair| pair[0] != pair[1])
        .count();
    changes + 1
}`,
      `fn unique(values: &[i32]) -> Vec<i32> {
    let mut seen = std::collections::HashSet::new();
    values.iter().copied().filter(|value| {
        let first = seen.insert(*value);
        first
    }).collect()
}`,
      `fn parse_port(text: &str) -> Option<u16> {
    if text.is_empty() || !text.bytes().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let port = text.parse::<u16>().ok()?;
    (port > 0).then_some(port)
}`,
      `fn reverse(values: &mut [i32]) {
    let mut right = values.len();
    for left in 0..values.len() / 2 {
        right -= 1;
        values.swap(left, right);
    }
}`,
      `fn is_sorted(values: &[i32]) -> bool {
    for pair in values.windows(2) {
        if pair[0] > pair[1] {
            return false;
        }
    }
    true
}`,
      `fn partition(values: &[i32]) -> (Vec<i32>, Vec<i32>) {
    let (even, odd) = values.iter()
        .copied()
        .partition(|value| value % 2 == 0);
    let result = (even, odd);
    result
}`,
      `fn count_bits(mut value: u32) -> u32 {
    let mut count = 0;
    while value != 0 {
        value &= value - 1;
        count += 1;
    }
    count
}`,
      `fn clamp(values: &mut [i32], low: i32, high: i32) {
    assert!(low <= high);
    for value in values {
        let bounded = (*value).clamp(low, high);
        *value = bounded;
    }
}`,
    ],
    advanced: [
      `fn lower_bound(values: &[i32], target: i32) -> usize {
    let (mut left, mut right) = (0, values.len());
    while left < right {
        let middle = left + (right - left) / 2;
        if values[middle] < target { left = middle + 1; }
        else { right = middle; }
    }
    left
}`,
      `fn insertion_sort(values: &mut [i32]) {
    for i in 1..values.len() {
        let mut j = i;
        while j > 0 && values[j - 1] > values[j] {
            values.swap(j, j - 1);
            j -= 1;
        }
    }
}`,
      `fn max_subarray(values: &[i32]) -> Option<i32> {
    let (&first, rest) = values.split_first()?;
    let (mut current, mut best) = (first, first);
    for &value in rest {
        current = value.max(current + value);
        best = best.max(current);
    }
    Some(best)
}`,
      `fn memoize<K, V, F>(mut function: F) -> impl FnMut(K) -> V
where K: Eq + std::hash::Hash + Clone, V: Clone, F: FnMut(&K) -> V {
    let mut cache = std::collections::HashMap::new();
    move |key| {
        cache.entry(key.clone())
            .or_insert_with(|| function(&key))
            .clone()
    }
}`,
      `fn decode_hex(text: &str) -> Result<Vec<u8>, &'static str> {
    if !text.is_ascii() || text.len() % 2 != 0 {
        return Err("Invalid hex length");
    }
    (0..text.len()).step_by(2)
        .map(|i| u8::from_str_radix(&text[i..i + 2], 16)
            .map_err(|_| "Invalid hex digit"))
        .collect()
}`,
      `fn two_sum_sorted(values: &[i32], target: i64) -> bool {
    if values.len() < 2 { return false; }
    let (mut left, mut right) = (0, values.len() - 1);
    while left < right {
        let sum = i64::from(values[left]) + i64::from(values[right]);
        match sum.cmp(&target) {
            std::cmp::Ordering::Equal => return true,
            std::cmp::Ordering::Less => left += 1,
            std::cmp::Ordering::Greater => right -= 1,
        }
    }
    false
}`,
      `fn breadth_first(graph: &[Vec<usize>], start: usize) -> Vec<usize> {
    let mut queue = std::collections::VecDeque::from([start]);
    let mut seen = std::collections::HashSet::from([start]);
    let mut order = Vec::new();
    while let Some(node) = queue.pop_front() {
        order.push(node);
        for &next in graph.get(node).into_iter().flatten() {
            if seen.insert(next) { queue.push_back(next); }
        }
    }
    order
}`,
      `fn merge_intervals(mut intervals: Vec<(i32, i32)>) -> Vec<(i32, i32)> {
    intervals.sort_unstable();
    let mut merged: Vec<(i32, i32)> = Vec::new();
    for (start, end) in intervals {
        match merged.last_mut() {
            Some(last) if last.1 >= start => last.1 = last.1.max(end),
            _ => merged.push((start, end)),
        }
    }
    merged
}`,
      `fn parse_rows(lines: &[&str]) -> Result<Vec<(String, u32)>, String> {
    lines.iter().enumerate().map(|(index, line)| {
        let (key, value) = line.split_once(':')
            .ok_or_else(|| format!("Missing colon at {}", index))?;
        let count = value.trim().parse::<u32>()
            .map_err(|error| format!("Line {}: {}", index, error))?;
        Ok((key.trim().to_owned(), count))
    }).collect()
}`,
      `fn take_matching<T, F>(values: &mut Vec<T>, mut predicate: F) -> Vec<T>
where F: FnMut(&T) -> bool {
    let mut taken = Vec::new();
    let mut kept = Vec::with_capacity(values.len());
    for value in values.drain(..) {
        if predicate(&value) { taken.push(value); }
        else { kept.push(value); }
    }
    *values = kept;
    taken
}`,
    ],
  },
  swift: {
    intermediate: [
      `func compactPositive(_ values: [Int]) -> [Int] {
    var output: [Int] = []
    for value in values where value > 0 {
        output.append(value)
    }
    return output
}`,
      `func prefixSum(_ values: [Int]) -> [Int] {
    var total = 0
    return values.map { value in
        total += value
        return total
    }
}`,
      `func countRuns(_ values: [Int]) -> Int {
    guard !values.isEmpty else { return 0 }
    var runs = 1
    for index in values.indices.dropFirst() {
        if values[index] != values[index - 1] { runs += 1 }
    }
    return runs
}`,
      `func unique<T: Hashable>(_ values: [T]) -> [T] {
    var seen = Set<T>()
    return values.filter { value in
        let result = seen.insert(value)
        return result.inserted
    }
}`,
      `func parsePort(_ text: String) -> UInt16? {
    guard !text.isEmpty else { return nil }
    guard text.utf8.allSatisfy({ $0 >= 48 && $0 <= 57 }),
          let port = UInt16(text), port > 0 else { return nil }
    return port
}`,
      `func reverse(_ values: inout [Int]) {
    var right = values.count
    for left in 0..<(values.count / 2) {
        right -= 1
        values.swapAt(left, right)
    }
}`,
      `func isSorted(_ values: [Int]) -> Bool {
    for index in values.indices.dropFirst() {
        if values[index] < values[index - 1] {
            return false
        }
    }
    return true
}`,
      `func partition(_ values: [Int]) -> (even: [Int], odd: [Int]) {
    var even: [Int] = [], odd: [Int] = []
    for value in values {
        if value.isMultiple(of: 2) { even.append(value) }
        else { odd.append(value) }
    }
    return (even, odd)
}`,
      `func mergeCounts(_ left: [String: Int], _ right: [String: Int]) -> [String: Int] {
    var result = left
    for (key, count) in right {
        result[key, default: 0] += count
    }
    return result
}`,
      `func clamp(_ values: inout [Int], low: Int, high: Int) {
    precondition(low <= high)
    for index in values.indices {
        values[index] = min(high, max(low, values[index]))
    }
}`,
    ],
    advanced: [
      `func lowerBound(_ values: [Int], target: Int) -> Int {
    var left = 0, right = values.count
    while left < right {
        let middle = left + (right - left) / 2
        if values[middle] < target { left = middle + 1 }
        else { right = middle }
    }
    return left
}`,
      `func insertionSort(_ values: inout [Int]) {
    for index in values.indices.dropFirst() {
        var cursor = index
        while cursor > 0 && values[cursor - 1] > values[cursor] {
            values.swapAt(cursor, cursor - 1)
            cursor -= 1
        }
    }
}`,
      `func maxSubarray(_ values: [Int]) -> Int? {
    guard let first = values.first else { return nil }
    var current = first, best = first
    for value in values.dropFirst() {
        current = max(value, current + value)
        best = max(best, current)
    }
    return best
}`,
      `func memoize<K: Hashable, V>(_ function: @escaping (K) -> V) -> (K) -> V {
    var cache: [K: V] = [:]
    return { key in
        if let cached = cache[key] { return cached }
        let value = function(key)
        cache[key] = value
        return value
    }
}`,
      `actor Counter {
    private var value = 0
    func increment(by amount: Int = 1) -> Int {
        value += amount
        return value
    }
    func snapshot() -> Int {
        return value
    }
}`,
      `func retry<T>(_ task: () async throws -> T) async throws -> T {
    for attempt in 0..<3 {
        try Task.checkCancellation()
        do { return try await task() }
        catch {
            if attempt == 2 { throw error }
            try await Task.sleep(nanoseconds: UInt64(1 << attempt) * 100_000_000)
        }
    }
    fatalError("Unreachable")
}`,
      `func breadthFirst(_ graph: [Int: [Int]], start: Int) -> [Int] {
    var queue = [start], seen: Set<Int> = [start]
    var head = 0
    while head < queue.count {
        let node = queue[head]
        head += 1
        for next in graph[node, default: []] {
            if seen.insert(next).inserted { queue.append(next) }
        }
    }
    return queue
}`,
      `func mergeIntervals(_ intervals: [(Int, Int)]) -> [(Int, Int)] {
    var merged: [(Int, Int)] = []
    for (start, end) in intervals.sorted(by: { $0.0 < $1.0 }) {
        if let last = merged.last, last.1 >= start {
            merged[merged.count - 1].1 = max(last.1, end)
        } else { merged.append((start, end)) }
    }
    return merged
}`,
      `func concurrentMap<T: Sendable, R: Sendable>(_ values: [T], transform: @escaping @Sendable (T) async -> R) async -> [R] {
    await withTaskGroup(of: (Int, R).self) { group in
        for (index, value) in values.enumerated() {
            group.addTask { (index, await transform(value)) }
        }
        var results: [(Int, R)] = []
        for await result in group { results.append(result) }
        return results.sorted { $0.0 < $1.0 }.map { $0.1 }
    }
}`,
      `struct RingBuffer<Element> {
    private var values: [Element] = []
    let capacity: Int
    mutating func append(_ value: Element) {
        guard capacity > 0 else { return }
        if values.count == capacity { values.removeFirst() }
        values.append(value)
    }
    var snapshot: [Element] { values }
}`,
    ],
  },
  bash: {
    intermediate: [
      `read_config() {
    local key value
    while IFS='=' read -r key value; do
        [[ -z $key || $key == \\#* ]] && continue
        printf '%s\\t%s\\n' "$key" "$value"
    done < "$1"
}`,
      `require_commands() {
    local command
    for command in "$@"; do
        if ! command -v "$command" >/dev/null 2>&1; then
            printf 'Missing: %s\\n' "$command" >&2
            return 1
        fi
    done
}`,
      `count_lines() {
    local line count=0
    while IFS= read -r line || [[ -n $line ]]; do
        ((count += 1))
    done < "$1"
    printf '%s\\n' "$count"
}`,
      `unique_sorted() {
    local value previous='' first=1
    while IFS= read -r value; do
        if ((first)) || [[ $value != "$previous" ]]; then
            printf '%s\\n' "$value"
        fi
        previous=$value
        first=0
    done
}`,
      `parse_port() {
    local value=$1
    [[ $value =~ ^[0-9]{1,5}$ ]] || return 1
    local port=$((10#$value))
    ((port >= 1 && port <= 65535)) || return 1
    printf '%d\\n' "$port"
}`,
      `reverse_args() {
    local values=("$@")
    local index
    for ((index=\${#values[@]}-1; index>=0; index--)); do
        printf '%s\\n' "\${values[index]}"
    done
}`,
      `check_files() {
    local file failed=0
    for file in "$@"; do
        [[ -r $file && -f $file ]] && continue
        printf 'Unreadable: %s\\n' "$file" >&2
        failed=1
    done
    return "$failed"
}`,
      `filter_nonempty() {
    local line
    while IFS= read -r line || [[ -n $line ]]; do
        [[ $line =~ ^[[:space:]]*$ ]] && continue
        printf '%s\\n' "$line"
    done
}`,
      `join_args() {
    local separator=$1 prefix='' value
    shift
    for value in "$@"; do
        printf '%s%s' "$prefix" "$value"
        prefix=$separator
    done
    printf '\\n'
}`,
      `file_extension() {
    local name=\${1##*/}
    if [[ $name == *.* && $name != .* ]]; then
        printf '%s\\n' "\${name##*.}"
    else
        return 1
    fi
}`,
    ],
    advanced: [
      `retry() {
    local attempt status=1
    for attempt in 1 2 3; do
        if "$@"; then return 0; else status=$?; fi
        ((attempt == 3)) && break
        sleep "$((1 << (attempt - 1)))"
    done
    return "$status"
}`,
      `atomic_write() (
    set -e
    local destination=$1 temporary
    temporary=$(mktemp "\${destination}.XXXXXX")
    trap 'rm -f -- "$temporary"' EXIT
    cat > "$temporary"
    chmod 600 "$temporary"
    mv -f -- "$temporary" "$destination"
)`,
      `with_lock() (
    local lock=$1
    shift
    if ! mkdir -- "$lock" 2>/dev/null; then
        printf 'Already running\\n' >&2
        exit 1
    fi
    trap 'rmdir -- "$lock"' EXIT
    "$@"
)`,
      `parallel_jobs() {
    local limit=$1 job pid status=0 pids=()
    shift
    [[ $limit =~ ^[1-9][0-9]*$ ]] || return 2
    for job in "$@"; do
        "$job" & pids+=("$!")
        if ((\${#pids[@]} >= limit)); then
            for pid in "\${pids[@]}"; do wait "$pid" || status=1; done
            pids=()
        fi
    done
    for pid in "\${pids[@]}"; do wait "$pid" || status=1; done
    return "$status"
}`,
      `read_manifest() {
    local line number=0
    while IFS= read -r line || [[ -n $line ]]; do
        ((number += 1))
        [[ -z $line || $line == \\#* ]] && continue
        if [[ $line != *=* ]]; then
            printf 'Invalid line %d\\n' "$number" >&2
            return 1
        fi
        printf '%s\\t%s\\n' "\${line%%=*}" "\${line#*=}"
    done < "$1"
}`,
      `run_logged() (
    set -o pipefail
    local logfile=$1
    shift
    "$@" 2>&1 | tee -a "$logfile"
    local statuses=("\${PIPESTATUS[@]}")
    ((statuses[0] == 0)) || exit "\${statuses[0]}"
    exit "\${statuses[1]}"
)`,
      `walk_files() {
    local file count=0
    while IFS= read -r -d '' file; do
        [[ -r $file ]] || continue
        printf '%s\\n' "$file"
        ((count += 1))
    done < <(find "$1" -type f -print0)
    printf 'Total: %d\\n' "$count" >&2
}`,
      `urlencode() {
    local LC_ALL=C text=$1 char index
    for ((index=0; index<\${#text}; index++)); do
        char=\${text:index:1}
        case $char in
            [a-zA-Z0-9.~_-]) printf '%s' "$char" ;;
            *) printf '%%%02X' "'$char" ;;
        esac
    done
}`,
      `wait_for_file() {
    local file=$1 attempts=$2 index
    [[ $attempts =~ ^[1-9][0-9]*$ ]] || return 2
    for ((index=0; index<attempts; index++)); do
        [[ -s $file ]] && return 0
        sleep 1
    done
    printf 'Timed out: %s\\n' "$file" >&2
    return 1
}`,
      `with_workspace() (
    set -e
    local workspace
    workspace=$(mktemp -d)
    trap 'rm -rf -- "$workspace"' EXIT
    cd -- "$workspace"
    "$@"
)`,
    ],
  },
};
