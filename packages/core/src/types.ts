export type NativeFormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export type NativeFormValue = FormDataEntryValue | FormDataEntryValue[];

export type NativeFormValues = Record<string, NativeFormValue>;

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
  | "field:update";

export type RuntimeEvent =
  | {
      type: "form:mount" | "form:unmount";
    }
  | {
      type: "form:reset" | "form:submit";
      values: NativeFormValues;
    }
  | {
      type: "form:invalid" | "validation:end";
      errors: Record<string, string>;
      values: NativeFormValues;
    }
  | {
      type: "validation:start";
      values: NativeFormValues;
    }
  | {
      type: "field:blur" | "field:update";
      field: string;
      value: NativeFormValue | undefined;
      values: NativeFormValues;
    }
  | {
      type: "field:mount" | "field:unmount";
      field: string;
    };

export type RuntimeListener = (event: RuntimeEvent) => void;
