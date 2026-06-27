/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

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
});
