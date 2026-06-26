import { Discovery } from "./Discovery";
import { FieldRegistry } from "./FieldRegistry";
import { Serializer } from "./Serializer";

export class Runtime {
  private readonly registry = new FieldRegistry();

  private readonly discovery = new Discovery();

  private readonly serializer = new Serializer();

  private form?: HTMLFormElement;

  mount(form: HTMLFormElement) {
    this.form = form;

    this.discovery.discover(form, this.registry);
  }

  unmount() {
    this.registry.clear();

    this.form = undefined;
  }

  serialize() {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    return this.serializer.serialize(this.form);
  }

  get fields() {
    return this.registry.values();
  }
}
