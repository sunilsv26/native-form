/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { Form } from "../src";
import { renderReact } from "./testUtils";

const successValidator = {
  validate(values: { email?: string }) {
    return {
      success: true as const,
      values: {
        email: String(values.email ?? ""),
      },
    };
  },
};

const emailValidator = {
  validate(values: { email?: string }) {
    const email = String(values.email ?? "");

    if (!email.includes("@")) {
      return {
        success: false as const,
        issues: [{ name: "email", message: "Invalid email" }],
      };
    }

    return {
      success: true as const,
      values: { email },
    };
  },
};

describe("Form", () => {
  it("submits schema-validated values through onSubmit", async () => {
    const onSubmit = vi.fn();

    const view = await renderReact(
      <Form schema={successValidator} onSubmit={onSubmit}>
        <input name="email" defaultValue="user@example.com" />
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = view.container.querySelector("form");

    expect(form).not.toBeNull();

    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });

    await import("react").then(({ act }) =>
      act(async () => {
        form?.dispatchEvent(submitEvent);
        await Promise.resolve();
      }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      { email: "user@example.com" },
      expect.any(Object),
    );

    await view.cleanup();
  });

  it("reports invalid schema submit through onInvalid", async () => {
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();

    const view = await renderReact(
      <Form schema={emailValidator} onSubmit={onSubmit} onInvalid={onInvalid}>
        <input name="email" defaultValue="not-an-email" />
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = view.container.querySelector("form");

    expect(form).not.toBeNull();

    await import("react").then(({ act }) =>
      act(async () => {
        form?.dispatchEvent(
          new Event("submit", {
            bubbles: true,
            cancelable: true,
          }),
        );
        await Promise.resolve();
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onInvalid).toHaveBeenCalledWith(
      { email: "Invalid email" },
      { email: "not-an-email" },
      expect.any(Object),
    );

    await view.cleanup();
  });
});
