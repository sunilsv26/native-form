import { Discovery } from "./Discovery";
import { FieldRegistry } from "./FieldRegistry";
import { Serializer } from "./Serializer";
import { RuntimeEvent, RuntimeListener } from "./types";
export class Runtime {
  private readonly registry = new FieldRegistry();

  private readonly discovery = new Discovery();

  private readonly serializer = new Serializer();

  private form?: HTMLFormElement;

  private readonly listeners = new Set<RuntimeListener>();

  mount(form: HTMLFormElement) {
    this.form = form;
    this.discovery.discover(form, this.registry);

    form.addEventListener("submit", this.handleSubmit);
    form.addEventListener("input", this.handleFieldUpdate);
    form.addEventListener("change", this.handleFieldUpdate);
    this.notify({
      type: "form:mount",
    });
  }

  unmount() {
    if (this.form) {
      this.form.removeEventListener("submit", this.handleSubmit);
      this.form.removeEventListener("input", this.handleFieldUpdate);
      this.form.removeEventListener("change", this.handleFieldUpdate);
    }

    this.registry.clear();

    this.form = undefined;

    this.notify({
      type: "form:unmount",
    });

    this.listeners.clear();
  }

  serialize() {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    const values = this.serializer.serialize(this.form);

    this.notify({
      type: "form:submit",
      values,
    });

    return values;
  }

  get fields() {
    return this.registry.values();
  }

  subscribe(listener: RuntimeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.unsubscribe(listener);
    };
  }

  unsubscribe(listener: RuntimeListener): void {
    this.listeners.delete(listener);
  }

  private notify(event: RuntimeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private handleSubmit = () => {
    const values = this.serialize();

    this.notify({
      type: "form:submit",
      values,
    });
  };

  private handleFieldUpdate = (event: Event) => {
    const element = event.target as HTMLInputElement;

    if (!element.name) return;

    this.notify({
      type: "field:update",
      field: element.name,
      value: element.value,
    });
  };
}
