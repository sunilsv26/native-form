import { FieldState } from "./FieldState";
import { NativeFormValue } from "./types";

export class FieldStateStore {
  private readonly fields = new Map<string, FieldState>();

  register(name: string, initialValue?: NativeFormValue): void {
    if (this.fields.has(name)) {
      const field = this.fields.get(name)!;

      if (field.mounted) {
        return;
      }

      field.mounted = true;
      field.value = initialValue;
      field.initialValue = initialValue;
      field.dirty = false;
      field.touched = false;
      field.error = undefined;

      return;
    }

    this.fields.set(name, {
      name,
      dirty: false,
      touched: false,
      mounted: true,
      initialValue,
      value: initialValue,
      error: undefined,
    });
  }

  unregister(name: string): void {
    const field = this.fields.get(name);

    if (!field) return;

    field.mounted = false;
  }

  get(name: string): FieldState | undefined {
    const field = this.fields.get(name);

    return field ? { ...field } : undefined;
  }

  getAll(): FieldState[] {
    return [...this.fields.values()].map((field) => ({ ...field }));
  }

  updateValue(name: string, value: NativeFormValue | undefined): void {
    const field = this.fields.get(name);

    if (!field) return;

    field.value = value;
    field.dirty = !isEqualValue(field.initialValue, value);
  }

  markTouched(name: string): void {
    const field = this.fields.get(name);

    if (!field) return;

    field.touched = true;
  }

  setErrors(errors: Record<string, string>): void {
    for (const field of this.fields.values()) {
      field.error = errors[field.name];
    }
  }

  reset(values: Record<string, NativeFormValue | undefined>): void {
    for (const [name, field] of this.fields) {
      const value = values[name];

      field.initialValue = value;
      field.value = value;
      field.dirty = false;
      field.touched = false;
      field.error = undefined;
    }
  }

  clear(): void {
    this.fields.clear();
  }
}

function isEqualValue(
  left: NativeFormValue | undefined,
  right: NativeFormValue | undefined,
): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  return left === right;
}
