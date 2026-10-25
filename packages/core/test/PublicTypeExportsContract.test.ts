import { describe, expect, it } from "vitest";

import type {
  ArrayItemPathInfo as ArrayItemPathInfoFromBarrel,
  AsyncFieldValidator as AsyncFieldValidatorFromBarrel,
  FieldEvents as FieldEventsFromBarrel,
  FieldState as FieldStateFromBarrel,
  FieldPathSegment as FieldPathSegmentFromBarrel,
  FormEvents as FormEventsFromBarrel,
  NativeFormElement as NativeFormElementFromBarrel,
  NativeFormFlatValues as NativeFormFlatValuesFromBarrel,
  NativeFormNestedValue as NativeFormNestedValueFromBarrel,
  NativeFormValue as NativeFormValueFromBarrel,
  NativeFormValues as NativeFormValuesFromBarrel,
  RuntimeEvent as RuntimeEventFromBarrel,
  RuntimeEventType as RuntimeEventTypeFromBarrel,
  RuntimeFormState as RuntimeFormStateFromBarrel,
  RuntimeListener as RuntimeListenerFromBarrel,
  RuntimeOptions as RuntimeOptionsFromBarrel,
  RuntimePublicApi as RuntimePublicApiFromBarrel,
  SerializationMode as SerializationModeFromBarrel,
  SchemaLike as SchemaLikeFromBarrel,
  StandardSchemaIssue as StandardSchemaIssueFromBarrel,
  StandardSchemaResult as StandardSchemaResultFromBarrel,
  StandardSchemaV1 as StandardSchemaV1FromBarrel,
  ValidationContext as ValidationContextFromBarrel,
  ValidationEvents as ValidationEventsFromBarrel,
  ValidationFieldMeta as ValidationFieldMetaFromBarrel,
  ValidationIssue as ValidationIssueFromBarrel,
  ValidationPipeline as ValidationPipelineFromBarrel,
  ValidationPipelineCapabilities as ValidationPipelineCapabilitiesFromBarrel,
  ValidationPipelineContext as ValidationPipelineContextFromBarrel,
  ValidationPipelineOptions as ValidationPipelineOptionsFromBarrel,
  ValidationResult as ValidationResultFromBarrel,
  Validator as ValidatorFromBarrel,
} from "../src/index";
import type { FieldState as FieldStateCanonical } from "../src/field/FieldState";
import type {
  ArrayItemPathInfo as ArrayItemPathInfoCanonical,
  FieldPathSegment as FieldPathSegmentCanonical,
} from "../src/Path";
import type {
  FieldEvents as FieldEventsCanonical,
  FormEvents as FormEventsCanonical,
  NativeFormElement as NativeFormElementCanonical,
  NativeFormFlatValues as NativeFormFlatValuesCanonical,
  NativeFormNestedValue as NativeFormNestedValueCanonical,
  NativeFormValue as NativeFormValueCanonical,
  NativeFormValues as NativeFormValuesCanonical,
  RuntimeEvent as RuntimeEventCanonical,
  RuntimeEventType as RuntimeEventTypeCanonical,
  RuntimeListener as RuntimeListenerCanonical,
  SerializationMode as SerializationModeCanonical,
  ValidationEvents as ValidationEventsCanonical,
} from "../src/shared/types";
import type {
  RuntimeFormState as RuntimeFormStateCanonical,
  RuntimeOptions as RuntimeOptionsCanonical,
  RuntimePublicApi as RuntimePublicApiCanonical,
} from "../src/runtime/Runtime";
import type {
  AsyncFieldValidator as AsyncFieldValidatorCanonical,
  SchemaLike as SchemaLikeCanonical,
  StandardSchemaIssue as StandardSchemaIssueCanonical,
  StandardSchemaResult as StandardSchemaResultCanonical,
  StandardSchemaV1 as StandardSchemaV1Canonical,
  ValidationContext as ValidationContextCanonical,
  ValidationIssue as ValidationIssueCanonical,
  ValidationResult as ValidationResultCanonical,
  Validator as ValidatorCanonical,
} from "../src/validation/Validation";
import type {
  ValidationFieldMeta as ValidationFieldMetaCanonical,
  ValidationPipeline as ValidationPipelineCanonical,
  ValidationPipelineCapabilities as ValidationPipelineCapabilitiesCanonical,
  ValidationPipelineContext as ValidationPipelineContextCanonical,
  ValidationPipelineOptions as ValidationPipelineOptionsCanonical,
} from "../src/validation/ValidationPipeline";

type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;

type ArrayItemPathInfoParity = IsEqual<
  ArrayItemPathInfoFromBarrel,
  ArrayItemPathInfoCanonical
>;
type FieldEventsParity = IsEqual<FieldEventsFromBarrel, FieldEventsCanonical>;
type FormEventsParity = IsEqual<FormEventsFromBarrel, FormEventsCanonical>;
type ValidationEventsParity = IsEqual<
  ValidationEventsFromBarrel,
  ValidationEventsCanonical
>;
type FieldStateParity = IsEqual<FieldStateFromBarrel, FieldStateCanonical>;
type FieldPathSegmentParity = IsEqual<
  FieldPathSegmentFromBarrel,
  FieldPathSegmentCanonical
>;
type NativeFormElementParity = IsEqual<
  NativeFormElementFromBarrel,
  NativeFormElementCanonical
>;
type NativeFormValueParity = IsEqual<
  NativeFormValueFromBarrel,
  NativeFormValueCanonical
>;
type NativeFormFlatValuesParity = IsEqual<
  NativeFormFlatValuesFromBarrel,
  NativeFormFlatValuesCanonical
>;
type NativeFormNestedValueParity = IsEqual<
  NativeFormNestedValueFromBarrel,
  NativeFormNestedValueCanonical
>;
type NativeFormValuesParity = IsEqual<
  NativeFormValuesFromBarrel,
  NativeFormValuesCanonical
>;
type RuntimeEventTypeParity = IsEqual<
  RuntimeEventTypeFromBarrel,
  RuntimeEventTypeCanonical
>;
type RuntimeEventParity = IsEqual<
  RuntimeEventFromBarrel,
  RuntimeEventCanonical
>;
type RuntimeListenerParity = IsEqual<
  RuntimeListenerFromBarrel,
  RuntimeListenerCanonical
>;
type SerializationModeParity = IsEqual<
  SerializationModeFromBarrel,
  SerializationModeCanonical
>;

type RuntimeOptionsParity = IsEqual<
  RuntimeOptionsFromBarrel,
  RuntimeOptionsCanonical
>;
type RuntimeFormStateParity = IsEqual<
  RuntimeFormStateFromBarrel,
  RuntimeFormStateCanonical
>;
type RuntimePublicApiParity = IsEqual<
  RuntimePublicApiFromBarrel,
  RuntimePublicApiCanonical
>;

type ValidationIssueParity = IsEqual<
  ValidationIssueFromBarrel,
  ValidationIssueCanonical
>;
type ValidationContextParity = IsEqual<
  ValidationContextFromBarrel,
  ValidationContextCanonical
>;
type ValidationResultParity = IsEqual<
  ValidationResultFromBarrel,
  ValidationResultCanonical
>;
type ValidatorParity = IsEqual<ValidatorFromBarrel, ValidatorCanonical>;
type AsyncFieldValidatorParity = IsEqual<
  AsyncFieldValidatorFromBarrel,
  AsyncFieldValidatorCanonical
>;
type StandardSchemaIssueParity = IsEqual<
  StandardSchemaIssueFromBarrel,
  StandardSchemaIssueCanonical
>;
type StandardSchemaResultParity = IsEqual<
  StandardSchemaResultFromBarrel<NativeFormValuesFromBarrel>,
  StandardSchemaResultCanonical<NativeFormValuesCanonical>
>;
type StandardSchemaV1Parity = IsEqual<
  StandardSchemaV1FromBarrel<NativeFormValuesFromBarrel>,
  StandardSchemaV1Canonical<NativeFormValuesCanonical>
>;
type SchemaLikeParity = IsEqual<
  SchemaLikeFromBarrel<NativeFormValuesFromBarrel>,
  SchemaLikeCanonical<NativeFormValuesCanonical>
>;

type ValidationFieldMetaParity = IsEqual<
  ValidationFieldMetaFromBarrel,
  ValidationFieldMetaCanonical
>;
type ValidationPipelineContextParity = IsEqual<
  ValidationPipelineContextFromBarrel,
  ValidationPipelineContextCanonical
>;
type ValidationPipelineCapabilitiesParity = IsEqual<
  ValidationPipelineCapabilitiesFromBarrel,
  ValidationPipelineCapabilitiesCanonical
>;
type ValidationPipelineOptionsParity = IsEqual<
  ValidationPipelineOptionsFromBarrel,
  ValidationPipelineOptionsCanonical
>;
type ValidationPipelineParity = IsEqual<
  ValidationPipelineFromBarrel,
  ValidationPipelineCanonical
>;

const arrayItemPathInfoParity: ArrayItemPathInfoParity = true;
const fieldEventsParity: FieldEventsParity = true;
const formEventsParity: FormEventsParity = true;
const validationEventsParity: ValidationEventsParity = true;
const fieldStateParity: FieldStateParity = true;
const fieldPathSegmentParity: FieldPathSegmentParity = true;
const nativeFormElementParity: NativeFormElementParity = true;
const nativeFormValueParity: NativeFormValueParity = true;
const nativeFormFlatValuesParity: NativeFormFlatValuesParity = true;
const nativeFormNestedValueParity: NativeFormNestedValueParity = true;
const nativeFormValuesParity: NativeFormValuesParity = true;
const runtimeEventTypeParity: RuntimeEventTypeParity = true;
const runtimeEventParity: RuntimeEventParity = true;
const runtimeListenerParity: RuntimeListenerParity = true;
const serializationModeParity: SerializationModeParity = true;

const runtimeOptionsParity: RuntimeOptionsParity = true;
const runtimeFormStateParity: RuntimeFormStateParity = true;
const runtimePublicApiParity: RuntimePublicApiParity = true;

const validationIssueParity: ValidationIssueParity = true;
const validationContextParity: ValidationContextParity = true;
const validationResultParity: ValidationResultParity = true;
const validatorParity: ValidatorParity = true;
const asyncFieldValidatorParity: AsyncFieldValidatorParity = true;
const standardSchemaIssueParity: StandardSchemaIssueParity = true;
const standardSchemaResultParity: StandardSchemaResultParity = true;
const standardSchemaV1Parity: StandardSchemaV1Parity = true;
const schemaLikeParity: SchemaLikeParity = true;

const validationFieldMetaParity: ValidationFieldMetaParity = true;
const validationPipelineContextParity: ValidationPipelineContextParity = true;
const validationPipelineCapabilitiesParity: ValidationPipelineCapabilitiesParity = true;
const validationPipelineOptionsParity: ValidationPipelineOptionsParity = true;
const validationPipelineParity: ValidationPipelineParity = true;

describe("@native-form/core public barrel type contract", () => {
  it("keeps type exports aligned to canonical module definitions", () => {
    expect(arrayItemPathInfoParity).toBe(true);
    expect(fieldEventsParity).toBe(true);
    expect(formEventsParity).toBe(true);
    expect(validationEventsParity).toBe(true);
    expect(fieldStateParity).toBe(true);
    expect(fieldPathSegmentParity).toBe(true);
    expect(nativeFormElementParity).toBe(true);
    expect(nativeFormValueParity).toBe(true);
    expect(nativeFormFlatValuesParity).toBe(true);
    expect(nativeFormNestedValueParity).toBe(true);
    expect(nativeFormValuesParity).toBe(true);
    expect(runtimeEventTypeParity).toBe(true);
    expect(runtimeEventParity).toBe(true);
    expect(runtimeListenerParity).toBe(true);
    expect(serializationModeParity).toBe(true);

    expect(runtimeOptionsParity).toBe(true);
    expect(runtimeFormStateParity).toBe(true);
    expect(runtimePublicApiParity).toBe(true);

    expect(validationIssueParity).toBe(true);
    expect(validationContextParity).toBe(true);
    expect(validationResultParity).toBe(true);
    expect(validatorParity).toBe(true);
    expect(asyncFieldValidatorParity).toBe(true);
    expect(standardSchemaIssueParity).toBe(true);
    expect(standardSchemaResultParity).toBe(true);
    expect(standardSchemaV1Parity).toBe(true);
    expect(schemaLikeParity).toBe(true);

    expect(validationFieldMetaParity).toBe(true);
    expect(validationPipelineContextParity).toBe(true);
    expect(validationPipelineCapabilitiesParity).toBe(true);
    expect(validationPipelineOptionsParity).toBe(true);
    expect(validationPipelineParity).toBe(true);
  });
});
