import { useCallback, useState } from "react";
import type { UseFormResult } from "./useForm";

/** @public */
export interface UseFieldArrayOptions<
  TItem = Record<string, unknown>,
  TKeyName extends string = "id",
> {
  form: UseFormResult;
  name: string;
  keyName?: TKeyName;
  defaultValue?: TItem[];
}

/** @public */
export type FieldArrayItem<
  TItem = Record<string, unknown>,
  TKeyName extends string = "id",
> = TItem & {
  [K in TKeyName]: string;
};

/** @public */
export interface UseFieldArrayResult<
  TItem = Record<string, unknown>,
  TKeyName extends string = "id",
> {
  fields: Array<FieldArrayItem<TItem, TKeyName>>;
  append: (value?: Partial<TItem> | unknown) => void;
  prepend: (value?: Partial<TItem> | unknown) => void;
  insert: (index: number, value?: Partial<TItem> | unknown) => void;
  remove: (index: number | number[]) => void;
  swap: (from: number, to: number) => void;
  move: (from: number, to: number) => void;
  replace: (values: Array<Partial<TItem> | unknown>) => void;
}

let arrayIdCounter = 0;

function generateArrayId(): string {
  return `nfa-${Date.now().toString(36)}-${++arrayIdCounter}`;
}

function normalizeItem<TItem, TKeyName extends string>(
  value: unknown,
  keyName: TKeyName,
): FieldArrayItem<TItem, TKeyName> {
  const base =
    typeof value === "object" && value !== null
      ? ({ ...value } as Record<string, unknown>)
      : {};

  if (!(keyName in base) || !base[keyName]) {
    base[keyName] = generateArrayId();
  }

  return base as FieldArrayItem<TItem, TKeyName>;
}

/**
 * Manages dynamic list/array fields with stable identity keys and automatic error re-indexing.
 * @public
 */
export function useFieldArray<
  TItem = Record<string, unknown>,
  TKeyName extends string = "id",
>(
  options: UseFieldArrayOptions<TItem, TKeyName>,
): UseFieldArrayResult<TItem, TKeyName> {
  const { form, name, keyName = ("id" as TKeyName), defaultValue = [] } = options;
  const runtime = form.runtime;

  const [items, setItems] = useState<Array<FieldArrayItem<TItem, TKeyName>>>(
    () => defaultValue.map((item) => normalizeItem<TItem, TKeyName>(item, keyName)),
  );

  const append = useCallback(
    (value?: Partial<TItem> | unknown) => {
      const newItem = normalizeItem<TItem, TKeyName>(value ?? {}, keyName);
      setItems((prev) => [...prev, newItem]);
    },
    [keyName],
  );

  const prepend = useCallback(
    (value?: Partial<TItem> | unknown) => {
      const newItem = normalizeItem<TItem, TKeyName>(value ?? {}, keyName);
      runtime?.insertArrayItem(name, 0);
      setItems((prev) => [newItem, ...prev]);
    },
    [runtime, name, keyName],
  );

  const insert = useCallback(
    (index: number, value?: Partial<TItem> | unknown) => {
      const newItem = normalizeItem<TItem, TKeyName>(value ?? {}, keyName);
      runtime?.insertArrayItem(name, index);
      setItems((prev) => {
        const clamped = Math.max(0, Math.min(index, prev.length));
        const next = [...prev];
        next.splice(clamped, 0, newItem);
        return next;
      });
    },
    [runtime, name, keyName],
  );

  const remove = useCallback(
    (index: number | number[]) => {
      const indices = Array.isArray(index) ? index : [index];
      const sorted = [...indices].sort((a, b) => b - a);

      for (const idx of sorted) {
        runtime?.removeArrayItem(name, idx);
      }

      setItems((prev) => {
        const removeSet = new Set(indices);
        return prev.filter((_, idx) => !removeSet.has(idx));
      });
    },
    [runtime, name],
  );

  const swap = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      runtime?.swapArrayItems(name, from, to);
      setItems((prev) => {
        if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) {
          return prev;
        }
        const next = [...prev];
        const temp = next[from];
        next[from] = next[to];
        next[to] = temp;
        return next;
      });
    },
    [runtime, name],
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      runtime?.moveArrayItem(name, from, to);
      setItems((prev) => {
        if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) {
          return prev;
        }
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return next;
      });
    },
    [runtime, name],
  );

  const replace = useCallback(
    (values: Array<Partial<TItem> | unknown>) => {
      setItems(values.map((v) => normalizeItem<TItem, TKeyName>(v, keyName)));
    },
    [keyName],
  );

  return {
    fields: items,
    append,
    prepend,
    insert,
    remove,
    swap,
    move,
    replace,
  };
}

