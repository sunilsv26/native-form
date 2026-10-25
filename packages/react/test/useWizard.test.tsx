/* @vitest-environment jsdom */

import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { useField, useForm, useWizard, WizardStepConfig } from "../src";
import { renderReact } from "./testUtils";

describe("useWizard", () => {
  const steps: WizardStepConfig[] = [
    { id: "personal", title: "Personal Details", fields: ["firstName", "email"] },
    { id: "shipping", title: "Shipping Address", fields: ["address", "zipCode"] },
    { id: "review", title: "Review & Confirm" },
  ];

  it("initializes with step 0, correct progress, and boundaries", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;

    function TestComponent() {
      const form = useForm();
      wizardApi = useWizard({
        form,
        steps,
      });

      return (
        <form ref={form.formRef}>
          <input name="firstName" defaultValue="John" />
          <input name="email" defaultValue="john@example.com" />
          <input name="address" defaultValue="123 Main St" />
          <input name="zipCode" defaultValue="12345" />
        </form>
      );
    }

    const view = await renderReact(<TestComponent />);

    expect(wizardApi.currentStep).toBe(0);
    expect(wizardApi.stepId).toBe("personal");
    expect(wizardApi.stepConfig.title).toBe("Personal Details");
    expect(wizardApi.totalSteps).toBe(3);
    expect(wizardApi.isFirstStep).toBe(true);
    expect(wizardApi.isLastStep).toBe(false);
    expect(wizardApi.progress).toBeCloseTo(1 / 3, 5);

    await view.cleanup();
  });

  it("respects initialStep option and clamps boundaries", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;

    function TestComponent({ initial }: { initial: number }) {
      const form = useForm();
      wizardApi = useWizard({
        form,
        steps,
        initialStep: initial,
      });

      return <form ref={form.formRef} />;
    }

    const view1 = await renderReact(<TestComponent initial={1} />);
    expect(wizardApi.currentStep).toBe(1);
    expect(wizardApi.stepId).toBe("shipping");
    expect(wizardApi.isFirstStep).toBe(false);
    expect(wizardApi.isLastStep).toBe(false);
    expect(wizardApi.progress).toBeCloseTo(2 / 3, 5);
    await view1.cleanup();

    const view2 = await renderReact(<TestComponent initial={99} />);
    expect(wizardApi.currentStep).toBe(2);
    expect(wizardApi.stepId).toBe("review");
    expect(wizardApi.isFirstStep).toBe(false);
    expect(wizardApi.isLastStep).toBe(true);
    expect(wizardApi.progress).toBe(1);
    await view2.cleanup();

    const view3 = await renderReact(<TestComponent initial={-5} />);
    expect(wizardApi.currentStep).toBe(0);
    await view3.cleanup();
  });

  it("handles empty steps gracefully", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;

    function TestComponent() {
      const form = useForm();
      wizardApi = useWizard({
        form,
        steps: [],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);
    expect(wizardApi.currentStep).toBe(0);
    expect(wizardApi.stepId).toBe("");
    expect(wizardApi.totalSteps).toBe(0);
    expect(wizardApi.isFirstStep).toBe(true);
    expect(wizardApi.isLastStep).toBe(true);
    expect(wizardApi.progress).toBe(0);

    let nextResult = true;
    await act(async () => {
      nextResult = await wizardApi.next();
    });
    expect(nextResult).toBe(false);

    await view.cleanup();
  });

  it("gates step advancement when current step fields are invalid", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;
    const onStepChange = vi.fn();

    const validator = {
      validate(values: Record<string, unknown>) {
        const issues: Array<{ name: string; message: string }> = [];
        if (!values.firstName) {
          issues.push({ name: "firstName", message: "First name is required" });
        }
        if (!values.email || !String(values.email).includes("@")) {
          issues.push({ name: "email", message: "Valid email is required" });
        }
        if (!values.address) {
          issues.push({ name: "address", message: "Address is required" });
        }
        if (issues.length > 0) {
          return { success: false as const, issues };
        }
        return { success: true as const, values };
      },
    };

    function TestComponent() {
      const form = useForm({ validator });
      wizardApi = useWizard({
        form,
        steps,
        onStepChange,
      });

      const firstName = useField({ form, name: "firstName" });
      const email = useField({ form, name: "email" });

      return (
        <form ref={form.formRef}>
          <input name="firstName" defaultValue="" />
          <span data-testid="firstNameError">{firstName.error ?? ""}</span>
          <input name="email" defaultValue="" />
          <span data-testid="emailError">{email.error ?? ""}</span>
          <input name="address" defaultValue="" />
          <input name="zipCode" defaultValue="" />
        </form>
      );
    }

    const view = await renderReact(<TestComponent />);

    // Attempt to advance while Step 1 fields are empty
    let nextSuccess: boolean | undefined;
    await act(async () => {
      nextSuccess = await wizardApi.next();
    });

    expect(nextSuccess).toBe(false);
    expect(wizardApi.currentStep).toBe(0);
    expect(onStepChange).not.toHaveBeenCalled();

    // Check that targeted errors were emitted on step 1 fields
    const firstNameErr = view.container.querySelector("[data-testid='firstNameError']");
    const emailErr = view.container.querySelector("[data-testid='emailError']");
    expect(firstNameErr?.textContent).toBe("First name is required");
    expect(emailErr?.textContent).toBe("Valid email is required");

    // Populate only firstName, email still invalid
    const firstInput = view.container.querySelector("input[name='firstName']") as HTMLInputElement;
    await act(async () => {
      firstInput.value = "Jane";
      firstInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      nextSuccess = await wizardApi.next();
    });
    expect(nextSuccess).toBe(false);
    expect(wizardApi.currentStep).toBe(0);

    // Populate email validly
    const emailInput = view.container.querySelector("input[name='email']") as HTMLInputElement;
    await act(async () => {
      emailInput.value = "jane@example.com";
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      nextSuccess = await wizardApi.next();
    });

    expect(nextSuccess).toBe(true);
    expect(wizardApi.currentStep).toBe(1);
    expect(wizardApi.stepId).toBe("shipping");
    expect(wizardApi.progress).toBeCloseTo(2 / 3, 5);
    expect(onStepChange).toHaveBeenCalledWith(0, 1);

    await view.cleanup();
  });

  it("supports unvalidated backward retreat via prev()", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;
    const onStepChange = vi.fn();

    function TestComponent() {
      const form = useForm();
      wizardApi = useWizard({
        form,
        steps,
        initialStep: 1,
        onStepChange,
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);

    expect(wizardApi.currentStep).toBe(1);

    await act(async () => {
      wizardApi.prev();
    });

    expect(wizardApi.currentStep).toBe(0);
    expect(wizardApi.stepId).toBe("personal");
    expect(onStepChange).toHaveBeenCalledWith(1, 0);

    // Calling prev on step 0 does nothing
    await act(async () => {
      wizardApi.prev();
    });
    expect(wizardApi.currentStep).toBe(0);
    expect(onStepChange).toHaveBeenCalledTimes(1);

    await view.cleanup();
  });

  it("navigates directly with goTo(index), validating only forward jumps", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;
    const onStepChange = vi.fn();

    const validator = {
      validate(values: Record<string, unknown>) {
        if (!values.firstName) {
          return {
            success: false as const,
            issues: [{ name: "firstName", message: "First name required" }],
          };
        }
        return { success: true as const, values };
      },
    };

    function TestComponent() {
      const form = useForm({ validator });
      wizardApi = useWizard({
        form,
        steps,
        onStepChange,
      });

      return (
        <form ref={form.formRef}>
          <input name="firstName" defaultValue="" />
        </form>
      );
    }

    const view = await renderReact(<TestComponent />);

    // goTo current step returns true
    let res: boolean | undefined;
    await act(async () => {
      res = await wizardApi.goTo(0);
    });
    expect(res).toBe(true);

    // goTo invalid step returns false
    await act(async () => {
      res = await wizardApi.goTo(-1);
    });
    expect(res).toBe(false);

    await act(async () => {
      res = await wizardApi.goTo(5);
    });
    expect(res).toBe(false);

    // Forward goTo is blocked by step 0 validation
    await act(async () => {
      res = await wizardApi.goTo(2);
    });
    expect(res).toBe(false);
    expect(wizardApi.currentStep).toBe(0);

    // Fix validation error
    const input = view.container.querySelector("input[name='firstName']") as HTMLInputElement;
    await act(async () => {
      input.value = "Alice";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Forward goTo succeeds
    await act(async () => {
      res = await wizardApi.goTo(2);
    });
    expect(res).toBe(true);
    expect(wizardApi.currentStep).toBe(2);
    expect(wizardApi.isLastStep).toBe(true);
    expect(onStepChange).toHaveBeenCalledWith(0, 2);

    // Backward goTo allows retreat without validation
    await act(async () => {
      res = await wizardApi.goTo(0);
    });
    expect(res).toBe(true);
    expect(wizardApi.currentStep).toBe(0);
    expect(onStepChange).toHaveBeenCalledWith(2, 0);

    await view.cleanup();
  });

  it("advances unhindered when step has no fields or schema", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;

    function TestComponent() {
      const form = useForm();
      wizardApi = useWizard({
        form,
        steps: [
          { id: "intro", title: "Welcome" },
          { id: "details", fields: ["name"] },
        ],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);
    expect(wizardApi.currentStep).toBe(0);

    let res: boolean | undefined;
    await act(async () => {
      res = await wizardApi.next();
    });
    expect(res).toBe(true);
    expect(wizardApi.currentStep).toBe(1);

    // Last step next() returns false
    await act(async () => {
      res = await wizardApi.next();
    });
    expect(res).toBe(false);
    expect(wizardApi.currentStep).toBe(1);

    await view.cleanup();
  });

  it("supports async validators during next() navigation", async () => {
    let wizardApi!: ReturnType<typeof useWizard>;

    function TestComponent() {
      const form = useForm({
        asyncValidators: {
          username: async (value) => {
            if (value === "taken") {
              return "Username is already taken";
            }
            return undefined;
          },
        },
      });

      wizardApi = useWizard({
        form,
        steps: [
          { id: "account", fields: ["username"] },
          { id: "done" },
        ],
      });

      return (
        <form ref={form.formRef}>
          <input name="username" defaultValue="taken" />
        </form>
      );
    }

    const view = await renderReact(<TestComponent />);

    let res: boolean | undefined;
    await act(async () => {
      res = await wizardApi.next();
    });
    expect(res).toBe(false);
    expect(wizardApi.currentStep).toBe(0);

    // Update username to available value
    const input = view.container.querySelector("input[name='username']") as HTMLInputElement;
    await act(async () => {
      input.value = "available_user";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      res = await wizardApi.next();
    });
    expect(res).toBe(true);
    expect(wizardApi.currentStep).toBe(1);

    await view.cleanup();
  });
});
