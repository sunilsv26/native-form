/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { Runtime } from "../src/Runtime";
import { ValidationContext } from "../src/Validation";

function createForm(markup: string): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = markup;
  document.body.append(form);
  return form;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Async Server-Side Validation Pipeline (RFC 004 / NF-020)", () => {
  it("debounces keystroke validation when debounceMs is specified", async () => {
    const validateFn = vi.fn().mockReturnValue({ success: true, values: {} });
    const form = createForm(`<input name="username" value="" />`);

    const runtime = new Runtime({
      mode: "onChange",
      debounceMs: 50,
      validator: { validate: validateFn },
    });
    runtime.mount(form);

    const input = form.querySelector("input")!;

    // Keystroke 1
    input.value = "u";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Keystroke 2 (before 50ms)
    await sleep(20);
    input.value = "us";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Keystroke 3 (before 50ms)
    await sleep(20);
    input.value = "user";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(validateFn).not.toHaveBeenCalled();

    // Wait past debounce duration
    await sleep(70);

    // Only one validation should have executed for the final value
    expect(validateFn).toHaveBeenCalledTimes(1);
    expect(validateFn).toHaveBeenCalledWith(
      expect.objectContaining({ username: "user" }),
      expect.anything(),
    );

    runtime.unmount();
    form.remove();
  });

  it("flushes debounce immediately on blur", async () => {
    const validateFn = vi.fn().mockReturnValue({ success: true, values: {} });
    const form = createForm(`<input name="email" value="" />`);

    const runtime = new Runtime({
      mode: "onChange",
      debounceMs: 100,
      validator: { validate: validateFn },
    });
    runtime.mount(form);

    const input = form.querySelector("input")!;
    input.value = "test@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(validateFn).not.toHaveBeenCalled();

    // Blur immediately flushes the pending debounce timer
    input.dispatchEvent(new Event("blur", { bubbles: true }));
    await sleep(10);

    expect(validateFn).toHaveBeenCalledTimes(1);

    runtime.unmount();
    form.remove();
  });

  it("tracks field.validating and formState.validating during async execution", async () => {
    const form = createForm(`<input name="username" value="alex" />`);

    let resolvePromise!: (err?: string) => void;
    const asyncCheck = vi.fn(
      () =>
        new Promise<string | undefined>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const runtime = new Runtime({
      mode: "onChange",
      debounceMs: 0,
      asyncValidators: {
        username: asyncCheck,
      },
    });
    runtime.mount(form);

    const input = form.querySelector("input")!;
    input.value = "alexander";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await sleep(5);

    // Validation is in-flight: field and formState should report validating = true
    expect(asyncCheck).toHaveBeenCalled();
    const fieldStateBefore = runtime.getFieldState("username")!;
    expect(fieldStateBefore.validating).toBe(true);
    expect(runtime.getFormState().validating).toBe(true);

    // Resolve the async check
    resolvePromise(undefined);
    await sleep(10);

    // Validation completed: field and formState should report validating = false
    const fieldStateAfter = runtime.getFieldState("username")!;
    expect(fieldStateAfter.validating).toBe(false);
    expect(runtime.getFormState().validating).toBe(false);
    expect(fieldStateAfter.error).toBeUndefined();

    runtime.unmount();
    form.remove();
  });

  it("aborts in-flight async validation when a subsequent keystroke occurs", async () => {
    const form = createForm(`<input name="code" value="" />`);
    const signals: AbortSignal[] = [];

    const asyncCheck = vi.fn(async (_val: unknown, context: ValidationContext) => {
      signals.push(context.signal);
      await sleep(50);
      return undefined;
    });

    const runtime = new Runtime({
      mode: "onChange",
      debounceMs: 0,
      asyncValidators: {
        code: asyncCheck,
      },
    });
    runtime.mount(form);

    const input = form.querySelector("input")!;

    // First keystroke starts validation
    input.value = "A";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(10);

    expect(signals.length).toBe(1);
    expect(signals[0].aborted).toBe(false);

    // Second keystroke aborts the first request
    input.value = "AB";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(10);

    expect(signals.length).toBe(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await sleep(60);

    runtime.unmount();
    form.remove();
  });

  it("short-circuits async validator when synchronous schema validation fails", async () => {
    const form = createForm(`<input name="email" value="" />`);
    const asyncCheck = vi.fn().mockResolvedValue(undefined);

    const runtime = new Runtime({
      mode: "onChange",
      debounceMs: 0,
      validator: {
        validate(values: Record<string, unknown>) {
          const email = String(values.email ?? "");
          if (!email.includes("@")) {
            return {
              success: false as const,
              issues: [{ name: "email", message: "Invalid email syntax" }],
            };
          }
          return { success: true as const, values };
        },
      },
      asyncValidators: {
        email: asyncCheck,
      },
    });
    runtime.mount(form);

    const input = form.querySelector("input")!;

    // Invalid sync input: no "@"
    input.value = "invalid-email";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(10);

    // Sync error must be set, and asyncCheck must NOT be invoked
    expect(runtime.getFieldState("email")?.error).toBe("Invalid email syntax");
    expect(asyncCheck).not.toHaveBeenCalled();

    // Now type a valid syntax email
    input.value = "valid@company.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(10);

    // Sync passes, so asyncCheck IS invoked
    expect(asyncCheck).toHaveBeenCalledWith(
      "valid@company.com",
      expect.objectContaining({ signal: expect.anything() }),
    );

    runtime.unmount();
    form.remove();
  });

  it("awaits asyncValidators during submit and halts if an async check returns an error", async () => {
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();

    const form = createForm(`
      <input name="promoCode" value="EXPIRED" />
      <button type="submit">Submit</button>
    `);

    const runtime = new Runtime({
      onSubmit,
      onInvalid,
      asyncValidators: {
        promoCode: async (code) => {
          await sleep(20);
          if (code === "EXPIRED") {
            return "Promo code is expired";
          }
          return undefined;
        },
      },
    });
    runtime.mount(form);

    const result = await runtime.submit();

    expect(result.success).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalled();
    expect(runtime.getFieldState("promoCode")?.error).toBe("Promo code is expired");

    runtime.unmount();
    form.remove();
  });
});

