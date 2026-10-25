import { FieldNode } from "../field/FieldNode";
import { toNestedValues } from "../Path";
import {
  NativeFormElement,
  NativeFormFlatValues,
  NativeFormValues,
} from "../shared/types";

/**
 * Configuration options for field-driven serialization.
 * @public
 */
export interface SerializeFieldsOptions {
  /**
   * Whether to include disabled inputs in the serialized output.
   * @defaultValue false
   */
  includeDisabled?: boolean;

  /**
   * Whether to coerce standalone unchecked checkboxes to `false` instead of omitting them.
   * @defaultValue true
   */
  coerceUncheckedCheckboxes?: boolean;

  /**
   * Mode for value extraction:
   * - 'typed': preserves numbers (valueAsNumber), booleans, and FileLists.
   * - 'raw': extracts raw strings matching standard FormData entries.
   * @defaultValue 'typed'
   */
  valueMode?: "typed" | "raw";

  /**
   * Output structure format:
   * - 'flat': preserves exact input field names as top-level keys.
   * - 'nested': resolves dot and bracket notation into deeply nested objects and arrays.
   * @defaultValue 'flat'
   */
  nesting?: "flat" | "nested";

  /**
   * Custom value extractors for specific element tag names or input types.
   */
  customSerializers?: Record<
    string,
    (element: NativeFormElement, node: FieldNode) => unknown
  >;
}

/**
 * Handles serialization of HTML forms and field node collections into structured key-value maps.
 * @public
 */
export class Serializer {
  /**
   * Native FormData serialization baseline (100% backward compatible with browser form submission).
   */
  serialize(form: HTMLFormElement): NativeFormFlatValues {
    const formData = new FormData(form);
    const values: NativeFormFlatValues = {};

    for (const key of new Set(formData.keys())) {
      const entries = formData.getAll(key);
      values[key] = entries.length === 1 ? entries[0] : entries;
    }

    return values;
  }

  /**
   * Field-node-driven serialization supporting type preservation, unchecked checkbox coercion,
   * disabled filtering, and custom element serializers.
   */
  serializeFields(
    fields: Iterable<FieldNode>,
    options: SerializeFieldsOptions = {},
  ): NativeFormValues {
    const {
      includeDisabled = false,
      coerceUncheckedCheckboxes = true,
      valueMode = "typed",
      customSerializers = {},
      nesting = "flat",
    } = options;

    const values: Record<string, unknown> = {};
    const groupedArrays = new Map<string, unknown[]>();

    for (const node of fields) {
      const element = node.element;
      const name = node.name;

      if (!name) continue;
      if (!includeDisabled && "disabled" in element && element.disabled) continue;

      let value: unknown;

      // 1. Check custom serializers
      const tagName = element.tagName.toLowerCase();
      const inputType =
        element instanceof HTMLInputElement ? element.type : undefined;
      const customExtractor =
        customSerializers[tagName] ??
        (inputType ? customSerializers[inputType] : undefined);

      if (customExtractor) {
        value = customExtractor(element, node);
      } else if (valueMode === "raw") {
        if (element instanceof HTMLSelectElement && element.multiple) {
          value = Array.from(element.selectedOptions).map((o) => o.value);
        } else {
          value = element.value;
        }
      } else {
        value = node.value;
      }

      // 2. Radio button group resolution
      if (!customExtractor && element instanceof HTMLInputElement && element.type === "radio") {
        if (element.checked) {
          values[name] = valueMode === "raw" ? (element.value || "on") : node.value;
        } else if (!(name in values)) {
          values[name] = undefined;
        }
        continue;
      }

      // 3. Checkbox handling
      if (!customExtractor && element instanceof HTMLInputElement && element.type === "checkbox") {
        const hasExplicitValue =
          element.hasAttribute("value") && element.getAttribute("value") !== "on";

        if (hasExplicitValue) {
          // Grouped checkbox with value attribute (e.g. name="tags" value="react")
          if (!element.checked) {
            if (!(name in values)) {
              values[name] = [];
            } else if (!Array.isArray(values[name])) {
              const arr = [values[name]];
              groupedArrays.set(name, arr);
              values[name] = arr;
            }
            continue;
          }
          value = element.value;
        } else {
          // Standalone boolean checkbox (e.g. name="terms")
          if (element.checked) {
            value = valueMode === "raw" ? (element.value || "on") : true;
          } else {
            if (coerceUncheckedCheckboxes) {
              values[name] = false;
            }
            continue;
          }
        }
      }

      // 4. Duplicate name handling (e.g. multiple checkboxes or repeated fields)
      if (name in values) {
        if (!groupedArrays.has(name)) {
          const initial = values[name];
          const arr = Array.isArray(initial) ? [...initial] : [initial];
          groupedArrays.set(name, arr);
          values[name] = arr;
        }
        groupedArrays.get(name)!.push(value);
      } else {
        values[name] = value;
      }
    }

    if (nesting === "nested") {
      return toNestedValues(values) as NativeFormValues;
    }

    return values as NativeFormValues;
  }
}
