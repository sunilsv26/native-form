export type NativeFormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export type RuntimeEventType =
  | "form:mount"
  | "form:unmount"
  | "form:submit"
  | "field:update";

export interface RuntimeEvent {
  type: RuntimeEventType;
  field?: string;
  value?: unknown;
  values?: Record<string, unknown>;
}

export type RuntimeListener = (event: RuntimeEvent) => void;
