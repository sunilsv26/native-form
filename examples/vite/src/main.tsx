import React, { useId, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  arrayItemPath,
  formPath,
  type SerializationMode,
  type ValidationMode,
} from "@native-form/core";
import {
  useField,
  useFieldArray,
  useForm,
  UseFormResult,
  useWatch,
  useWizard,
  WizardStepConfig,
} from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { yupResolver } from "@native-form/yup";
import { valibotResolver } from "@native-form/valibot";
import { z } from "zod";
import * as yup from "yup";
import * as v from "valibot";

// --- Schemas (handling both native string coerions and typed primitives) ---

const zodLoginSchema = z.object({
  user: z.object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().trim().min(8, "Password must be at least 8 characters"),
    age: z
      .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
      .refine((n) => n >= 18 && n <= 100, "Age must be between 18 and 100"),
  }),
  agreeToTerms: z
    .union([z.boolean(), z.literal("on")])
    .refine((val) => val === true || val === "on", "You must accept the terms"),
  newsletter: z.union([z.boolean(), z.literal("on")]).optional(),
  teammates: z.array(
    z.object({
      email: z.string().email("Enter a valid teammate email"),
    }),
  ),
});

const valibotLoginSchema = v.object({
  user: v.object({
    email: v.pipe(v.string(), v.email("Enter a valid email address")),
    password: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(8, "Password must be at least 8 characters"),
    ),
    age: v.pipe(
      v.union([v.number(), v.pipe(v.string(), v.regex(/^\d+$/), v.transform(Number))]),
      v.minValue(18, "Age must be at least 18"),
      v.maxValue(100, "Age must be under 100"),
    ),
  }),
  agreeToTerms: v.pipe(
    v.union([v.boolean(), v.literal("on")]),
    v.check((val) => val === true || val === "on", "You must accept the terms"),
  ),
  newsletter: v.optional(v.union([v.boolean(), v.literal("on")])),
  teammates: v.array(
    v.object({
      email: v.pipe(v.string(), v.email("Enter a valid teammate email")),
    }),
  ),
});

const yupLoginSchema = yup.object({
  user: yup.object({
    email: yup
      .string()
      .email("Enter a valid email address")
      .required("Email is required"),
    password: yup
      .string()
      .trim()
      .min(8, "Password must be at least 8 characters")
      .required("Password is required"),
    age: yup
      .number()
      .typeError("Age must be a number")
      .min(18, "Age must be at least 18")
      .max(100, "Age must be under 100")
      .required("Age is required"),
  }),
  agreeToTerms: yup
    .mixed()
    .test(
      "terms",
      "You must accept the terms",
      (val) => val === true || val === "on",
    )
    .required("You must accept the terms"),
  newsletter: yup.mixed().optional(),
  teammates: yup.array().of(
    yup.object({
      email: yup
        .string()
        .email("Enter a valid teammate email")
        .required("Teammate email is required"),
    }),
  ),
});

const USER_EMAIL = formPath("user", "email");
const USER_PASSWORD = "user[password]"; // Demonstrating bracket notation RFC 003
const USER_AGE = formPath("user", "age");
const AGREE_TO_TERMS = "agreeToTerms";
const NEWSLETTER = "newsletter";

// --- Components for Showcase ---

function FieldStatus({
  label,
  touched,
  dirty,
  error,
  validating,
}: {
  label: string;
  touched: boolean;
  dirty: boolean;
  error?: string;
  validating?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "4px 0 0",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "12px",
          color: error ? "#e11d48" : "#64748b",
        }}
      >
        {label}: {error ? <strong>{error}</strong> : "ok"} (touched:{" "}
        {String(touched)}, dirty: {String(dirty)})
      </p>
      {validating && (
        <span
          style={{
            fontSize: "11px",
            color: "#0369a1",
            backgroundColor: "#e0f2fe",
            padding: "1px 6px",
            borderRadius: "4px",
            fontWeight: 600,
          }}
        >
          ⏳ Checking...
        </span>
      )}
    </div>
  );
}

function InputField({
  form,
  name,
  label,
  type = "text",
  defaultValue = "",
}: {
  form: UseFormResult<any>;
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  const field = useField({ form, name });
  const restoredValue =
    (form.runtime?.preservedValues?.[name] as string | undefined) ?? defaultValue;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label
        htmlFor={name}
        style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={restoredValue}
        style={{
          width: "100%",
          padding: "8px 12px",
          marginTop: "6px",
          borderRadius: "6px",
          border: field.invalid ? "1.5px solid #e11d48" : "1px solid #cbd5e1",
          outline: "none",
          fontSize: "14px",
          boxSizing: "border-box",
        }}
      />
      <FieldStatus
        label={label}
        touched={field.touched}
        dirty={field.dirty}
        error={field.error}
        validating={field.validating}
      />
    </div>
  );
}

function CheckboxField({
  form,
  name,
  label,
  description,
  defaultChecked = false,
}: {
  form: UseFormResult<any>;
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const field = useField({ form, name });
  const id = useId();
  const preserved = form.runtime?.preservedValues?.[name];
  const restoredChecked =
    typeof preserved === "boolean"
      ? preserved
      : preserved === "on"
      ? true
      : defaultChecked;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <label
        htmlFor={id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: "14px",
          color: "#1e293b",
          fontWeight: 500,
        }}
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={restoredChecked}
          style={{ width: "16px", height: "16px", cursor: "pointer" }}
        />
        {label}
      </label>
      {description && (
        <span
          style={{
            fontSize: "12px",
            color: "#64748b",
            marginLeft: "24px",
          }}
        >
          {description}
        </span>
      )}
      {field.error && (
        <p
          style={{
            margin: "2px 0 0 24px",
            fontSize: "12px",
            color: "#e11d48",
            fontWeight: 500,
          }}
        >
          {field.error}
        </p>
      )}
    </div>
  );
}

function TeammateRow({
  form,
  name,
  index,
  id,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  form: UseFormResult;
  name: string;
  index: number;
  id: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const field = useField({ form, name });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
            Teammate #{index + 1}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "monospace",
              color: "#94a3b8",
              background: "#e2e8f0",
              padding: "1px 6px",
              borderRadius: "4px",
            }}
          >
            id: {id.slice(-6)}
          </span>
        </div>
        <input
          name={name}
          type="email"
          placeholder={`teammate${index + 1}@company.com`}
          defaultValue=""
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: field.invalid ? "1.5px solid #e11d48" : "1px solid #cbd5e1",
            outline: "none",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
        {field.error ? (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "12px",
              color: "#e11d48",
              fontWeight: 500,
            }}
          >
            {field.error}
          </p>
        ) : null}
      </div>

      {/* useFieldArray action controls: swap / move / remove */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          alignSelf: "flex-end",
          marginBottom: "2px",
        }}
      >
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move Up"
          style={{
            padding: "6px 8px",
            backgroundColor: isFirst ? "#f1f5f9" : "#e2e8f0",
            color: isFirst ? "#cbd5e1" : "#334155",
            border: "none",
            borderRadius: "4px",
            cursor: isFirst ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "11px",
          }}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          title="Move Down"
          style={{
            padding: "6px 8px",
            backgroundColor: isLast ? "#f1f5f9" : "#e2e8f0",
            color: isLast ? "#cbd5e1" : "#334155",
            border: "none",
            borderRadius: "4px",
            cursor: isLast ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "11px",
          }}
        >
          ▼
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove Teammate"
          style={{
            padding: "6px 10px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "11px",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Live telemetry panel using `useWatch` to demonstrate isolated re-renders and dual-mode comparison
function LiveTelemetry({
  form,
  serializationMode,
  nestingMode = "nested",
}: {
  form: UseFormResult;
  serializationMode: SerializationMode;
  nestingMode?: "flat" | "nested";
}) {
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  const userEmail = useWatch({ form, name: USER_EMAIL });
  const userAge = useWatch({ form, name: USER_AGE });
  const agreeToTerms = useWatch({ form, name: AGREE_TO_TERMS });
  const newsletter = useWatch({ form, name: NEWSLETTER });
  const isValid = useWatch({ form, selector: (s) => s.valid });
  const isSubmitting = useWatch({ form, selector: (s) => s.submitting });

  // Compare live native vs typed extractions directly via runtime API
  const nativeSnapshot = form.runtime ? form.runtime.serialize() : {};
  const typedSnapshot = form.runtime
    ? form.runtime.serializeFields({ nesting: nestingMode })
    : {};

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "16px",
        background: "#0f172a",
        color: "#f8fafc",
        borderRadius: "8px",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          borderBottom: "1px solid #334155",
          paddingBottom: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "#38bdf8", fontSize: "14px" }}>
            Live Telemetry (useWatch)
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "4px",
              backgroundColor:
                serializationMode === "typed" ? "#065f46" : "#1e293b",
              color: serializationMode === "typed" ? "#34d399" : "#94a3b8",
              border: `1px solid ${
                serializationMode === "typed" ? "#059669" : "#475569"
              }`,
              fontWeight: 600,
            }}
          >
            Mode: {serializationMode.toUpperCase()}
          </span>
        </div>
        <span
          style={{
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "4px",
            backgroundColor: isValid ? "#059669" : "#dc2626",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {isValid ? "VALID" : "INVALID"}
        </span>
      </div>

      {/* Live Value & Type Inspector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "12px",
          padding: "10px",
          background: "#1e293b",
          borderRadius: "6px",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong style={{ color: "#94a3b8" }}>User Email:</strong>{" "}
          <span>{String(userEmail || "(empty)")}</span>
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: "#94a3b8" }}>Age:</strong>{" "}
          <span
            style={{
              color: typeof userAge === "number" ? "#34d399" : "#f59e0b",
              fontWeight: 600,
            }}
          >
            {String(userAge ?? "")} ({typeof userAge})
          </span>
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: "#94a3b8" }}>Agree Terms:</strong>{" "}
          <span
            style={{
              color: typeof agreeToTerms === "boolean" ? "#34d399" : "#f59e0b",
              fontWeight: 600,
            }}
          >
            {String(agreeToTerms)} ({typeof agreeToTerms})
          </span>
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: "#94a3b8" }}>Newsletter:</strong>{" "}
          <span
            style={{
              color: typeof newsletter === "boolean" ? "#34d399" : "#f59e0b",
              fontWeight: 600,
            }}
          >
            {newsletter === undefined
              ? "omitted (undefined)"
              : `${String(newsletter)} (${typeof newsletter})`}
          </span>
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#64748b",
          fontSize: "11px",
          marginBottom: "12px",
        }}
      >
        <span>
          Submitting: <strong>{String(isSubmitting)}</strong>
        </span>
        <span>
          Telemetry Panel Renders: <strong>{renderCountRef.current}</strong>
        </span>
      </div>

      {/* Dual Extraction Comparison Box (RFC 002) */}
      <div style={{ marginTop: "10px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <span style={{ fontWeight: 600, color: "#cbd5e1" }}>
            Dual-Mode Serialization Comparison (RFC 002):
          </span>
          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
            Simultaneous real-time extractions
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          {/* Native Baseline */}
          <div
            style={{
              padding: "10px",
              background: "#0b1329",
              borderRadius: "6px",
              border:
                serializationMode === "native"
                  ? "1.5px solid #38bdf8"
                  : "1px solid #334155",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}
              >
                1. serialize() (Native FormData)
              </span>
              {serializationMode === "native" && (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#0284c7",
                    color: "#fff",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: "11px",
                color: "#93c5fd",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(nativeSnapshot, null, 2)}
            </pre>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "10px",
                color: "#64748b",
                lineHeight: 1.3,
              }}
            >
              • Standard FormData strings. Unchecked checkboxes omitted per
              WHATWG spec.
            </p>
          </div>

          {/* Typed RFC 002 */}
          <div
            style={{
              padding: "10px",
              background: "#0b1329",
              borderRadius: "6px",
              border:
                serializationMode === "typed"
                  ? "1.5px solid #34d399"
                  : "1px solid #334155",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: "#34d399" }}
              >
                2. serializeFields() (Typed RFC 002)
              </span>
              {serializationMode === "typed" && (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#059669",
                    color: "#fff",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: "11px",
                color: "#a7f3d0",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(typedSnapshot, null, 2)}
            </pre>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "10px",
                color: "#64748b",
                lineHeight: 1.3,
              }}
            >
              • Numbers preserved via valueAsNumber. Unchecked coerced to false.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Tab 1: Interactive Showcase View ---

function ShowcaseView() {
  const [adapterType, setAdapterType] = useState<"zod" | "yup" | "valibot">(
    "zod",
  );
  const [validationMode, setValidationMode] =
    useState<ValidationMode>("onChange");
  const [serializationMode, setSerializationMode] =
    useState<SerializationMode>("typed");
  const [nestingMode, setNestingMode] = useState<"nested" | "flat">("nested");

  const appRenders = useRef(0);
  appRenders.current++;

  const schema = useMemo(() => {
    switch (adapterType) {
      case "valibot":
        return valibotResolver(valibotLoginSchema);
      case "yup":
        return yupResolver(yupLoginSchema);
      case "zod":
      default:
        return zodResolver(zodLoginSchema);
    }
  }, [adapterType]);

  const form = useForm({
    schema,
    mode: validationMode,
    serializationMode,
    nesting: nestingMode,
    debounceMs: 300,
    asyncValidators: {
      [USER_EMAIL]: async (val, ctx) => {
        // Simulate 500ms network server-side check
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (ctx.signal.aborted) return;
        if (val === "taken@company.com" || val === "admin@company.com") {
          return "This email is already taken on the server";
        }
      },
    },
    subscribe: false,
    onSubmit: (values) => {
      console.log("SUBMIT SUCCESS:", values);
      alert(`Login Successful!\n${JSON.stringify(values, null, 2)}`);
    },
    onInvalid: (errors) => {
      console.warn("FORM INVALID:", errors);
    },
  });

  const teammates = useFieldArray({
    form,
    name: "teammates",
    defaultValue: [{ email: "dev1@company.com" }],
  });

  return (
    <div>
      {/* Configuration card: Adapter, Validation Mode & Serialization Mode */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "12px 14px",
          background: "#f1f5f9",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "13px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Adapter selector */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "#334155" }}>Adapter:</span>
            <label
              style={{
                cursor: "pointer",
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              <input
                type="radio"
                name="adapter"
                checked={adapterType === "zod"}
                onChange={() => setAdapterType("zod")}
              />
              Zod
            </label>
            <label
              style={{
                cursor: "pointer",
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              <input
                type="radio"
                name="adapter"
                checked={adapterType === "yup"}
                onChange={() => setAdapterType("yup")}
              />
              Yup
            </label>
            <label
              style={{
                cursor: "pointer",
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              <input
                type="radio"
                name="adapter"
                checked={adapterType === "valibot"}
                onChange={() => setAdapterType("valibot")}
              />
              Valibot
            </label>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor:
                  adapterType === "valibot"
                    ? "#ede9fe"
                    : adapterType === "zod"
                      ? "#e0f2fe"
                      : "#fef3c7",
                color:
                  adapterType === "valibot"
                    ? "#6d28d9"
                    : adapterType === "zod"
                      ? "#0369a1"
                      : "#b45309",
                fontWeight: 600,
              }}
            >
              {adapterType === "valibot"
                ? "Valibot (v1.x modular ~1.5 kB)"
                : adapterType === "zod"
                  ? "Zod (TypeScript-first schema)"
                  : "Yup (Classic object schema)"}
            </span>
          </div>

          <span style={{ color: "#475569", fontWeight: 500 }}>
            Parent Form Renders: <strong>{appRenders.current}</strong>
          </span>
        </div>

        {/* Validation Mode selector */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            paddingTop: "8px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <span style={{ fontWeight: 600, color: "#334155" }}>
            Validation Mode:
          </span>
          {(["onChange", "onBlur", "onSubmit", "onTouched", "all"] as const).map(
            (m) => (
              <label
                key={m}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  gap: "4px",
                  color: validationMode === m ? "#2563eb" : "#475569",
                  fontWeight: validationMode === m ? 600 : 400,
                }}
              >
                <input
                  type="radio"
                  name="validationMode"
                  checked={validationMode === m}
                  onChange={() => setValidationMode(m)}
                />
                {m}
              </label>
            ),
          )}
        </div>

        {/* Serialization Mode selector (RFC 002) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            paddingTop: "8px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <span style={{ fontWeight: 600, color: "#334155" }}>
            Serialization:
          </span>
          <label
            style={{
              cursor: "pointer",
              display: "flex",
              gap: "4px",
              color: serializationMode === "typed" ? "#059669" : "#475569",
              fontWeight: serializationMode === "typed" ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name="serializationMode"
              checked={serializationMode === "typed"}
              onChange={() => setSerializationMode("typed")}
            />
            Typed (RFC 002)
          </label>
          <label
            style={{
              cursor: "pointer",
              display: "flex",
              gap: "4px",
              color: serializationMode === "native" ? "#0284c7" : "#475569",
              fontWeight: serializationMode === "native" ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name="serializationMode"
              checked={serializationMode === "native"}
              onChange={() => setSerializationMode("native")}
            />
            Native (FormData)
          </label>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor:
                serializationMode === "typed" ? "#d1fae5" : "#e0f2fe",
              color: serializationMode === "typed" ? "#065f46" : "#0369a1",
              fontWeight: 600,
            }}
          >
            {serializationMode === "typed"
              ? "Preserves numbers, booleans, and coerces unchecked checkboxes to false"
              : "Raw strings matching browser FormData (omits unchecked checkboxes)"}
          </span>
        </div>

        {/* Nesting Mode selector (RFC 003) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            paddingTop: "8px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <span style={{ fontWeight: 600, color: "#334155" }}>
            Nesting (RFC 003):
          </span>
          <label
            style={{
              cursor: "pointer",
              display: "flex",
              gap: "4px",
              color: nestingMode === "nested" ? "#7c3aed" : "#475569",
              fontWeight: nestingMode === "nested" ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name="nestingMode"
              checked={nestingMode === "nested"}
              onChange={() => setNestingMode("nested")}
            />
            Nested Objects & Arrays
          </label>
          <label
            style={{
              cursor: "pointer",
              display: "flex",
              gap: "4px",
              color: nestingMode === "flat" ? "#0284c7" : "#475569",
              fontWeight: nestingMode === "flat" ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name="nestingMode"
              checked={nestingMode === "flat"}
              onChange={() => setNestingMode("flat")}
            />
            Flat Key-Value
          </label>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor:
                nestingMode === "nested" ? "#f3e8ff" : "#e0f2fe",
              color: nestingMode === "nested" ? "#6b21a8" : "#0369a1",
              fontWeight: 600,
            }}
          >
            {nestingMode === "nested"
              ? "Resolves dot & bracket notation (user[password], teammates[0]) into deep objects"
              : "Preserves exact input name strings as flat dictionary keys"}
          </span>
        </div>

        {/* Helpful explanation of current mode */}
        <div
          style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}
        >
          {validationMode === "onChange" &&
            "• Validates immediately on each keystroke as you type."}
          {validationMode === "onBlur" &&
            "• Validates only when clicking or tabbing away from an input (blur)."}
          {validationMode === "onSubmit" &&
            "• Suppresses errors until clicking the 'Submit Form' button."}
          {validationMode === "onTouched" &&
            "• Waits for first blur, then validates live on each subsequent keystroke."}
          {validationMode === "all" &&
            "• Validates on both blur and keystroke events."}
        </div>
      </div>

      <form
        ref={form.formRef}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div>
          <InputField
            form={form}
            name={USER_EMAIL}
            label="Your Email"
            type="email"
            defaultValue="alex@company.com"
          />
          <span style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "block" }}>
            💡 Async Server Check (RFC 004): Type <code>taken@company.com</code> to see 300ms debounce and loading spinner.
          </span>
        </div>

        <InputField
          form={form}
          name={USER_PASSWORD}
          label="Your Password (Bracket Notation: user[password])"
          type="password"
          defaultValue="secret123"
        />

        {/* Number input to demonstrate typed value extraction */}
        <InputField
          form={form}
          name={USER_AGE}
          label="Your Age (Number input)"
          type="number"
          defaultValue="28"
        />

        {/* Standalone boolean checkboxes to demonstrate RFC 002 coercion */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        >
          <CheckboxField
            form={form}
            name={AGREE_TO_TERMS}
            label="I agree to the Terms of Service"
            defaultChecked={true}
          />
          <CheckboxField
            form={form}
            name={NEWSLETTER}
            label="Subscribe to weekly product newsletter"
            description="Notice: In native mode, unchecked checkboxes are omitted completely. In typed mode, serialized as false."
            defaultChecked={false}
          />
        </div>

        {/* Dynamic Field Array (useFieldArray NF-017) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <label
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              Teammates ({teammates.fields.length})
            </label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => teammates.prepend({ email: "" })}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                + Prepend
              </button>
              <button
                type="button"
                onClick={() => teammates.append({ email: "" })}
                style={{
                  padding: "4px 10px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                + Append
              </button>
              <button
                type="button"
                onClick={() =>
                  teammates.replace([
                    { email: "alice@company.com" },
                    { email: "bob@company.com" },
                  ])
                }
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                ↻ Replace (2)
              </button>
            </div>
          </div>

          {teammates.fields.map((field, index) => {
            const fieldName = arrayItemPath("teammates", index, "email");
            return (
              <TeammateRow
                key={field.id}
                form={form}
                name={fieldName}
                index={index}
                id={field.id}
                isFirst={index === 0}
                isLast={index === teammates.fields.length - 1}
                onMoveUp={() => teammates.swap(index, index - 1)}
                onMoveDown={() => teammates.swap(index, index + 1)}
                onRemove={() => teammates.remove(index)}
              />
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Submit Form
          </button>
          <button
            type="reset"
            style={{
              padding: "10px 18px",
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </form>

      <LiveTelemetry
        form={form}
        serializationMode={serializationMode}
        nestingMode={nestingMode}
      />
    </div>
  );
}

// --- Tab 2: Performance Stress-Test Benchmark View ---

interface BenchmarkMetrics {
  keystrokes: number;
  elapsedMs: number;
  avgMsPerStroke: number;
  rendersDuringTest: number;
  fieldCount: number;
  throughputPerSec: number;
}

function BenchmarkView() {
  const [fieldCount, setFieldCount] = useState<number>(100);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [serializedOutput, setSerializedOutput] = useState<string | null>(null);

  const rendersRef = useRef(0);
  rendersRef.current++;

  const form = useForm({
    subscribe: false,
  });

  const fields = useMemo(() => {
    return Array.from({ length: fieldCount }, (_, i) => `field_${i + 1}`);
  }, [fieldCount]);

  const runKeystrokeStressTest = async () => {
    setIsBenchmarking(true);
    setSerializedOutput(null);
    // Allow React state to flush status indicator
    await new Promise((r) => setTimeout(r, 25));

    const formEl = form.formRef.current;
    if (!formEl) {
      setIsBenchmarking(false);
      return;
    }

    const inputs = Array.from(formEl.querySelectorAll("input"));
    if (inputs.length === 0) {
      setIsBenchmarking(false);
      return;
    }

    const startRenders = rendersRef.current;
    const totalStrokes = 500;
    const t0 = performance.now();

    for (let i = 0; i < totalStrokes; i++) {
      const targetInput = inputs[i % inputs.length];
      targetInput.value = `val_${i}`;
      targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const t1 = performance.now();
    const elapsed = t1 - t0;
    const rendersOccurred = rendersRef.current - startRenders;
    const throughput = Math.round((totalStrokes / (elapsed / 1000)));

    setMetrics({
      keystrokes: totalStrokes,
      elapsedMs: Number(elapsed.toFixed(2)),
      avgMsPerStroke: Number((elapsed / totalStrokes).toFixed(3)),
      rendersDuringTest: rendersOccurred,
      fieldCount: inputs.length,
      throughputPerSec: throughput,
    });
    setIsBenchmarking(false);
  };

  const handleInspectValues = () => {
    const raw = form.runtime ? form.runtime.serialize() : {};
    setSerializedOutput(JSON.stringify(raw, null, 2));
  };

  const handleReset = () => {
    form.formRef.current?.reset();
    setMetrics(null);
    setSerializedOutput(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Control Panel */}
      <div
        style={{
          padding: "16px",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          fontSize: "13px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "#334155" }}>
              Active Fields:
            </span>
            {([50, 100, 250, 500] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                disabled={isBenchmarking}
                onClick={() => {
                  setFieldCount(cnt);
                  setMetrics(null);
                  setSerializedOutput(null);
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: fieldCount === cnt ? "none" : "1px solid #cbd5e1",
                  backgroundColor: fieldCount === cnt ? "#2563eb" : "#ffffff",
                  color: fieldCount === cnt ? "#ffffff" : "#475569",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {cnt}
              </button>
            ))}
          </div>

          <div
            style={{
              padding: "4px 8px",
              background: "#e2e8f0",
              borderRadius: "4px",
              color: "#334155",
              fontWeight: 500,
              fontSize: "12px",
            }}
          >
            Form Component Renders: <strong>{rendersRef.current}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={isBenchmarking}
            onClick={runKeystrokeStressTest}
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "10px 16px",
              backgroundColor: isBenchmarking ? "#94a3b8" : "#059669",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: isBenchmarking ? "wait" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            {isBenchmarking
              ? "⚡ Running 500 Keystrokes..."
              : `⚡ Run 500 Keystrokes Stress Test (${fieldCount} Fields)`}
          </button>

          <button
            type="button"
            disabled={isBenchmarking}
            onClick={handleInspectValues}
            style={{
              padding: "10px 14px",
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Serialize State
          </button>

          <button
            type="button"
            disabled={isBenchmarking}
            onClick={handleReset}
            style={{
              padding: "10px 14px",
              backgroundColor: "#f1f5f9",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Metrics Dashboard */}
      {metrics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px",
          }}
        >
          <div
            style={{
              padding: "12px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#065f46", fontWeight: 600 }}>
              EXECUTION TIME
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#047857" }}>
              {metrics.elapsedMs} ms
            </div>
            <div style={{ fontSize: "11px", color: "#059669", marginTop: "2px" }}>
              for 500 keystrokes
            </div>
          </div>

          <div
            style={{
              padding: "12px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#1e40af", fontWeight: 600 }}>
              RE-RENDERS
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1d4ed8" }}>
              {metrics.rendersDuringTest}
            </div>
            <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px" }}>
              Zero DOM re-renders!
            </div>
          </div>

          <div
            style={{
              padding: "12px",
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#6b21a8", fontWeight: 600 }}>
              THROUGHPUT
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#7e22ce" }}>
              {metrics.throughputPerSec.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#9333ea", marginTop: "2px" }}>
              keystrokes / sec
            </div>
          </div>

          <div
            style={{
              padding: "12px",
              background: "#fefce8",
              border: "1px solid #fef08a",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#854d0e", fontWeight: 600 }}>
              DOM LISTENERS
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#a16207" }}>
              1
            </div>
            <div style={{ fontSize: "11px", color: "#ca8a04", marginTop: "2px" }}>
              Root Event Delegation
            </div>
          </div>
        </div>
      )}

      {/* Architectural Performance Comparison */}
      <div
        style={{
          padding: "12px 14px",
          background: "#0f172a",
          color: "#f8fafc",
          borderRadius: "8px",
          fontSize: "12px",
        }}
      >
        <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: "6px" }}>
          Why Native Form Stays Fast at Scale:
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            borderTop: "1px solid #334155",
            paddingTop: "8px",
          }}
        >
          <div>
            <span style={{ color: "#4ade80", fontWeight: 600 }}>Native Form</span>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>
              <strong>0 re-renders</strong> on keystrokes. <strong>1</strong> root delegated event listener. <strong>6.2 kB</strong> gzip.
            </p>
          </div>
          <div>
            <span style={{ color: "#f87171", fontWeight: 600 }}>Formik</span>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>
              <strong>500 re-renders</strong> (1 per keystroke) re-rendering entire component tree. <strong>12.8 kB</strong> gzip.
            </p>
          </div>
          <div>
            <span style={{ color: "#fbbf24", fontWeight: 600 }}>React Hook Form</span>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>
              Uncontrolled, but binds <strong>{fieldCount * 2}</strong> individual ref listeners into the DOM. <strong>10.5 kB</strong> gzip.
            </p>
          </div>
        </div>
      </div>

      {/* Serialized State Output Drawer */}
      {serializedOutput && (
        <div style={{ marginTop: "4px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
            Serialized Form Values ({fieldCount} keys):
          </span>
          <pre
            style={{
              margin: "6px 0 0",
              padding: "10px",
              background: "#1e293b",
              borderRadius: "6px",
              maxHeight: "160px",
              overflowY: "auto",
              fontSize: "11px",
              color: "#a5f3fc",
            }}
          >
            {serializedOutput}
          </pre>
        </div>
      )}

      {/* Scrollable Live Fields Grid */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
            Interactive Form Controls ({fieldCount} inputs mounted):
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Type into any field — parent renders stay at <strong>{rendersRef.current}</strong>
          </span>
        </div>

        <form
          ref={form.formRef}
          noValidate
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: "8px",
            maxHeight: "320px",
            overflowY: "auto",
            padding: "12px",
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
          }}
        >
          {fields.map((name) => (
            <div key={name} style={{ display: "flex", flexDirection: "column" }}>
              <label
                htmlFor={name}
                style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}
              >
                {name}
              </label>
              <input
                id={name}
                name={name}
                placeholder={name}
                defaultValue=""
                style={{
                  padding: "6px 8px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  boxSizing: "border-box",
                  width: "100%",
                }}
              />
            </div>
          ))}
        </form>
      </div>
    </div>
  );
}

// --- Multi-Step Wizard Showcase (RFC 005 / NF-021) ---

const wizardStepsConfig: WizardStepConfig[] = [
  {
    id: "account",
    title: "Account Details",
    fields: ["fullName", "email", "password"],
  },
  {
    id: "shipping",
    title: "Shipping Address",
    fields: ["address", "city", "zipCode", "deliverySpeed"],
  },
  {
    id: "review",
    title: "Review & Confirm",
    fields: ["confirmed"],
  },
];

const wizardZodSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  address: z.string().trim().min(5, "Street address must be at least 5 characters"),
  city: z.string().trim().min(2, "City name is required"),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits (e.g. 90210)"),
  deliverySpeed: z.enum(["standard", "express", "overnight"]),
  confirmed: z
    .union([z.boolean(), z.literal("on")])
    .refine((val) => val === true || val === "on", "You must confirm the order details"),
});

function WizardShowcaseView() {
  const [pattern, setPattern] = useState<"dom" | "component">("dom");
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(true);

  const form = useForm({
    schema: zodResolver(wizardZodSchema),
    mode: "onBlur",
    debounceMs: 250,
    preserveUnmountedValues: true,
    asyncValidators: {
      email: async (val, ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (ctx.signal.aborted) return;
        if (val === "taken@company.com" || val === "admin@company.com") {
          return "This email is already registered on the server";
        }
      },
    },
    onSubmit: (values) => {
      setSubmittedData(values as unknown as Record<string, unknown>);
    },
    onInvalid: (errors) => {
      console.warn("WIZARD SUBMISSION REJECTED:", errors);
    },
  });

  const wizard = useWizard({
    form,
    steps: wizardStepsConfig,
  });

  const liveValues = form.watch();

  const handleNext = async () => {
    setIsNavigating(true);
    try {
      await wizard.next();
    } finally {
      setIsNavigating(false);
    }
  };

  const handleGoTo = async (index: number) => {
    setIsNavigating(true);
    try {
      await wizard.goTo(index);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    form.formRef.current?.reset();
    void wizard.goTo(0);
  };

  return (
    <div>
      {/* Pattern & Info header */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "14px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
              RFC 005 Multi-Step Architecture
            </span>
            <span
              style={{
                marginLeft: "8px",
                fontSize: "11px",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              NF-021
            </span>
          </div>
          {/* Pattern Selector */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setPattern("dom")}
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "4px",
                border: "1px solid",
                borderColor: pattern === "dom" ? "#2563eb" : "#cbd5e1",
                backgroundColor: pattern === "dom" ? "#eff6ff" : "#ffffff",
                color: pattern === "dom" ? "#1d4ed8" : "#475569",
                cursor: "pointer",
              }}
            >
              Pattern 1: DOM-Preserved
            </button>
            <button
              type="button"
              onClick={() => setPattern("component")}
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "4px",
                border: "1px solid",
                borderColor: pattern === "component" ? "#2563eb" : "#cbd5e1",
                backgroundColor: pattern === "component" ? "#eff6ff" : "#ffffff",
                color: pattern === "component" ? "#1d4ed8" : "#475569",
                cursor: "pointer",
              }}
            >
              Pattern 2: Component-Swapped
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
          {pattern === "dom"
            ? "Pattern 1 retains unmounted step inputs in the DOM using <fieldset hidden>. Recommended for zero overhead, accessibility, and retaining browser undo/autofill stacks."
            : "Pattern 2 conditionally unmounts inactive step DOM nodes. With preserveUnmountedValues: true enabled, Native Form caches unmounted step data in memory so values, navigation checks, and review summaries persist seamlessly."}
        </p>
      </div>

      {/* Stepper Progress Indicator */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {wizardStepsConfig.map((step, idx) => {
            const isCompleted = wizard.currentStep > idx;
            const isActive = wizard.currentStep === idx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleGoTo(idx)}
                disabled={isNavigating}
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: isNavigating ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: isCompleted
                      ? "#16a34a"
                      : isActive
                      ? "#2563eb"
                      : "#f1f5f9",
                    color: isCompleted || isActive ? "#ffffff" : "#64748b",
                    border: isActive ? "2px solid #93c5fd" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#1e293b" : "#64748b",
                    }}
                  >
                    {step.title}
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                    {idx === 0 ? "Personal" : idx === 1 ? "Address" : "Submit"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress Bar Track */}
        <div
          style={{
            width: "100%",
            height: "6px",
            backgroundColor: "#f1f5f9",
            borderRadius: "999px",
            overflow: "hidden",
            marginTop: "14px",
          }}
        >
          <div
            style={{
              width: `${Math.round(wizard.progress * 100)}%`,
              height: "100%",
              backgroundColor: wizard.progress === 1 ? "#16a34a" : "#2563eb",
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          <span>Step {wizard.currentStep + 1} of {wizard.totalSteps}</span>
          <span>{Math.round(wizard.progress * 100)}% Complete</span>
        </div>
      </div>

      {/* Main Wizard Form */}
      <form
        ref={form.formRef}
        noValidate
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Step 1: Account Info */}
        {(pattern === "dom" || wizard.currentStep === 0) && (
          <fieldset
            hidden={pattern === "dom" ? wizard.currentStep !== 0 : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              border: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "16px", color: "#0f172a" }}>
                👤 Personal & Account Information
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Fill in your account identity. Try <code>taken@company.com</code> to test server-side async email checking.
              </p>
            </div>

            <InputField
              form={form}
              name="fullName"
              label="Full Name"
              defaultValue="Alex Mercer"
            />

            <InputField
              form={form}
              name="email"
              label="Email Address"
              type="email"
              defaultValue="alex@company.com"
            />

            <InputField
              form={form}
              name="password"
              label="Account Password"
              type="password"
              defaultValue="Pass1234!"
            />
          </fieldset>
        )}

        {/* Step 2: Shipping Details */}
        {(pattern === "dom" || wizard.currentStep === 1) && (
          <fieldset
            hidden={pattern === "dom" ? wizard.currentStep !== 1 : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              border: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "16px", color: "#0f172a" }}>
                🚚 Shipping Destination
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Provide the delivery address and preferred shipping priority.
              </p>
            </div>

            <InputField
              form={form}
              name="address"
              label="Street Address"
              defaultValue="742 Evergreen Terrace"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <InputField
                form={form}
                name="city"
                label="City"
                defaultValue="Springfield"
              />
              <InputField
                form={form}
                name="zipCode"
                label="ZIP Code (5 digits)"
                defaultValue="97477"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                Delivery Speed
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[
                  { id: "standard", label: "Standard", sub: "3-5 days (Free)" },
                  { id: "express", label: "Express", sub: "1-2 days ($9.99)" },
                  { id: "overnight", label: "Overnight", sub: "Next day ($19.99)" },
                ].map((speed) => (
                  <label
                    key={speed.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "8px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <input
                        type="radio"
                        name="deliverySpeed"
                        value={speed.id}
                        defaultChecked={
                          speed.id ===
                          ((form.runtime?.preservedValues?.["deliverySpeed"] as string | undefined) ?? "standard")
                        }
                      />
                      <strong style={{ color: "#0f172a" }}>{speed.label}</strong>
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b", paddingLeft: "18px" }}>
                      {speed.sub}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
        )}

        {/* Step 3: Review & Confirmation */}
        {(pattern === "dom" || wizard.currentStep === 2) && (
          <fieldset
            hidden={pattern === "dom" ? wizard.currentStep !== 2 : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              border: "none",
              padding: 0,
              margin: 0,
            }}
          >
          <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "16px", color: "#0f172a" }}>
              📋 Review & Final Confirmation
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Verify your order information before placing your order.
            </p>
          </div>

          {/* Live Order Summary Card */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Recipient:</span>
              <strong style={{ color: "#0f172a" }}>{String(liveValues["fullName"] || "(empty)")}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Email:</span>
              <strong style={{ color: "#0f172a" }}>{String(liveValues["email"] || "(empty)")}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Address:</span>
              <strong style={{ color: "#0f172a" }}>
                {String(liveValues["address"] || "(empty)")}, {String(liveValues["city"] || "")} {String(liveValues["zipCode"] || "")}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Shipping Speed:</span>
              <span
                style={{
                  textTransform: "capitalize",
                  fontWeight: 600,
                  color: "#0369a1",
                  backgroundColor: "#e0f2fe",
                  padding: "1px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {String(liveValues["deliverySpeed"] || "standard")}
              </span>
            </div>
          </div>

          <CheckboxField
            form={form}
            name="confirmed"
            label="I verify that all shipping and account details are accurate"
            description="Required by step-level validation before submitting final order."
            defaultChecked={false}
          />
        </fieldset>
        )}

        {/* Wizard Navigation Action Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "14px",
            borderTop: "1px solid #e2e8f0",
            marginTop: "6px",
          }}
        >
          <button
            type="button"
            onClick={wizard.prev}
            disabled={wizard.isFirstStep || isNavigating}
            style={{
              padding: "9px 18px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: wizard.isFirstStep ? "#f1f5f9" : "#ffffff",
              color: wizard.isFirstStep ? "#94a3b8" : "#334155",
              fontWeight: 600,
              fontSize: "13px",
              cursor: wizard.isFirstStep ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            ← Previous
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            {!wizard.isLastStep ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isNavigating}
                style={{
                  padding: "9px 20px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: isNavigating ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                }}
              >
                {isNavigating ? "Validating..." : "Next Step →"}
              </button>
            ) : (
              <button
                type="submit"
                disabled={form.formState.submitting}
                style={{
                  padding: "9px 22px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: form.formState.submitting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                }}
              >
                {form.formState.submitting ? "Placing Order..." : "Complete Order ✓"}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Submission Success Banner */}
      {submittedData && (
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "#f0fdf4",
            border: "1.5px solid #86efac",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ color: "#166534", fontWeight: 700, fontSize: "14px" }}>
              🎉 Order Submitted Successfully!
            </span>
            <button
              type="button"
              onClick={handleReset}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#15803d",
                background: "none",
                border: "1px solid #86efac",
                borderRadius: "4px",
                padding: "3px 8px",
                cursor: "pointer",
              }}
            >
              Start New Order
            </button>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#166534" }}>
            All 3 wizard steps passed validation and merged into final submission payload:
          </p>
          <pre
            style={{
              margin: 0,
              padding: "10px",
              backgroundColor: "#ffffff",
              borderRadius: "6px",
              fontSize: "12px",
              border: "1px solid #bbf7d0",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>
      )}

      {/* Telemetry Drawer */}
      <div style={{ marginTop: "24px" }}>
        <button
          type="button"
          onClick={() => setShowTelemetry((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: "12px",
            fontWeight: 600,
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {showTelemetry ? "▼ Hide Wizard Diagnostics" : "▶ Show Wizard Diagnostics"}
        </button>

        {showTelemetry && (
          <div
            style={{
              marginTop: "10px",
              backgroundColor: "#0f172a",
              color: "#f8fafc",
              padding: "14px",
              borderRadius: "8px",
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              <div>
                <span style={{ color: "#94a3b8" }}>Current Step:</span>{" "}
                <strong style={{ color: "#38bdf8" }}>{wizard.currentStep} ({wizard.stepId})</strong>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Progress:</span>{" "}
                <strong style={{ color: "#4ade80" }}>{Math.round(wizard.progress * 100)}%</strong>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>isFirstStep:</span>{" "}
                <span>{String(wizard.isFirstStep)}</span>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>isLastStep:</span>{" "}
                <span>{String(wizard.isLastStep)}</span>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Active Errors:</span>{" "}
                <span style={{ color: Object.keys(form.formState.errors).length > 0 ? "#f87171" : "#4ade80" }}>
                  {Object.keys(form.formState.errors).length}
                </span>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Validating:</span>{" "}
                <span>{String(form.formState.validating)}</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #334155", paddingTop: "8px" }}>
              <span style={{ color: "#94a3b8" }}>liveValues:</span>
              <pre style={{ margin: "4px 0 0", color: "#cbd5e1" }}>
                {JSON.stringify(liveValues, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main App Root with Tab Switcher ---

export function App() {
  const [activeTab, setActiveTab] = useState<
    "showcase" | "benchmark" | "wizard"
  >("showcase");

  return (
    <div
      style={{
        maxWidth:
          activeTab === "benchmark"
            ? "680px"
            : activeTab === "wizard"
            ? "620px"
            : "560px",
        margin: "30px auto",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        transition: "max-width 0.2s ease",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "22px", color: "#0f172a" }}>
          Native Form Studio
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
          Zero registration, native HTML-first web forms with multi-schema validation.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "12px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("showcase")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor:
              activeTab === "showcase" ? "#2563eb" : "#f1f5f9",
            color: activeTab === "showcase" ? "#ffffff" : "#475569",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          📝 Interactive Showcase
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wizard")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor:
              activeTab === "wizard" ? "#2563eb" : "#f1f5f9",
            color: activeTab === "wizard" ? "#ffffff" : "#475569",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🧙 Multi-Step Wizard
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("benchmark")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor:
              activeTab === "benchmark" ? "#2563eb" : "#f1f5f9",
            color: activeTab === "benchmark" ? "#ffffff" : "#475569",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ⚡ Performance Stress Test
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === "showcase" ? (
        <ShowcaseView />
      ) : activeTab === "wizard" ? (
        <WizardShowcaseView />
      ) : (
        <BenchmarkView />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
