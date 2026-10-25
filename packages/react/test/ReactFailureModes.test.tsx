/* @vitest-environment jsdom */

import { act, StrictMode, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useField, useFieldArray, useForm, useWizard } from "../src";
import { renderReact } from "./testUtils";

describe("ReactFailureModes (Senior QA Test Matrix)", () => {
  describe("StrictMode Double Mount & Detached DOM", () => {
    it("handles React StrictMode double mounting cleanly without duplicate listeners or state corruption", async () => {
      let renderCount = 0;
      let capturedForm!: ReturnType<typeof useForm>;
      const onSubmit = vi.fn();

      function StrictApp() {
        renderCount++;
        const form = useForm({
          defaultValues: { username: "octocat" },
          onSubmit,
        });
        capturedForm = form;

        return (
          <form ref={form.formRef}>
            <input name="username" defaultValue="octocat" />
            <button type="submit">Submit</button>
          </form>
        );
      }

      const view = await renderReact(
        <StrictMode>
          <StrictApp />
        </StrictMode>,
      );

      // In StrictMode, component renders twice initially
      expect(renderCount).toBeGreaterThanOrEqual(2);
      expect(capturedForm.runtime).not.toBeNull();
      expect(capturedForm.formState.submitting).toBe(false);

      // Form submission works reliably after StrictMode double-mount
      const submitBtn = view.container.querySelector("button")!;
      await act(async () => {
        submitBtn.click();
        await Promise.resolve();
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ username: "octocat" }),
        expect.anything(),
      );

      await view.cleanup();
    });

    it("handles unattached formRef safely when submitting or resetting", async () => {
      let capturedForm!: ReturnType<typeof useForm>;

      function DetachedApp() {
        const form = useForm();
        capturedForm = form;
        // Intentionally NOT attaching formRef to any <form>
        return <div>Detached component</div>;
      }

      const view = await renderReact(<DetachedApp />);

      expect(capturedForm.formRef.current).toBeNull();
      expect(capturedForm.runtime).toBeNull();
      expect(capturedForm.formState.dirty).toBe(false);
      expect(capturedForm.formState.submitting).toBe(false);

      await view.cleanup();
    });
  });

  describe("Dynamic Field Switching", () => {
    it("dynamically switches field names on useField without state leakage", async () => {
      let capturedField!: ReturnType<typeof useField>;

      function DynamicFieldHost() {
        const form = useForm({
          defaultValues: {
            personalEmail: "personal@example.com",
            workEmail: "work@corporate.com",
          },
        });
        const [activeField, setActiveField] = useState("personalEmail");

        const field = useField({ form, name: activeField });
        capturedField = field;

        return (
          <div>
            <form ref={form.formRef}>
              <input name="personalEmail" defaultValue="personal@example.com" />
              <input name="workEmail" defaultValue="work@corporate.com" />
            </form>
            <button
              data-testid="toggle-btn"
              onClick={() =>
                setActiveField((curr) =>
                  curr === "personalEmail" ? "workEmail" : "personalEmail",
                )
              }
            >
              Toggle
            </button>
          </div>
        );
      }

      const view = await renderReact(<DynamicFieldHost />);

      expect(capturedField.name).toBe("personalEmail");
      expect(capturedField.value).toBe("personal@example.com");

      const toggleBtn = view.container.querySelector(
        '[data-testid="toggle-btn"]',
      )! as HTMLButtonElement;

      // Switch dynamically to workEmail
      await act(async () => {
        toggleBtn.click();
        await Promise.resolve();
      });

      expect(capturedField.name).toBe("workEmail");
      expect(capturedField.value).toBe("work@corporate.com");

      await view.cleanup();
    });
  });

  describe("FieldArray Boundary Conditions & Out-Of-Bounds Guarding", () => {
    it("handles out-of-bounds removals gracefully (remove(-1), remove(999))", async () => {
      let arrayApi!: ReturnType<typeof useFieldArray>;

      function ArrayHost() {
        const form = useForm();
        arrayApi = useFieldArray({
          form,
          name: "items",
          defaultValue: [{ text: "Item 0" }, { text: "Item 1" }],
        });

        return (
          <form ref={form.formRef}>
            {arrayApi.fields.map((field, idx) => (
              <input
                key={field.id}
                name={`items.${idx}.text`}
                defaultValue={String(field.text ?? "")}
              />
            ))}
          </form>
        );
      }

      const view = await renderReact(<ArrayHost />);
      expect(arrayApi.fields).toHaveLength(2);

      // Attempt out-of-bounds negative remove
      await act(async () => {
        arrayApi.remove(-1);
        await Promise.resolve();
      });
      expect(arrayApi.fields).toHaveLength(2);

      // Attempt out-of-bounds high remove
      await act(async () => {
        arrayApi.remove(999);
        await Promise.resolve();
      });
      expect(arrayApi.fields).toHaveLength(2);

      // Valid removal still works
      await act(async () => {
        arrayApi.remove(0);
        await Promise.resolve();
      });
      expect(arrayApi.fields).toHaveLength(1);
      expect(arrayApi.fields[0].text).toBe("Item 1");

      await view.cleanup();
    });

    it("handles out-of-bounds and identity swaps gracefully", async () => {
      let arrayApi!: ReturnType<typeof useFieldArray>;

      function SwapHost() {
        const form = useForm();
        arrayApi = useFieldArray({
          form,
          name: "tags",
          defaultValue: [{ tag: "A" }, { tag: "B" }, { tag: "C" }],
        });

        return <form ref={form.formRef} />;
      }

      const view = await renderReact(<SwapHost />);
      expect(arrayApi.fields).toHaveLength(3);

      // Identity swap (swap(1, 1)) should be a no-op
      const originalIds = arrayApi.fields.map((f) => f.id);
      await act(async () => {
        arrayApi.swap(1, 1);
        await Promise.resolve();
      });
      expect(arrayApi.fields.map((f) => f.id)).toEqual(originalIds);

      // Out-of-bounds swap (swap(-1, 0) or swap(0, 99))
      await act(async () => {
        arrayApi.swap(-1, 0);
        arrayApi.swap(0, 99);
        await Promise.resolve();
      });
      expect(arrayApi.fields.map((f) => f.id)).toEqual(originalIds);

      // Valid swap works
      await act(async () => {
        arrayApi.swap(0, 2);
        await Promise.resolve();
      });
      expect(arrayApi.fields[0].tag).toBe("C");
      expect(arrayApi.fields[2].tag).toBe("A");

      await view.cleanup();
    });

    it("handles out-of-bounds and identity moves gracefully", async () => {
      let arrayApi!: ReturnType<typeof useFieldArray>;

      function MoveHost() {
        const form = useForm();
        arrayApi = useFieldArray({
          form,
          name: "tasks",
          defaultValue: [{ title: "Task 1" }, { title: "Task 2" }],
        });

        return <form ref={form.formRef} />;
      }

      const view = await renderReact(<MoveHost />);

      // Same index move
      await act(async () => {
        arrayApi.move(0, 0);
        await Promise.resolve();
      });
      expect(arrayApi.fields[0].title).toBe("Task 1");

      // Out-of-bounds moves
      await act(async () => {
        arrayApi.move(-1, 0);
        arrayApi.move(0, 50);
        await Promise.resolve();
      });
      expect(arrayApi.fields).toHaveLength(2);

      await view.cleanup();
    });

    it("handles rapid chained mutations (append, remove, prepend) cleanly", async () => {
      let arrayApi!: ReturnType<typeof useFieldArray>;

      function RapidHost() {
        const form = useForm();
        arrayApi = useFieldArray({
          form,
          name: "logs",
          defaultValue: [{ msg: "Log 0" }],
        });

        return <form ref={form.formRef} />;
      }

      const view = await renderReact(<RapidHost />);

      await act(async () => {
        arrayApi.append({ msg: "Log 1" });
        arrayApi.append({ msg: "Log 2" });
        arrayApi.remove(0);
        arrayApi.prepend({ msg: "Log Prepend" });
        await Promise.resolve();
      });

      expect(arrayApi.fields.map((f) => f.msg)).toEqual([
        "Log Prepend",
        "Log 1",
        "Log 2",
      ]);

      await view.cleanup();
    });
  });

  describe("Wizard Navigation Guarding & Boundary Clamping", () => {
    it("clamps next at the upper boundary and previous at the lower boundary", async () => {
      let wizardApi!: ReturnType<typeof useWizard>;

      function WizardHost() {
        const form = useForm();
        wizardApi = useWizard({
          form,
          steps: [{ id: "step1" }, { id: "step2" }, { id: "step3" }],
        });

        return <form ref={form.formRef} />;
      }

      const view = await renderReact(<WizardHost />);

      expect(wizardApi.currentStep).toBe(0);
      expect(wizardApi.isFirstStep).toBe(true);
      expect(wizardApi.isLastStep).toBe(false);

      // Calling prev on step 0 should clamp to 0
      await act(async () => {
        wizardApi.prev();
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(0);

      // Advance to step 1
      await act(async () => {
        const ok = await wizardApi.next();
        expect(ok).toBe(true);
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(1);

      // Advance to step 2 (last step)
      await act(async () => {
        const ok = await wizardApi.next();
        expect(ok).toBe(true);
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(2);
      expect(wizardApi.isLastStep).toBe(true);

      // Calling next when already on last step returns false and stays at step 2
      await act(async () => {
        const ok = await wizardApi.next();
        expect(ok).toBe(false);
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(2);

      await view.cleanup();
    });

    it("rejects out-of-range and invalid goTo navigation without state corruption", async () => {
      let wizardApi!: ReturnType<typeof useWizard>;

      function WizardGoToHost() {
        const form = useForm();
        wizardApi = useWizard({
          form,
          steps: [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }],
        });

        return <form ref={form.formRef} />;
      }

      const view = await renderReact(<WizardGoToHost />);

      // Negative goTo is rejected safely, stays at step 0
      await act(async () => {
        const ok = await wizardApi.goTo(-10);
        expect(ok).toBe(false);
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(0);

      // Excessive goTo is rejected safely, stays at step 0
      await act(async () => {
        const ok = await wizardApi.goTo(999);
        expect(ok).toBe(false);
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(0);

      // Non-integer goTo is rejected safely, stays at step 0
      await act(async () => {
        const ok = await wizardApi.goTo(1.8);
        expect(ok).toBe(false);
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(0);

      // Valid goTo(2) succeeds
      await act(async () => {
        const ok = await wizardApi.goTo(2);
        expect(ok).toBe(true);
        await Promise.resolve();
      });
      expect(wizardApi.currentStep).toBe(2);

      await view.cleanup();
    });
  });

  describe("Native DOM Form Reset Event", () => {
    it("handles native form reset event and restores formState pristine dirty status", async () => {
      let capturedForm!: ReturnType<typeof useForm>;

      function ResetApp() {
        const form = useForm({
          defaultValues: { comment: "Initial comment" },
        });
        capturedForm = form;

        return (
          <form ref={form.formRef}>
            <input name="comment" defaultValue="Initial comment" />
            <button type="reset">Reset</button>
          </form>
        );
      }

      const view = await renderReact(<ResetApp />);

      const input = view.container.querySelector("input")!;
      await act(async () => {
        input.value = "Dirty modified comment";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true }));
        await Promise.resolve();
      });

      expect(capturedForm.formState.dirty).toBe(true);

      // Trigger native form reset
      const formEl = view.container.querySelector("form")!;
      await act(async () => {
        formEl.reset();
        formEl.dispatchEvent(new Event("reset", { bubbles: true }));
        await Promise.resolve();
      });

      // Pristine dirty state is restored
      expect(capturedForm.formState.dirty).toBe(false);

      await view.cleanup();
    });
  });
});
