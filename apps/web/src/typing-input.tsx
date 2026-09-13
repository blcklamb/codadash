import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Action } from '../../../packages/shared/src/engine';

// The DOM owns the IME draft. Only keydown submits game actions, so a trailing
// input/compositionend event can never duplicate the first English character.
export function useTypingInput({
  session,
  enabled,
  multiline,
  send,
  select,
}: {
  session?: string;
  enabled: boolean;
  multiline: boolean;
  send: (op: Action['op'], char?: string) => void;
  select?: (direction: -1 | 1) => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const [ime, setIme] = useState(false);
  const [focused, setFocused] = useState(true);
  function reset() {
    composing.current = false;
    setIme(false);
    if (input.current) input.current.value = '';
  }
  useEffect(() => {
    reset();
    if (enabled) input.current?.focus();
  }, [session, enabled]);
  function key(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!enabled || e.ctrlKey || e.metaKey || e.altKey) return;
    // keyCode 229 also covers WebKit's final composition keydown.
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    // A non-composing key is authoritative even if compositionend was lost.
    reset();
    if (e.key === 'Backspace') {
      e.preventDefault();
      send('backspace');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (multiline) send('insert', '\n');
    } else if (e.key === 'Escape' && !multiline) {
      e.preventDefault();
      send('clear');
    } else if (!multiline && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      select?.(e.key === 'ArrowUp' ? -1 : 1);
    } else if (/^[\x20-\x7e]$/.test(e.key)) {
      e.preventDefault();
      send('insert', e.key);
    } else if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End'].includes(e.key)
    ) {
      e.preventDefault();
    }
  }
  return {
    input,
    ime,
    focused,
    props: {
      ref: input,
      defaultValue: '',
      onKeyDown: key,
      onInput: () => {
        if (!composing.current && input.current) input.current.value = '';
      },
      onCompositionStart: () => {
        composing.current = true;
        setIme(true);
      },
      onCompositionEnd: reset,
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false);
        reset();
      },
      onPaste: (e: React.ClipboardEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => e.preventDefault(),
      autoCapitalize: 'off',
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: false,
      disabled: !enabled,
    },
  };
}
