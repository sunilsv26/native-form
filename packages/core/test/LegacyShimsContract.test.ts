/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { Discovery as DiscoveryFlat } from "../src/Discovery";
import { Discovery as DiscoveryLayered } from "../src/discovery/Discovery";
import { FieldNode as FieldNodeFlat } from "../src/FieldNode";
import { FieldNode as FieldNodeLayered } from "../src/field/FieldNode";
import { FieldRegistry as FieldRegistryFlat } from "../src/FieldRegistry";
import { FieldRegistry as FieldRegistryLayered } from "../src/field/FieldRegistry";
import { FieldErrorRenderer as FieldErrorRendererFlat } from "../src/FieldErrorRenderer";
import { FieldErrorRenderer as FieldErrorRendererLayered } from "../src/errors/FieldErrorRenderer";
import { Runtime as RuntimeFlat } from "../src/Runtime";
import { Runtime as RuntimeLayered } from "../src/runtime/Runtime";
import {
  isRuntimeMutationRelevant as isRuntimeMutationRelevantFlat,
  runtimeMutationObserverOptions as runtimeMutationObserverOptionsFlat,
} from "../src/RuntimeMutationPolicy";
import {
  isRuntimeMutationRelevant as isRuntimeMutationRelevantLayered,
  runtimeMutationObserverOptions as runtimeMutationObserverOptionsLayered,
} from "../src/runtime/RuntimeMutationPolicy";
import { Serializer as SerializerFlat } from "../src/Serializer";
import { Serializer as SerializerLayered } from "../src/serialization/Serializer";
import { createValidator as createValidatorFlat } from "../src/Validation";
import { createValidator as createValidatorLayered } from "../src/validation/Validation";
import { createValidationPipeline as createValidationPipelineFlat } from "../src/ValidationPipeline";
import { createValidationPipeline as createValidationPipelineLayered } from "../src/validation/ValidationPipeline";

describe("LegacyFlatPathShims", () => {
  it("keeps flat exports wired to layered module symbols", () => {
    expect(DiscoveryFlat).toBe(DiscoveryLayered);
    expect(FieldNodeFlat).toBe(FieldNodeLayered);
    expect(FieldRegistryFlat).toBe(FieldRegistryLayered);
    expect(FieldErrorRendererFlat).toBe(FieldErrorRendererLayered);
    expect(RuntimeFlat).toBe(RuntimeLayered);
    expect(SerializerFlat).toBe(SerializerLayered);
    expect(createValidatorFlat).toBe(createValidatorLayered);
    expect(createValidationPipelineFlat).toBe(createValidationPipelineLayered);
    expect(isRuntimeMutationRelevantFlat).toBe(
      isRuntimeMutationRelevantLayered,
    );
    expect(runtimeMutationObserverOptionsFlat).toBe(
      runtimeMutationObserverOptionsLayered,
    );
  });
});
