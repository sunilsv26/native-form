import { FieldNode } from "./FieldNode";

export class FieldRegistry {
  private readonly fields = new Map<string, FieldNode>();
  // Optional change callback used by Runtime to observe mount/unmount events.
  onChange?: (event: { type: "mount" | "unmount"; field: FieldNode }) => void;

  register(field: FieldNode): void {
    this.fields.set(field.name, field);
    this.onChange?.({ type: "mount", field });
  }

  unregister(name: string): void {
    const field = this.fields.get(name);

    if (field) {
      field.removeErrorElement();
      field.unregister();
      this.onChange?.({ type: "unmount", field });
    }

    this.fields.delete(name);
  }

  get(name: string): FieldNode | undefined {
    return this.fields.get(name);
  }

  has(name: string): boolean {
    return this.fields.has(name);
  }

  values(): FieldNode[] {
    return [...this.fields.values()];
  }

  clear(): void {
    for (const field of this.fields.values()) {
      field.removeErrorElement();
      field.unregister();
      this.onChange?.({ type: "unmount", field });
    }

    this.fields.clear();
  }

  get size(): number {
    return this.fields.size;
  }

  getAll(): FieldNode[] {
    return Array.from(this.fields.values());
  }
}
