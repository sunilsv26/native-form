/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { Runtime } from "../src/Runtime";
import { Validator } from "../src/Validation";

function createForm(markup: string): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = markup;
  document.body.appendChild(form);
  return form;
}

describe("FailureModesAndBoundaries (Senior QA Test Matrix)", () => {
  describe("Lifecycle & Idempotency", () => {
    it("throws descriptive error when submitting unmounted runtime", async () => {
      const runtime = new Runtime();
      await expect(runtime.submit()).rejects.toThrow("Runtime is not mounted");
    });

    it("throws when calling serialize on unmounted runtime without preserveUnmountedValues", () => {
      const runtime = new Runtime();
      expect(() => runtime.serialize()).toThrow("Runtime is not mounted");
    });

    it("returns preserved values on unmounted serialize if preserveUnmountedValues is true", () => {
      const runtime = new Runtime({ preserveUnmountedValues: true });
      expect(runtime.serialize()).toEqual({});
    });

    it("handles multiple unmount calls idempotently without error", () => {
      const form = createForm(`<input name="username" value="test" />`);
      const runtime = new Runtime();
      runtime.mount(form);

      expect(() => {
        runtime.unmount();
        runtime.unmount();
        runtime.unmount();
      }).not.toThrow();

      form.remove();
    });

    it("handles mounting to a new form element cleanly and detaches previous listeners", () => {
      const formA = createForm(`<input name="step" value="A" />`);
      const formB = createForm(`<input name="step" value="B" />`);

      const runtime = new Runtime();
      runtime.mount(formA);
      expect(runtime.serialize()).toEqual({ step: "A" });

      // Mount to form B
      runtime.mount(formB);
      expect(runtime.serialize()).toEqual({ step: "B" });

      // Changing form A should NOT affect runtime
      const inputA = formA.elements.namedItem("step") as HTMLInputElement;
      inputA.value = "A_modified";
      inputA.dispatchEvent(new Event("input", { bubbles: true }));

      expect(runtime.serialize()).toEqual({ step: "B" });

      runtime.unmount();
      formA.remove();
      formB.remove();
    });

    it("returns undefined for getFieldValue and getFieldState on unmounted runtime", () => {
      const runtime = new Runtime();
      expect(runtime.getFieldValue("any")).toBeUndefined();
      expect(runtime.getFieldState("any")).toBeUndefined();
      expect(runtime.getFieldStates()).toEqual([]);
    });

    it("throws when validating unmounted runtime", async () => {
      const runtime = new Runtime();
      await expect(runtime.validate()).rejects.toThrow("Runtime is not mounted.");
    });
  });

  describe("HTML5 Spec Conformance & Extreme DOM Shapes", () => {
    it("handles an empty form with zero inputs cleanly", async () => {
      const form = createForm(``);
      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.fields).toEqual([]);
      expect(runtime.serialize()).toEqual({});
      expect(runtime.serializeFields()).toEqual({});

      const validation = await runtime.validate();
      expect(validation.success).toBe(true);

      let submitted = false;
      runtime.setOptions({
        onSubmit: () => {
          submitted = true;
        },
      });

      await runtime.submit();
      expect(submitted).toBe(true);

      runtime.unmount();
      form.remove();
    });

    it("strictly ignores inputs without name or with empty name attribute", () => {
      const form = createForm(`
        <input value="unnamed1" />
        <input name="" value="emptyName" />
        <input name="valid" value="correct" />
        <button name="" type="submit">Submit</button>
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.fields.map((f) => f.name)).toEqual(["valid"]);
      expect(runtime.serialize()).toEqual({ valid: "correct" });

      runtime.unmount();
      form.remove();
    });

    it("strictly excludes disabled inputs from both native and typed serialization (HTML5 spec)", () => {
      const form = createForm(`
        <input name="active" value="yes" />
        <input name="disabledText" value="secret" disabled />
        <input type="number" name="disabledNum" value="42" disabled />
        <input type="checkbox" name="disabledCheck" checked disabled />
        <select name="disabledSelect" disabled>
          <option value="1" selected>1</option>
        </select>
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.serialize()).toEqual({ active: "yes" });

      runtime.setOptions({ serializationMode: "typed" });
      expect(runtime.serializeFields()).toEqual({ active: "yes" });

      runtime.unmount();
      form.remove();
    });

    it("includes readonly inputs in serialization (HTML5 spec)", () => {
      const form = createForm(`
        <input name="readonlyField" value="locked-data" readonly />
        <input type="number" name="readonlyNum" value="100" readonly />
      `);

      const runtime = new Runtime({ serializationMode: "typed" });
      runtime.mount(form);

      expect(runtime.serializeFields()).toEqual({
        readonlyField: "locked-data",
        readonlyNum: 100,
      });

      runtime.unmount();
      form.remove();
    });

    it("handles <select multiple> with zero, single, and multiple selections", () => {
      const form = createForm(`
        <select name="tags" multiple>
          <option value="tech">Tech</option>
          <option value="news">News</option>
          <option value="sports">Sports</option>
        </select>
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      // Initially 0 selected (HTML5 FormData spec omits unselected multi-selects)
      expect(runtime.serialize()).toEqual({});
      expect(runtime.serializeFields()).toEqual({ tags: [] });

      const select = form.elements.namedItem("tags") as HTMLSelectElement;
      select.options[0].selected = true;
      expect(runtime.serialize()).toEqual({ tags: "tech" });
      expect(runtime.serializeFields()).toEqual({ tags: ["tech"] });

      select.options[2].selected = true;
      expect(runtime.serialize()).toEqual({ tags: ["tech", "sports"] });
      expect(runtime.serializeFields()).toEqual({ tags: ["tech", "sports"] });

      runtime.unmount();
      form.remove();
    });

    it("handles huge forms with 200 fields without performance degradation or error", () => {
      let inputsHtml = "";
      for (let i = 0; i < 200; i++) {
        inputsHtml += `<input name="field_${i}" value="val_${i}" />\n`;
      }
      const form = createForm(inputsHtml);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.fields.length).toBe(200);
      const serialized = runtime.serialize();
      expect(Object.keys(serialized).length).toBe(200);
      expect(serialized["field_199"]).toBe("val_199");

      runtime.unmount();
      form.remove();
    });
  });

  describe("Validation Crash Resilience & Async Race Conditions", () => {
    it("handles synchronous throws inside schema/validator gracefully", async () => {
      const crashingValidator: Validator = {
        validate: vi.fn(() => {
          throw new Error("Catastrophic database validator failure");
        }),
      };

      const runtime = new Runtime({ validator: crashingValidator });
      const form = createForm(`<input name="email" value="crash@test.com" />`);
      runtime.mount(form);

      await expect(runtime.validate()).rejects.toThrow(
        "Catastrophic database validator failure",
      );

      runtime.unmount();
      form.remove();
    });

    it("handles asynchronous promise rejection inside async validator gracefully", async () => {
      const runtime = new Runtime({
        asyncValidators: {
          email: async () => {
            throw new Error("HTTP 500 Internal Server Error");
          },
        },
      });

      const form = createForm(`<input name="email" value="err@server.com" />`);
      runtime.mount(form);

      const result = await runtime.validateFields(["email"]);
      expect(result.success).toBe(false);
      expect(runtime.getFormState().errors.email).toContain("HTTP 500");

      runtime.unmount();
      form.remove();
    });

    it("aborts in-flight async validations when a newer keystroke occurs", async () => {
      const abortSignals: boolean[] = [];

      const runtime = new Runtime({
        mode: "onChange",
        debounceMs: 10,
        asyncValidators: {
          username: async (val, ctx) => {
            await new Promise((r) => setTimeout(r, 40));
            abortSignals.push(ctx.signal.aborted);
            if (ctx.signal.aborted) return;
            if (val === "slow") return "Slow username is taken";
          },
        },
      });

      const form = createForm(`<input name="username" value="init" />`);
      runtime.mount(form);

      const input = form.elements.namedItem("username") as HTMLInputElement;

      // Trigger first validation
      input.value = "slow";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      // Immediately trigger second validation before first completes
      await new Promise((r) => setTimeout(r, 15));
      input.value = "fast";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      // Wait for both to complete
      await new Promise((r) => setTimeout(r, 70));

      // The first validation's abort signal should have been aborted
      expect(abortSignals.some((aborted) => aborted === true)).toBe(true);

      runtime.unmount();
      form.remove();
    });

    it("returns success when validateFields is called with non-existent field names", async () => {
      const form = createForm(`<input name="email" value="alex@example.com" />`);
      const runtime = new Runtime();
      runtime.mount(form);

      const result = await runtime.validateFields(["nonExistentField_123"]);
      expect(result.success).toBe(true);
      expect(runtime.getFormState().errors).toEqual({});

      runtime.unmount();
      form.remove();
    });

    it("returns success when validateFields is called with an empty array", async () => {
      const form = createForm(`<input name="email" value="alex@example.com" />`);
      const runtime = new Runtime();
      runtime.mount(form);

      const result = await runtime.validateFields([]);
      expect(result.success).toBe(true);
      expect(runtime.getFormState().errors).toEqual({});

      runtime.unmount();
      form.remove();
    });
  });

  describe("Security, Prototype Safety & Complex Paths", () => {
    it("never pollutes Object.prototype with malicious prototype keys in nested serialization", () => {
      const form = createForm(`
        <input name="__proto__.polluted" value="dangerous" />
        <input name="constructor.prototype.hacked" value="dangerous" />
        <input name="user.name" value="Alex" />
      `);

      const runtime = new Runtime({ nesting: "nested", serializationMode: "typed" });
      runtime.mount(form);

      const values = runtime.serializeFields() as any;

      expect(({} as any).polluted).toBeUndefined();
      expect(({} as any).hacked).toBeUndefined();
      expect(Object.prototype.hasOwnProperty("polluted")).toBe(false);
      expect(Object.prototype.hasOwnProperty("hacked")).toBe(false);

      runtime.unmount();
      form.remove();
    });

    it("supports ultra-deep nested paths without stack overflow", () => {
      const deepPath = "a.b.c.d.e.f.g.h.i.j.k.l";
      const form = createForm(`<input name="${deepPath}" value="deep_value" />`);

      const runtime = new Runtime({ nesting: "nested" });
      runtime.mount(form);

      const values: any = runtime.getFormState().values;
      expect(values.a.b.c.d.e.f.g.h.i.j.k.l).toBe("deep_value");
      expect(runtime.getFieldValue(deepPath)).toBe("deep_value");

      runtime.unmount();
      form.remove();
    });

    it("handles invalid or out-of-bounds array operations gracefully without throwing", () => {
      const form = createForm(`
        <input name="items.0.name" value="Item 1" />
        <input name="items.1.name" value="Item 2" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(() => {
        // Out of bounds operations
        runtime.removeArrayItem("items", -1);
        runtime.removeArrayItem("items", 999);
        runtime.swapArrayItems("items", -1, 100);
        runtime.moveArrayItem("items", 50, 60);
        runtime.insertArrayItem("items", -5);
        // Non-existent array
        runtime.removeArrayItem("doesNotExist", 0);
      }).not.toThrow();

      runtime.unmount();
      form.remove();
    });
  });
});

