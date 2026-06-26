import { NativeFormValues } from "./types";

export class Serializer {
  serialize(form: HTMLFormElement): NativeFormValues {
    const formData = new FormData(form);

    const values: NativeFormValues = {};

    for (const key of new Set(formData.keys())) {
      const entries = formData.getAll(key);

      values[key] = entries.length === 1 ? entries[0] : entries;
    }

    return values;
  }
}
