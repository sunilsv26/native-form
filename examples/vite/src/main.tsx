import React, { useId, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { arrayItemPath, formPath, type ValidationMode } from "@native-form/core";
import {
  useField,
  useForm,
  UseFormResult,
  useWatch,
} from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { yupResolver } from "@native-form/yup";
import { z } from "zod";
import * as yup from "yup";

// --- Schemas ---

const zodLoginSchema = z.object({
  user: z.object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
  teammates: z.array(
    z.object({
      email: z.string().email("Enter a valid teammate email"),
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
      .min(8, "Password must be at least 8 characters")
      .required("Password is required"),
  }),
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
const USER_PASSWORD = formPath("user", "password");

// --- Components ---

function FieldStatus({
  label,
  touched,
  dirty,
  error,
}: {
  label: string;
  touched: boolean;
  dirty: boolean;
  error?: string;
}) {
  return (
    <p
      style={{
        margin: "4px 0 0",
        fontSize: "12px",
        color: error ? "#e11d48" : "#64748b",
      }}
    >
      {label}: {error ? <strong>{error}</strong> : "ok"} (touched:{" "}
      {String(touched)}, dirty: {String(dirty)})
    </p>
  );
}

function InputField({
  form,
  name,
  label,
  type = "text",
  defaultValue = "",
}: {
  form: UseFormResult;
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  const field = useField({ form, name });

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
        defaultValue={defaultValue}
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
      />
    </div>
  );
}

function TeammateRow({
  form,
  name,
  index,
  onRemove,
}: {
  form: UseFormResult;
  name: string;
  index: number;
  onRemove: () => void;
}) {
  const field = useField({ form, name });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        padding: "10px",
        background: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ flex: 1 }}>
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
      <button
        type="button"
        onClick={onRemove}
        style={{
          padding: "8px 12px",
          backgroundColor: "#fee2e2",
          color: "#991b1b",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "12px",
        }}
      >
        Remove
      </button>
    </div>
  );
}

// Live telemetry panel using `useWatch` to demonstrate isolated re-renders
function LiveTelemetry({ form }: { form: UseFormResult }) {
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  const userEmail = useWatch({ form, name: USER_EMAIL });
  const isValid = useWatch({ form, selector: (s) => s.valid });
  const isSubmitting = useWatch({ form, selector: (s) => s.submitting });
  const allValues = useWatch({ form });

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "14px",
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
          marginBottom: "10px",
          borderBottom: "1px solid #334155",
          paddingBottom: "8px",
        }}
      >
        <span style={{ fontWeight: 700, color: "#38bdf8" }}>
          Live Telemetry (useWatch)
        </span>
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

      <p style={{ margin: "4px 0" }}>
        <strong>Current User:</strong> {String(userEmail || "(not entered)")}
      </p>
      <p style={{ margin: "4px 0" }}>
        <strong>Submitting:</strong> {String(isSubmitting)}
      </p>
      <p style={{ margin: "4px 0" }}>
        <strong>Telemetry Panel Renders:</strong> {renderCountRef.current}
      </p>

      <div style={{ marginTop: "10px" }}>
        <span style={{ fontWeight: 600, color: "#94a3b8" }}>
          Serialized Form Values:
        </span>
        <pre
          style={{
            margin: "6px 0 0",
            padding: "8px",
            background: "#1e293b",
            borderRadius: "6px",
            overflowX: "auto",
            fontSize: "12px",
            color: "#a5f3fc",
          }}
        >
          {JSON.stringify(allValues, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// --- Main App ---

export function App() {
  const [adapterType, setAdapterType] = useState<"zod" | "yup">("zod");
  const [validationMode, setValidationMode] = useState<ValidationMode>("onChange");
  const [teammateIds, setTeammateIds] = useState<number[]>([1]);

  const appRenders = useRef(0);
  appRenders.current++;

  const schema = useMemo(() => {
    return adapterType === "zod"
      ? zodResolver(zodLoginSchema)
      : yupResolver(yupLoginSchema);
  }, [adapterType]);

  // subscribe: false ensures the App component does NOT re-render on input keystrokes
  const form = useForm({
    schema,
    mode: validationMode,
    subscribe: false,
    onSubmit: (values) => {
      console.log("SUBMIT SUCCESS:", values);
      alert(`Login Successful!\n${JSON.stringify(values, null, 2)}`);
    },
    onInvalid: (errors) => {
      console.warn("FORM INVALID:", errors);
    },
  });

  const addTeammate = () => {
    setTeammateIds((prev) => [...prev, Date.now()]);
  };

  const removeTeammate = (index: number) => {
    setTeammateIds((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      style={{
        maxWidth: "540px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "22px", color: "#0f172a" }}>
          Native Form Showcase
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
          Zero registration, native HTML-first form with live telemetry.
        </p>
      </div>

      {/* Configuration card: Adapter & Validation Mode */}
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
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "#334155" }}>Adapter:</span>
            <label style={{ cursor: "pointer", display: "flex", gap: "4px" }}>
              <input
                type="radio"
                name="adapter"
                checked={adapterType === "zod"}
                onChange={() => setAdapterType("zod")}
              />
              Zod
            </label>
            <label style={{ cursor: "pointer", display: "flex", gap: "4px" }}>
              <input
                type="radio"
                name="adapter"
                checked={adapterType === "yup"}
                onChange={() => setAdapterType("yup")}
              />
              Yup
            </label>
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
          <span style={{ fontWeight: 600, color: "#334155" }}>Validation Mode:</span>
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

        {/* Helpful explanation of current mode */}
        <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
          {validationMode === "onChange" && "• Validates immediately on each keystroke as you type."}
          {validationMode === "onBlur" && "• Validates only when clicking or tabbing away from an input (blur)."}
          {validationMode === "onSubmit" && "• Suppresses errors until clicking the 'Submit Form' button."}
          {validationMode === "onTouched" && "• Waits for first blur, then validates live on each subsequent keystroke."}
          {validationMode === "all" && "• Validates on both blur and keystroke events."}
        </div>
      </div>

      <form
        ref={form.formRef}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <InputField
          form={form}
          name={USER_EMAIL}
          label="Your Email"
          type="email"
          defaultValue=""
        />

        <InputField
          form={form}
          name={USER_PASSWORD}
          label="Your Password"
          type="password"
          defaultValue=""
        />

        {/* Dynamic Field Array */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              Teammates ({teammateIds.length})
            </label>
            <button
              type="button"
              onClick={addTeammate}
              style={{
                padding: "4px 10px",
                backgroundColor: "#e0e7ff",
                color: "#3730a3",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              + Add Teammate
            </button>
          </div>

          {teammateIds.map((id, index) => {
            const fieldName = arrayItemPath("teammates", index, "email");
            return (
              <TeammateRow
                key={id}
                form={form}
                name={fieldName}
                index={index}
                onRemove={() => removeTeammate(index)}
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

      <LiveTelemetry form={form} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
