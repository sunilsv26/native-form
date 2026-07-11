import { NativeFormValue } from "../shared/types";

/** @public */
export interface FieldState {
  name: string;

  dirty: boolean;

  touched: boolean;

  mounted: boolean;

  initialValue: NativeFormValue | undefined;

  value: NativeFormValue | undefined;

  error?: string;
}
