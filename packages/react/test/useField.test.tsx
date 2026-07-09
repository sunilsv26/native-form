/* @vitest-environment jsdom */

import { act } from "react";
import { describe, expect, it } from "vitest";

import { useField, useForm } from "../src";
import { renderReact } from "./testUtils";

describe("useField", () => {
  it("keeps value, error, and invalid state in sync with runtime formState", async () => {
    const validator = {
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

    function Probe() {
      const form = useForm({ validator });
      const email = useField({ form, name: "email" });

      return (
        <form ref={form.formRef} noValidate>
          <input name="email" defaultValue="" />
          <button type="submit">Submit</button>
          <p data-testid="value">{String(email.value ?? "")}</p>
          <p data-testid="error">{email.error ?? ""}</p>
          <p data-testid="invalid">{String(email.invalid)}</p>
        </form>
      );
    }

    const view = await renderReact(<Probe />);

    const form = view.container.querySelector("form");
    const input = view.container.querySelector(
      "input[name='email']",
    ) as HTMLInputElement;
    const error = () =>
      view.container.querySelector("[data-testid='error']")?.textContent ?? "";
    const invalid = () =>
      view.container.querySelector("[data-testid='invalid']")?.textContent ??
      "";
    const value = () =>
      view.container.querySelector("[data-testid='value']")?.textContent ?? "";

    expect(value()).toBe("");

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", {
          bubbles: true,
          cancelable: true,
        }),
      );
      await Promise.resolve();
    });

    expect(error()).toBe("Invalid email");
    expect(invalid()).toBe("true");

    input.value = "user@example.com";
    await act(async () => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(value()).toBe("user@example.com");

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", {
          bubbles: true,
          cancelable: true,
        }),
      );
      await Promise.resolve();
    });

    expect(error()).toBe("");
    expect(invalid()).toBe("false");

    await view.cleanup();
  });
});
