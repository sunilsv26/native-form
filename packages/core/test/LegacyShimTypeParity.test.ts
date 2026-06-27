import { describe, expect, it } from "vitest";

import type {
  FieldState as FieldStateFlat,
  NativeFormElement as NativeFormElementFlat,
  NativeFormFlatValues as NativeFormFlatValuesFlat,
  NativeFormNestedValue as NativeFormNestedValueFlat,
  NativeFormValue as NativeFormValueFlat,
  NativeFormValues as NativeFormValuesFlat,
  RuntimeEvent as RuntimeEventFlat,
  RuntimeEventType as RuntimeEventTypeFlat,
  RuntimeListener as RuntimeListenerFlat,
} from "../src/types";
import type { FieldState as FieldStateLayered } from "../src/field/FieldState";
import type {
  NativeFormElement as NativeFormElementLayered,
  NativeFormFlatValues as NativeFormFlatValuesLayered,
  NativeFormNestedValue as NativeFormNestedValueLayered,
  NativeFormValue as NativeFormValueLayered,
  NativeFormValues as NativeFormValuesLayered,
  RuntimeEvent as RuntimeEventLayered,
  RuntimeEventType as RuntimeEventTypeLayered,
  RuntimeListener as RuntimeListenerLayered,
} from "../src/shared/types";
import type {
  Runtime as RuntimeFlat,
  RuntimeFormState as RuntimeFormStateFlat,
  RuntimeOptions as RuntimeOptionsFlat,
  RuntimePublicApi as RuntimePublicApiFlat,
  InferSchemaOutput as InferSchemaOutputFlat,
  SchemaLike as SchemaLikeFlat,
  StandardSchemaIssue as StandardSchemaIssueFlat,
  StandardSchemaResult as StandardSchemaResultFlat,
  StandardSchemaV1 as StandardSchemaV1Flat,
  ValidationContext as ValidationContextFlat,
  ValidationIssue as ValidationIssueFlat,
  ValidationResult as ValidationResultFlat,
  Validator as ValidatorFlat,
} from "../src/Validation";
import type {
  Runtime as RuntimeLayered,
  RuntimeFormState as RuntimeFormStateLayered,
  RuntimeOptions as RuntimeOptionsLayered,
  RuntimePublicApi as RuntimePublicApiLayered,
  InferSchemaOutput as InferSchemaOutputLayered,
  SchemaLike as SchemaLikeLayered,
  StandardSchemaIssue as StandardSchemaIssueLayered,
  StandardSchemaResult as StandardSchemaResultLayered,
  StandardSchemaV1 as StandardSchemaV1Layered,
  ValidationContext as ValidationContextLayered,
  ValidationIssue as ValidationIssueLayered,
  ValidationResult as ValidationResultLayered,
  Validator as ValidatorLayered,
} from "../src/validation/Validation";
import type {
  ValidationFieldMeta as ValidationFieldMetaFlat,
  ValidationPipeline as ValidationPipelineFlat,
  ValidationPipelineCapabilities as ValidationPipelineCapabilitiesFlat,
  ValidationPipelineContext as ValidationPipelineContextFlat,
  ValidationPipelineOptions as ValidationPipelineOptionsFlat,
} from "../src/ValidationPipeline";
import type {
  ValidationFieldMeta as ValidationFieldMetaLayered,
  ValidationPipeline as ValidationPipelineLayered,
  ValidationPipelineCapabilities as ValidationPipelineCapabilitiesLayered,
  ValidationPipelineContext as ValidationPipelineContextLayered,
  ValidationPipelineOptions as ValidationPipelineOptionsLayered,
} from "../src/validation/ValidationPipeline";

type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;

type FieldStateParity = IsEqual<FieldStateFlat, FieldStateLayered>;
type NativeFormElementParity = IsEqual<
  NativeFormElementFlat,
  NativeFormElementLayered
>;
type NativeFormValueParity = IsEqual<
  NativeFormValueFlat,
  NativeFormValueLayered
>;
type NativeFormFlatValuesParity = IsEqual<
  NativeFormFlatValuesFlat,
  NativeFormFlatValuesLayered
>;
type NativeFormNestedValueParity = IsEqual<
  NativeFormNestedValueFlat,
  NativeFormNestedValueLayered
>;
type NativeFormValuesParity = IsEqual<
  NativeFormValuesFlat,
  NativeFormValuesLayered
>;
type RuntimeEventTypeParity = IsEqual<
  RuntimeEventTypeFlat,
  RuntimeEventTypeLayered
>;
type RuntimeEventParity = IsEqual<RuntimeEventFlat, RuntimeEventLayered>;
type RuntimeListenerParity = IsEqual<
  RuntimeListenerFlat,
  RuntimeListenerLayered
>;
type RuntimeOptionsParity = IsEqual<RuntimeOptionsFlat, RuntimeOptionsLayered>;
type RuntimeFormStateParity = IsEqual<
  RuntimeFormStateFlat,
  RuntimeFormStateLayered
>;
type RuntimePublicApiParity = IsEqual<
  RuntimePublicApiFlat,
  RuntimePublicApiLayered
>;
type RuntimeClassParity = IsEqual<RuntimeFlat, RuntimeLayered>;

type ValidationIssueParity = IsEqual<
  ValidationIssueFlat,
  ValidationIssueLayered
>;
type ValidationContextParity = IsEqual<
  ValidationContextFlat,
  ValidationContextLayered
>;
type ValidationResultParity = IsEqual<
  ValidationResultFlat,
  ValidationResultLayered
>;
type ValidatorParity = IsEqual<ValidatorFlat, ValidatorLayered>;
type StandardSchemaIssueParity = IsEqual<
  StandardSchemaIssueFlat,
  StandardSchemaIssueLayered
>;
type StandardSchemaResultParity = IsEqual<
  StandardSchemaResultFlat<NativeFormValuesFlat>,
  StandardSchemaResultLayered<NativeFormValuesLayered>
>;
type StandardSchemaV1Parity = IsEqual<
  StandardSchemaV1Flat<NativeFormValuesFlat>,
  StandardSchemaV1Layered<NativeFormValuesLayered>
>;
type SchemaLikeParity = IsEqual<
  SchemaLikeFlat<NativeFormValuesFlat>,
  SchemaLikeLayered<NativeFormValuesLayered>
>;
type InferSchemaOutputParity = IsEqual<
  InferSchemaOutputFlat<SchemaLikeFlat<NativeFormValuesFlat>>,
  InferSchemaOutputLayered<SchemaLikeLayered<NativeFormValuesLayered>>
>;

type ValidationFieldMetaParity = IsEqual<
  ValidationFieldMetaFlat,
  ValidationFieldMetaLayered
>;
type ValidationPipelineContextParity = IsEqual<
  ValidationPipelineContextFlat,
  ValidationPipelineContextLayered
>;
type ValidationPipelineCapabilitiesParity = IsEqual<
  ValidationPipelineCapabilitiesFlat,
  ValidationPipelineCapabilitiesLayered
>;
type ValidationPipelineOptionsParity = IsEqual<
  ValidationPipelineOptionsFlat,
  ValidationPipelineOptionsLayered
>;
type ValidationPipelineParity = IsEqual<
  ValidationPipelineFlat,
  ValidationPipelineLayered
>;

const fieldStateParity: FieldStateParity = true;
const nativeFormElementParity: NativeFormElementParity = true;
const nativeFormValueParity: NativeFormValueParity = true;
const nativeFormFlatValuesParity: NativeFormFlatValuesParity = true;
const nativeFormNestedValueParity: NativeFormNestedValueParity = true;
const nativeFormValuesParity: NativeFormValuesParity = true;
const runtimeEventTypeParity: RuntimeEventTypeParity = true;
const runtimeEventParity: RuntimeEventParity = true;
const runtimeListenerParity: RuntimeListenerParity = true;
const runtimeOptionsParity: RuntimeOptionsParity = true;
const runtimeFormStateParity: RuntimeFormStateParity = true;
const runtimePublicApiParity: RuntimePublicApiParity = true;
const runtimeClassParity: RuntimeClassParity = true;

const validationIssueParity: ValidationIssueParity = true;
const validationContextParity: ValidationContextParity = true;
const validationResultParity: ValidationResultParity = true;
const validatorParity: ValidatorParity = true;
const standardSchemaIssueParity: StandardSchemaIssueParity = true;
const standardSchemaResultParity: StandardSchemaResultParity = true;
const standardSchemaV1Parity: StandardSchemaV1Parity = true;
const schemaLikeParity: SchemaLikeParity = true;
const inferSchemaOutputParity: InferSchemaOutputParity = true;

const validationFieldMetaParity: ValidationFieldMetaParity = true;
const validationPipelineContextParity: ValidationPipelineContextParity = true;
const validationPipelineCapabilitiesParity: ValidationPipelineCapabilitiesParity = true;
const validationPipelineOptionsParity: ValidationPipelineOptionsParity = true;
const validationPipelineParity: ValidationPipelineParity = true;

describe("Legacy shim type parity contract", () => {
  it("keeps flat and layered type exports identical", () => {
    expect(fieldStateParity).toBe(true);
    expect(nativeFormElementParity).toBe(true);
    expect(nativeFormValueParity).toBe(true);
    expect(nativeFormFlatValuesParity).toBe(true);
    expect(nativeFormNestedValueParity).toBe(true);
    expect(nativeFormValuesParity).toBe(true);
    expect(runtimeEventTypeParity).toBe(true);
    expect(runtimeEventParity).toBe(true);
    expect(runtimeListenerParity).toBe(true);
    expect(runtimeOptionsParity).toBe(true);
    expect(runtimeFormStateParity).toBe(true);
    expect(runtimePublicApiParity).toBe(true);
    expect(runtimeClassParity).toBe(true);

    expect(validationIssueParity).toBe(true);
    expect(validationContextParity).toBe(true);
    expect(validationResultParity).toBe(true);
    expect(validatorParity).toBe(true);
    expect(standardSchemaIssueParity).toBe(true);
    expect(standardSchemaResultParity).toBe(true);
    expect(standardSchemaV1Parity).toBe(true);
    expect(schemaLikeParity).toBe(true);
    expect(inferSchemaOutputParity).toBe(true);

    expect(validationFieldMetaParity).toBe(true);
    expect(validationPipelineContextParity).toBe(true);
    expect(validationPipelineCapabilitiesParity).toBe(true);
    expect(validationPipelineOptionsParity).toBe(true);
    expect(validationPipelineParity).toBe(true);
  });
});
