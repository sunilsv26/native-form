/* @vitest-environment jsdom */

import { act } from "react";
import { describe, expect, it } from "vitest";

import { useForm } from "../src";
import { renderReact } from "./testUtils";

describe("renderDomErrors Option in React", () => {
  it("defaults to renderDomErrors: false and does not inject DOM error elements", async () => {
    function App() {
      const { formRef, formState } = useForm({
        validator: {
          validate: () => ({
            success: false,
            issues: [{ name: "email", message: "Email is required" }],
          }),
        },
      });

      return (
        <form ref={formRef} noValidate>
          <input name="email" defaultValue="" />
          {formState.errors.email && (
            <span className="custom-react-error">{formState.errors.email}</span>
          )}
          <button type="submit">Submit</button>
        </form>
      );
    }

    const view = await renderReact(<App />);
    const form = view.container.querySelector("form")!;
    const input = view.container.querySelector("input")!;

    // Submit form to trigger validation errors
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    // Custom React error element is rendered declaratively
    expect(view.container.querySelector(".custom-react-error")?.textContent).toBe(
      "Email is required",
    );

    // No library injected error divs exist in DOM
    const injectedErrors = view.container.querySelectorAll(
      "[data-native-form-error='true']",
    );
    expect(injectedErrors.length).toBe(0);

    // Native custom validity is still applied
    expect(input.validationMessage).toBe("Email is required");
    expect(input.checkValidity()).toBe(false);

    await view.cleanup();
  });

  it("injects DOM elements when renderDomErrors: true is explicitly enabled", async () => {
    function App() {
      const { formRef } = useForm({
        renderDomErrors: true,
        validator: {
          validate: () => ({
            success: false,
            issues: [{ name: "email", message: "Email is required" }],
          }),
        },
      });

      return (
        <form ref={formRef} noValidate>
          <input name="email" defaultValue="" />
          <button type="submit">Submit</button>
        </form>
      );
    }

    const view = await renderReact(<App />);
    const form = view.container.querySelector("form")!;

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    // Injected error div exists in DOM
    const injected = view.container.querySelector(
      "[data-native-form-error='true']",
    );
    expect(injected).not.toBeNull();
    expect(injected?.textContent).toBe("Email is required");

    await view.cleanup();
  });
});
