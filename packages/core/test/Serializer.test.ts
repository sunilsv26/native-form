/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { FieldNode } from "../src/field/FieldNode";
import { Serializer } from "../src/Serializer";

describe("Serializer", () => {
  it("serializes single and repeated field entries", () => {
    const form = document.createElement("form");

    const email = document.createElement("input");
    email.name = "email";
    email.value = "a@example.com";

    const role1 = document.createElement("input");
    role1.name = "roles";
    role1.value = "admin";

    const role2 = document.createElement("input");
    role2.name = "roles";
    role2.value = "editor";

    form.append(email, role1, role2);

    const serializer = new Serializer();

    expect(serializer.serialize(form)).toEqual({
      email: "a@example.com",
      roles: ["admin", "editor"],
    });
  });

  it("reflects native FormData semantics for checkboxes", () => {
    const form = document.createElement("form");

    const checked = document.createElement("input");
    checked.type = "checkbox";
    checked.name = "terms";
    checked.value = "yes";
    checked.checked = true;

    const unchecked = document.createElement("input");
    unchecked.type = "checkbox";
    unchecked.name = "newsletter";
    unchecked.value = "subscribed";
    unchecked.checked = false;

    form.append(checked, unchecked);

    const serializer = new Serializer();

    expect(serializer.serialize(form)).toEqual({
      terms: "yes",
    });
  });

  it("serializes checked radio value only", () => {
    const form = document.createElement("form");

    const basic = document.createElement("input");
    basic.type = "radio";
    basic.name = "plan";
    basic.value = "basic";

    const pro = document.createElement("input");
    pro.type = "radio";
    pro.name = "plan";
    pro.value = "pro";
    pro.checked = true;

    form.append(basic, pro);

    const serializer = new Serializer();

    expect(serializer.serialize(form)).toEqual({
      plan: "pro",
    });
  });

  it("serializes select-multiple and ignores disabled controls", () => {
    const form = document.createElement("form");

    const tags = document.createElement("select");
    tags.name = "tags";
    tags.multiple = true;

    const tagA = document.createElement("option");
    tagA.value = "a";
    tagA.selected = true;

    const tagB = document.createElement("option");
    tagB.value = "b";
    tagB.selected = true;

    tags.append(tagA, tagB);

    const enabled = document.createElement("input");
    enabled.name = "email";
    enabled.value = "a@example.com";

    const disabled = document.createElement("input");
    disabled.name = "internal";
    disabled.value = "secret";
    disabled.disabled = true;

    form.append(tags, enabled, disabled);

    const serializer = new Serializer();

    expect(serializer.serialize(form)).toEqual({
      tags: ["a", "b"],
      email: "a@example.com",
    });
  });

  describe("serializeFields", () => {
    it("extracts typed values for numbers and standalone boolean checkboxes", () => {
      const ageInput = document.createElement("input");
      ageInput.type = "number";
      ageInput.name = "age";
      ageInput.value = "28";

      const termsInput = document.createElement("input");
      termsInput.type = "checkbox";
      termsInput.name = "terms";
      termsInput.checked = true;

      const uncheckedTerms = document.createElement("input");
      uncheckedTerms.type = "checkbox";
      uncheckedTerms.name = "newsletter";
      uncheckedTerms.checked = false;

      const fields = [
        new FieldNode(ageInput),
        new FieldNode(termsInput),
        new FieldNode(uncheckedTerms),
      ];

      const serializer = new Serializer();
      expect(serializer.serializeFields(fields)).toEqual({
        age: 28,
        terms: true,
        newsletter: false,
      });
    });

    it("respects coerceUncheckedCheckboxes: false by omitting unchecked checkboxes", () => {
      const termsInput = document.createElement("input");
      termsInput.type = "checkbox";
      termsInput.name = "terms";
      termsInput.checked = false;

      const fields = [new FieldNode(termsInput)];
      const serializer = new Serializer();

      expect(
        serializer.serializeFields(fields, {
          coerceUncheckedCheckboxes: false,
        }),
      ).toEqual({});
    });

    it("extracts raw string values when valueMode is 'raw'", () => {
      const ageInput = document.createElement("input");
      ageInput.type = "number";
      ageInput.name = "age";
      ageInput.value = "42";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "active";
      checkbox.value = "yes";
      checkbox.checked = true;

      const fields = [new FieldNode(ageInput), new FieldNode(checkbox)];
      const serializer = new Serializer();

      expect(serializer.serializeFields(fields, { valueMode: "raw" })).toEqual({
        age: "42",
        active: "yes",
      });
    });

    it("handles grouped checkboxes with explicit values", () => {
      const serializer = new Serializer();

      const createRoles = (checkedStates: boolean[]) => {
        const roles = ["admin", "viewer", "editor"];
        return roles.map((role, i) => {
          const input = document.createElement("input");
          input.type = "checkbox";
          input.name = "roles";
          input.value = role;
          input.checked = checkedStates[i];
          return new FieldNode(input);
        });
      };

      // None checked -> empty array []
      expect(
        serializer.serializeFields(createRoles([false, false, false])),
      ).toEqual({
        roles: [],
      });

      // Multiple checked -> ["admin", "editor"]
      expect(
        serializer.serializeFields(createRoles([true, false, true])),
      ).toEqual({
        roles: ["admin", "editor"],
      });

      // First one checked only -> ["admin"]
      expect(
        serializer.serializeFields(createRoles([true, false, false])),
      ).toEqual({
        roles: ["admin"],
      });

      // Second one checked only -> ["viewer"]
      expect(
        serializer.serializeFields(createRoles([false, true, false])),
      ).toEqual({
        roles: ["viewer"],
      });
    });

    it("resolves radio button groups correctly", () => {
      const serializer = new Serializer();

      const radio1 = document.createElement("input");
      radio1.type = "radio";
      radio1.name = "plan";
      radio1.value = "free";

      const radio2 = document.createElement("input");
      radio2.type = "radio";
      radio2.name = "plan";
      radio2.value = "pro";
      radio2.checked = true;

      expect(
        serializer.serializeFields([
          new FieldNode(radio1),
          new FieldNode(radio2),
        ]),
      ).toEqual({
        plan: "pro",
      });

      // When no radio in group is checked -> undefined
      radio2.checked = false;
      expect(
        serializer.serializeFields([
          new FieldNode(radio1),
          new FieldNode(radio2),
        ]),
      ).toEqual({
        plan: undefined,
      });
    });

    it("omits disabled controls by default and includes them when includeDisabled: true", () => {
      const enabled = document.createElement("input");
      enabled.name = "title";
      enabled.value = "Engineer";

      const disabled = document.createElement("input");
      disabled.name = "salary";
      disabled.value = "100000";
      disabled.disabled = true;

      const fields = [new FieldNode(enabled), new FieldNode(disabled)];
      const serializer = new Serializer();

      expect(serializer.serializeFields(fields)).toEqual({
        title: "Engineer",
      });

      expect(
        serializer.serializeFields(fields, { includeDisabled: true }),
      ).toEqual({
        title: "Engineer",
        salary: "100000",
      });
    });

    it("supports custom serializers for tag names or input types", () => {
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.name = "birthDate";
      dateInput.value = "2000-01-01";

      const select = document.createElement("select");
      select.name = "rating";
      const option = document.createElement("option");
      option.value = "5";
      option.selected = true;
      select.append(option);

      const fields = [new FieldNode(dateInput), new FieldNode(select)];
      const serializer = new Serializer();

      const result = serializer.serializeFields(fields, {
        customSerializers: {
          date: (el) => new Date((el as HTMLInputElement).value).getFullYear(),
          select: (el) => Number((el as HTMLSelectElement).value),
        },
      });

      expect(result).toEqual({
        birthDate: 2000,
        rating: 5,
      });
    });

    it("serializes select-multiple as an array of values", () => {
      const select = document.createElement("select");
      select.name = "colors";
      select.multiple = true;

      const red = document.createElement("option");
      red.value = "red";
      red.selected = true;

      const blue = document.createElement("option");
      blue.value = "blue";
      blue.selected = true;

      const green = document.createElement("option");
      green.value = "green";
      green.selected = false;

      select.append(red, blue, green);

      const fields = [new FieldNode(select)];
      const serializer = new Serializer();

      expect(serializer.serializeFields(fields)).toEqual({
        colors: ["red", "blue"],
      });
    });

    it("resolves nested objects and arrays when nesting is 'nested' (RFC 003)", () => {
      const name = document.createElement("input");
      name.name = "user.profile.name";
      name.value = "Alice";

      const age = document.createElement("input");
      age.name = "user[profile][age]";
      age.type = "number";
      age.value = "28";

      const task0 = document.createElement("input");
      task0.name = "tasks[0].title";
      task0.value = "First";

      const task1 = document.createElement("input");
      task1.name = "tasks[1].title";
      task1.value = "Second";

      const fields = [
        new FieldNode(name),
        new FieldNode(age),
        new FieldNode(task0),
        new FieldNode(task1),
      ];

      const serializer = new Serializer();

      expect(serializer.serializeFields(fields, { nesting: "nested" })).toEqual({
        user: {
          profile: {
            name: "Alice",
            age: 28,
          },
        },
        tasks: [
          { title: "First" },
          { title: "Second" },
        ],
      });
    });
  });
});
