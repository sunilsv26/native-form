export type NativeFormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export type NativeFormValue = FormDataEntryValue | FormDataEntryValue[];

export type NativeFormFlatValues = Record<string, NativeFormValue>;

export type NativeFormNestedValue =
  | NativeFormValue
  | { [key: string]: NativeFormNestedValue }
  | NativeFormNestedValue[];

export type NativeFormValues = Record<string, NativeFormNestedValue>;

export type RuntimeEventType =
  | "form:mount"
  | "form:unmount"
  | "form:invalid"
  | "form:reset"
  | "form:submit"
  | "validation:end"
  | "validation:start"
  | "field:blur"
  | "field:mount"
  | "field:unmount"
  | "field:update"
  | "field:input"
  | "field:change"
  | "field:reset"
  | "field:submit";

export type FormEvents =
  | {
      type: "form:mount" | "form:unmount";
    }
  | {
      type: "form:reset" | "form:submit";
      values: NativeFormValues;
    }
  | {
      type: "form:invalid";
      errors: Record<string, string>;
      values: NativeFormValues;
    };

export type ValidationEvents =
  | {
      type: "validation:start";
      values: NativeFormValues;
    }
  | {
      type: "validation:end";
      errors: Record<string, string>;
      values: NativeFormValues;
    };

export type FieldEvents =
  | {
      type:
        | "field:blur"
        | "field:update"
        | "field:input"
        | "field:change"
        | "field:reset";
      field: string;
      value: NativeFormValue | undefined;
      values: NativeFormValues;
    }
  | {
      type: "field:mount" | "field:unmount" | "field:submit";
      field: string;
    };

export type RuntimeEvent = FieldEvents | ValidationEvents | FormEvents;

export type RuntimeListener = (event: RuntimeEvent) => void;
