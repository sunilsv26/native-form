import { useCallback, useRef, useState } from "react";
import {
  createValidator,
  NativeFormValues,
  SchemaLike,
} from "@native-form/core";
import { UseFormResult } from "./useForm";

/**
 * Configuration options for a single wizard step.
 * @public
 */
export interface WizardStepConfig {
  /**
   * Unique identifier for the step (e.g. 'account', 'billing', 'confirm').
   */
  id: string;

  /**
   * Optional display title for the step.
   */
  title?: string;

  /**
   * Optional array of field names that belong to this step.
   * If provided, advancing past this step (`next()` or forward `goTo()`)
   * requires these fields to pass validation via `runtime.validateFields()`.
   */
  fields?: readonly string[];

  /**
   * Optional step-specific schema or validator.
   */
  schema?: SchemaLike;
}

/**
 * Configuration options for the `useWizard` hook.
 * @public
 */
export interface UseWizardOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  /**
   * The Native Form instance returned by `useForm()`.
   */
  form: UseFormResult<TValues>;

  /**
   * Ordered sequence of wizard step definitions.
   */
  steps: readonly WizardStepConfig[];

  /**
   * Optional starting step index (0-based).
   * @defaultValue 0
   */
  initialStep?: number;

  /**
   * Optional callback invoked whenever the active step index changes.
   */
  onStepChange?: (fromStep: number, toStep: number) => void;
}

/**
 * Return value of the `useWizard` hook.
 * @public
 */
export interface UseWizardResult {
  /**
   * 0-based index of the active step.
   */
  currentStep: number;

  /**
   * Unique identifier of the active step, or an empty string if steps array is empty.
   */
  stepId: string;

  /**
   * Configuration object for the active step.
   */
  stepConfig: WizardStepConfig;

  /**
   * Total number of steps in the wizard.
   */
  totalSteps: number;

  /**
   * True if the wizard is on the first step (index 0).
   */
  isFirstStep: boolean;

  /**
   * True if the wizard is on the last step (index totalSteps - 1).
   */
  isLastStep: boolean;

  /**
   * Progress through the wizard as a fraction from 0.0 to 1.0.
   * Calculated as `(currentStep + 1) / totalSteps` (or 0 if totalSteps === 0).
   */
  progress: number;

  /**
   * Advance to the next step if current step validation passes.
   * Returns a promise resolving to `true` if advanced, or `false` if blocked by validation or already at the last step.
   */
  next(): Promise<boolean>;

  /**
   * Retreat to the previous step without requiring validation.
   */
  prev(): void;

  /**
   * Navigate directly to a specific step index.
   * Validates current step if advancing forward; allows unvalidated retreat if moving backward.
   * Returns `true` if navigated, `false` if invalid step index or blocked by validation.
   */
  goTo(stepIndex: number): Promise<boolean>;
}

const EMPTY_STEP_CONFIG: WizardStepConfig = {
  id: "",
};

/**
 * Multi-step wizard hook for Native Form.
 * Provides declarative step navigation, validation gating, and progress tracking.
 *
 * @public
 */
export function useWizard<
  TValues extends NativeFormValues = NativeFormValues,
>(options: UseWizardOptions<TValues>): UseWizardResult {
  const { form, steps, initialStep = 0, onStepChange } = options;

  const formRef = useRef(form);
  formRef.current = form;

  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const maxIdx = steps.length > 0 ? steps.length - 1 : 0;
    return Math.max(0, Math.min(initialStep, maxIdx));
  });

  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  const totalSteps = steps.length;
  const effectiveStep =
    totalSteps > 0 ? Math.min(currentStep, totalSteps - 1) : 0;
  const stepConfig = steps[effectiveStep] ?? EMPTY_STEP_CONFIG;
  const stepId = stepConfig.id ?? "";
  const isFirstStep = effectiveStep === 0;
  const isLastStep = totalSteps === 0 || effectiveStep === totalSteps - 1;
  const progress =
    totalSteps > 0 ? Math.min(1, Math.max(0, (effectiveStep + 1) / totalSteps)) : 0;

  const goTo = useCallback(
    async (stepIndex: number): Promise<boolean> => {
      if (!Number.isInteger(stepIndex)) {
        return false;
      }
      const current = currentStepRef.current;
      if (stepIndex === current) {
        return true;
      }
      const stepsList = stepsRef.current;
      if (stepIndex < 0 || stepIndex >= stepsList.length) {
        return false;
      }

      // If advancing forward, gate navigation on current step's validation
      if (stepIndex > current) {
        const currentConfig = stepsList[current];
        if (currentConfig?.fields && currentConfig.fields.length > 0) {
          const runtime = formRef.current.runtime;
          if (!runtime) {
            return false;
          }
          const result = await runtime.validateFields(currentConfig.fields);
          if (!result.success) {
            return false;
          }
        }
        if (currentConfig?.schema) {
          const validator = createValidator(currentConfig.schema);
          const runtime = formRef.current.runtime;
          const values = runtime ? runtime.getFormState().values : {};
          const schemaResult = await validator.validate(values);
          if (!schemaResult.success) {
            return false;
          }
        }
      }

      // Check if currentStep shifted while awaiting validation
      if (currentStepRef.current !== current) {
        return false;
      }

      currentStepRef.current = stepIndex;
      setCurrentStep(stepIndex);
      onStepChangeRef.current?.(current, stepIndex);
      return true;
    },
    [],
  );

  const next = useCallback(async (): Promise<boolean> => {
    const current = currentStepRef.current;
    const stepsList = stepsRef.current;
    if (stepsList.length === 0 || current >= stepsList.length - 1) {
      return false;
    }
    return goTo(current + 1);
  }, [goTo]);

  const prev = useCallback((): void => {
    const current = currentStepRef.current;
    if (current <= 0) {
      return;
    }
    const prevStep = current - 1;
    currentStepRef.current = prevStep;
    setCurrentStep(prevStep);
    onStepChangeRef.current?.(current, prevStep);
  }, []);

  return {
    currentStep: effectiveStep,
    stepId,
    stepConfig,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    next,
    prev,
    goTo,
  };
}
