/**
 * Supported validation modes for form and field lifecycle.
 * - onChange: validates on every input/change event (live)
 * - onBlur: validates when an input loses focus
 * - onSubmit: validates only upon form submission
 * - onTouched: validates on blur first, then on change for touched fields
 * - all: validates on both input and blur events
 * @public
 */
export type ValidationMode =
  | "onChange"
  | "onBlur"
  | "onSubmit"
  | "onTouched"
  | "all";
/** @public */
export type NativeFormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

/** @public */
export type NativeFormValue = FormDataEntryValue | FormDataEntryValue[];

/** @public */
export type NativeFormFlatValues = Record<string, NativeFormValue>;

/** @public */
export type NativeFormNestedValue =
  | NativeFormValue
  | { [key: string]: NativeFormNestedValue }
  | NativeFormNestedValue[];

/** @public */
export type NativeFormValues = Record<string, NativeFormNestedValue>;

/** @public */
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

/** @public */
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

/** @public */
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

/** @public */
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

/** @public */
export type RuntimeEvent = FieldEvents | ValidationEvents | FormEvents;

/** @public */
export type RuntimeListener = (event: RuntimeEvent) => void;
