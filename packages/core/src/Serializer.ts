export class Serializer {
  serialize(form: HTMLFormElement): Record<string, FormDataEntryValue> {
    const formData = new FormData(form);

    const values: Record<string, FormDataEntryValue> = {};

    for (const [key, value] of formData.entries()) {
      values[key] = value;
    }

    return values;
  }
}
