import { FieldNode } from "./FieldNode";

export class FieldRegistry {
  private readonly fields = new Map<string, FieldNode>();

  register(field: FieldNode): void {
    this.fields.set(field.name, field);
  }

  unregister(name: string): void {
    const field = this.fields.get(name);

    if (field) {
      field.removeErrorElement();
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
