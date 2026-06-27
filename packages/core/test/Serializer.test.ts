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
});
