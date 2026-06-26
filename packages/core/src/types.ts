export type NativeFormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export interface FieldInfo {
  name: string;
  type: string;
  tag: string;
  element: NativeFormElement;
}
