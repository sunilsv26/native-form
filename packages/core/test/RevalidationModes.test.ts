/* @vitest-environment jsdom */

import { describe, it, expect } from "vitest";
import { Runtime } from "../src/runtime/Runtime";

describe("Re-validation & Discrete Controls Flow", () => {
  it("clears checkbox error immediately on check after failed submission in mode: 'onBlur'", async () => {
    const form = document.createElement("form");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "terms";
    checkbox.checked = false;
    form.appendChild(checkbox);

    const runtime = new Runtime<{ terms: boolean }>({
      mode: "onBlur",
      reValidateMode: "onChange",
      serializationMode: "typed",
      validator: {
        validate: (values) => {
          if (!values.terms) {
            return {
              success: false,
              issues: [{ name: "terms", message: "You must accept the terms" }],
            };
          }
          return { success: true, data: values as { terms: boolean } };
        },
      },
    });

    runtime.mount(form);

    // 1. Submit invalid form
    const submitResult = await runtime.submit();
    expect(submitResult.success).toBe(false);
    expect(runtime.getFormState().errors).toEqual({ terms: "You must accept the terms" });

    // 2. User checks the checkbox (fires change event without blur)
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait microtask / promise cycle for async field validation
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 3. Error should be cleared immediately
    expect(runtime.getFormState().errors.terms).toBeUndefined();
    expect(runtime.getFormState().valid).toBe(true);

    runtime.unmount();
  });

  it("re-validates invalid text input on change/input when reValidateMode is 'onChange' in mode: 'onBlur'", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "text";
    input.name = "username";
    input.value = "";
    form.appendChild(input);

    const runtime = new Runtime<{ username: string }>({
      mode: "onBlur",
      reValidateMode: "onChange",
      validator: {
        validate: (values) => {
          const val = String(values.username ?? "");
          if (!val || val.length < 3) {
            return {
              success: false,
              issues: [{ name: "username", message: "Min 3 characters" }],
            };
          }
          return { success: true, data: values as { username: string } };
        },
      },
    });

    runtime.mount(form);

    // Initial submission fails
    await runtime.submit();
    expect(runtime.getFormState().errors.username).toBe("Min 3 characters");

    // Typing in the field fires 'input'
    input.value = "alice";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Error cleared immediately without needing to blur
    expect(runtime.getFormState().errors.username).toBeUndefined();

    runtime.unmount();
  });

  it("respects reValidateMode: 'onBlur' by withholding validation until blur", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "text";
    input.name = "username";
    input.value = "";
    form.appendChild(input);

    const runtime = new Runtime<{ username: string }>({
      mode: "onBlur",
      reValidateMode: "onBlur",
      validator: {
        validate: (values) => {
          const val = String(values.username ?? "");
          if (!val || val.length < 3) {
            return {
              success: false,
              issues: [{ name: "username", message: "Min 3 characters" }],
            };
          }
          return { success: true, data: values as { username: string } };
        },
      },
    });

    runtime.mount(form);

    // Submit with error
    await runtime.submit();
    expect(runtime.getFormState().errors.username).toBe("Min 3 characters");

    // Type valid value (input event) - should NOT clear yet under reValidateMode: 'onBlur'
    input.value = "alice";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(runtime.getFormState().errors.username).toBe("Min 3 characters");

    // Blur field - now it re-validates and clears
    input.dispatchEvent(new Event("blur", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(runtime.getFormState().errors.username).toBeUndefined();

    runtime.unmount();
  });
});
