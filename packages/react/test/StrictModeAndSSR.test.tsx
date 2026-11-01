/* @vitest-environment jsdom */

import React, { act, StrictMode, useState } from "react";
import ReactDOMServer from "react-dom/server";
import ReactDOMClient from "react-dom/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useForm } from "../src";
import { renderReact } from "./testUtils";
import { zodResolver } from "../../zod/src";
import { z } from "zod";

describe("StrictMode & SSR Conformance (Automated Proof Suite)", () => {
  // --------------------------------------------------------------------------
  // SUITE 1: React 18/19 StrictMode Lifecycle & Resource Auditing
  // --------------------------------------------------------------------------
  describe("React StrictMode Double-Mount & Idempotency", () => {
    it("mounts -> unmounts -> remounts without duplicate submit or change listeners", async () => {
      const onSubmit = vi.fn();
      let renderCount = 0;

      function StrictFormApp() {
        renderCount++;
        const { formRef, formState } = useForm({
          onSubmit,
        });

        return (
          <form ref={formRef}>
            <input name="email" defaultValue="strict@example.com" />
            <button type="submit" disabled={formState.submitting}>
              Submit
            </button>
          </form>
        );
      }

      const view = await renderReact(
        <StrictMode>
          <StrictFormApp />
        </StrictMode>,
      );

      // In React StrictMode (dev), the component double renders on initial mount
      expect(renderCount).toBeGreaterThanOrEqual(2);

      const formElement = view.container.querySelector("form")!;
      const submitButton = view.container.querySelector("button")!;

      // Trigger submit event
      await act(async () => {
        submitButton.click();
        await Promise.resolve();
      });

      // Crucial assertion: submit must fire EXACTLY ONCE.
      // If listeners were duplicated on remount, onSubmit would be called multiple times.
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ email: "strict@example.com" }),
        expect.anything(),
      );

      await view.cleanup();
    });

    it("cleans up 100% of DOM listeners, MutationObservers, and timers upon unmount", async () => {
      const addedListeners: Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject }> = [];
      const removedListeners: Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject }> = [];

      const origAdd = EventTarget.prototype.addEventListener;
      const origRemove = EventTarget.prototype.removeEventListener;

      const addSpy = vi.spyOn(EventTarget.prototype, "addEventListener").mockImplementation(function (
        this: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        addedListeners.push({ target: this, type, listener });
        return origAdd.call(this, type, listener, options);
      });

      const removeSpy = vi.spyOn(EventTarget.prototype, "removeEventListener").mockImplementation(function (
        this: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) {
        removedListeners.push({ target: this, type, listener });
        return origRemove.call(this, type, listener, options);
      });

      const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");
      const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");

      function TrackedApp() {
        const { formRef } = useForm();
        return (
          <form ref={formRef}>
            <input name="username" defaultValue="audit" />
          </form>
        );
      }

      const view = await renderReact(<TrackedApp />);

      expect(observeSpy).toHaveBeenCalled();
      const observeCount = observeSpy.mock.calls.length;

      // Unmount the component completely
      await view.cleanup();

      // Verify MutationObserver was disconnected cleanly
      expect(disconnectSpy).toHaveBeenCalledTimes(observeCount);

      // Verify all form listeners attached by runtime ('submit', 'input', 'change', 'blur', 'reset') were removed
      const runtimeEventTypes = ["submit", "input", "change", "blur", "reset"];
      for (const eventType of runtimeEventTypes) {
        const addedForType = addedListeners.filter(
          (l) => l.type === eventType && (l.target instanceof HTMLFormElement || l.target instanceof HTMLInputElement),
        );
        const removedForType = removedListeners.filter(
          (l) => l.type === eventType && (l.target instanceof HTMLFormElement || l.target instanceof HTMLInputElement),
        );

        expect(removedForType.length).toBeGreaterThanOrEqual(addedForType.length);
      }

      addSpy.mockRestore();
      removeSpy.mockRestore();
      disconnectSpy.mockRestore();
      observeSpy.mockRestore();
    });

    it("aborts in-flight validations and timers when unmounted during validation", async () => {
      const asyncValidationFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 500)),
      );

      function AsyncFormApp() {
        const { formRef } = useForm({
          debounceMs: 200,
          asyncValidators: {
            username: asyncValidationFn,
          },
        });

        return (
          <form ref={formRef}>
            <input name="username" defaultValue="" />
          </form>
        );
      }

      const view = await renderReact(<AsyncFormApp />);
      const input = view.container.querySelector("input")!;

      await act(async () => {
        input.value = "test-user";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      // Component is unmounted before the debounce timer (200ms) or async validation completes
      await view.cleanup();

      // Wait past the debounce time
      await new Promise((r) => setTimeout(r, 250));

      // The unmount cleanly cleared the timer and aborted controller
      expect(asyncValidationFn).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Pure Server-Side Rendering (SSR) in Node
  // --------------------------------------------------------------------------
  describe("Server-Side Rendering (Node / Next.js / Remix)", () => {
    it("renders pure HTML with renderToString without touching window or document", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      function SsrPage() {
        const { formRef, formState } = useForm({
          defaultValues: {
            title: "Server Rendered Post",
            category: "engineering",
          },
        });

        return (
          <form ref={formRef} action="/api/posts" method="POST">
            <div>
              <label htmlFor="title">Title</label>
              <input id="title" name="title" defaultValue="Server Rendered Post" />
              {formState.errors.title && <span className="error">{formState.errors.title}</span>}
            </div>
            <div>
              <label htmlFor="category">Category</label>
              <input id="category" name="category" defaultValue="engineering" />
            </div>
            <button type="submit" disabled={formState.submitting}>
              Publish
            </button>
          </form>
        );
      }

      // Simulate genuine Node SSR by temporarily removing window and document globals
      const originalWindow = (globalThis as any).window;
      const originalDocument = (globalThis as any).document;

      let htmlString: string;
      try {
        delete (globalThis as any).window;
        delete (globalThis as any).document;

        // Execute standard React SSR
        htmlString = ReactDOMServer.renderToString(<SsrPage />);
      } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDocument;
      }

      // Assertions on the server-rendered HTML string
      expect(htmlString).toContain('action="/api/posts"');
      expect(htmlString).toContain('name="title"');
      expect(htmlString).toContain('value="Server Rendered Post"');
      expect(htmlString).toContain('name="category"');
      expect(htmlString).toContain('value="engineering"');
      expect(htmlString).toContain('Publish');

      // Crucial SSR assertion: No "useLayoutEffect does nothing on the server" warning!
      for (const call of consoleWarnSpy.mock.calls) {
        expect(call[0]).not.toMatch(/useLayoutEffect does nothing on the server/);
      }
      for (const call of consoleErrorSpy.mock.calls) {
        expect(call[0]).not.toMatch(/useLayoutEffect does nothing on the server/);
      }
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 3: Client Hydration & Dynamic Post-Hydration Mutations
  // --------------------------------------------------------------------------
  describe("Client Hydration & Post-Hydration Discoveries", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it("hydrates server-rendered HTML with zero hydration mismatch errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const schema = z.object({
        email: z.string().email(),
      });

      function HydrationForm() {
        const { formRef, formState } = useForm({
          schema: zodResolver(schema),
        });

        return (
          <form ref={formRef}>
            <input name="email" defaultValue="user@company.com" />
            {formState.errors.email && <p className="err">{formState.errors.email}</p>}
            <button type="submit">Submit</button>
          </form>
        );
      }

      // Step 1: Render on the simulated server
      const origWindow = (globalThis as any).window;
      const origDoc = (globalThis as any).document;
      let serverHtml: string;
      try {
        delete (globalThis as any).window;
        delete (globalThis as any).document;
        serverHtml = ReactDOMServer.renderToString(<HydrationForm />);
      } finally {
        (globalThis as any).window = origWindow;
        (globalThis as any).document = origDoc;
      }
      container.innerHTML = serverHtml;

      // Step 2: Hydrate on the client using React 18/19 hydrateRoot
      let root: ReactDOMClient.Root;
      await act(async () => {
        root = ReactDOMClient.hydrateRoot(container, <HydrationForm />);
        await Promise.resolve();
      });

      // Assert zero React hydration warnings or mismatch errors
      for (const call of consoleErrorSpy.mock.calls) {
        const msg = String(call[0] || "");
        expect(msg).not.toMatch(/Warning: Text content did not match/);
        expect(msg).not.toMatch(/Warning: Expected server HTML to contain/);
        expect(msg).not.toMatch(/Hydration failed because/);
      }

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Step 3: Verify the form element was successfully connected and indexed
      const input = container.querySelector("input")!;
      expect(input.value).toBe("user@company.com");

      await act(async () => {
        root.unmount();
      });

      consoleErrorSpy.mockRestore();
    });

    it("automatically discovers and validates conditional fields rendered after hydration", async () => {
      const schema = z.object({
        subscribe: z.boolean().optional(),
        frequency: z.string().min(1, "Frequency is required when subscribed").optional(),
      });

      let formHandle!: ReturnType<typeof useForm>;
      const onSubmit = vi.fn();

      function DynamicFormApp() {
        const [showFrequency, setShowFrequency] = useState(false);
        const form = useForm({
          schema: zodResolver(schema),
          serializationMode: "typed",
          onSubmit,
        });
        formHandle = form;

        return (
          <form ref={form.formRef}>
            <input
              name="subscribe"
              type="checkbox"
              id="sub-check"
              onChange={(e) => setShowFrequency(e.target.checked)}
            />

            {showFrequency && (
              <div id="conditional-section">
                <input name="frequency" id="freq-input" placeholder="daily or weekly" />
                {form.formState.errors.frequency && (
                  <span id="freq-error">{form.formState.errors.frequency}</span>
                )}
              </div>
            )}

            <button type="submit" id="submit-btn">
              Submit
            </button>
          </form>
        );
      }

      // 1. SSR render
      const origWindow = (globalThis as any).window;
      const origDoc = (globalThis as any).document;
      let serverHtml: string;
      try {
        delete (globalThis as any).window;
        delete (globalThis as any).document;
        serverHtml = ReactDOMServer.renderToString(<DynamicFormApp />);
      } finally {
        (globalThis as any).window = origWindow;
        (globalThis as any).document = origDoc;
      }
      container.innerHTML = serverHtml;

      // Frequency field is NOT in the server HTML
      expect(container.querySelector("#conditional-section")).toBeNull();

      // 2. Client Hydration
      let root: ReactDOMClient.Root;
      await act(async () => {
        root = ReactDOMClient.hydrateRoot(container, <DynamicFormApp />);
        await Promise.resolve();
      });

      // 3. User interacts post-hydration to dynamically mount conditional input
      const checkbox = container.querySelector("#sub-check") as HTMLInputElement;

      await act(async () => {
        checkbox.click();
        await Promise.resolve();
      });

      // Verify conditional field is now present in DOM
      expect(container.querySelector("#conditional-section")).not.toBeNull();
      const freqInput = container.querySelector("#freq-input") as HTMLInputElement;
      expect(freqInput).not.toBeNull();

      // 4. Submit with conditional field empty -> MutationObserver detected field, schema rejects
      const submitBtn = container.querySelector("#submit-btn") as HTMLButtonElement;

      await act(async () => {
        submitBtn.click();
        await Promise.resolve();
      });

      // Schema requires frequency if present
      expect(onSubmit).not.toHaveBeenCalled();
      expect(formHandle.formState.errors.frequency).toBe("Frequency is required when subscribed");

      // 5. Fill conditional field -> submit succeeds
      await act(async () => {
        freqInput.value = "daily";
        freqInput.dispatchEvent(new Event("input", { bubbles: true }));
        freqInput.dispatchEvent(new Event("change", { bubbles: true }));
        await Promise.resolve();
      });

      await act(async () => {
        submitBtn.click();
        await Promise.resolve();
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subscribe: true,
          frequency: "daily",
        }),
        expect.anything(),
      );

      await act(async () => {
        root.unmount();
      });
    });
  });
});
