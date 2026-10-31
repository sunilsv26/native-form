import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  age: z.number().min(18, "Must be at least 18"),
  newsletter: z.boolean().optional(),
});

let renderCount = 0;

export function App() {
  renderCount++;
  const [submittedData, setSubmittedData] = useState<any>(null);

  const { formRef, formState } = useForm({
    schema: zodResolver(schema),
    serializationMode: "typed", // automatically coerces type="number" to number, checkbox to boolean
    mode: "onSubmit", // Validates on submit, keeping keystrokes completely re-render free
    reValidateMode: "onChange", // Once an error occurs, re-validates on keystroke to clear errors
    onSubmit: (values) => {
      setSubmittedData(values);
    },
  });

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>
          ⚡️ Native Form Playground
        </h2>
        <span
          style={{
            background: "#e0f2fe",
            color: "#0369a1",
            padding: "4px 12px",
            borderRadius: 16,
            fontSize: 13,
            fontWeight: 700,
            border: "1px solid #bae6fd",
          }}
        >
          Re-renders: {renderCount}
        </span>
      </div>

      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>
        Type in the inputs below. Notice how the{" "}
        <strong style={{ color: "#0284c7" }}>Re-renders counter stays at 1</strong>{" "}
        even while typing!
      </p>

      <form
        ref={formRef}
        noValidate
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "#ffffff",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 14,
              color: "#334155",
            }}
          >
            Name
          </label>
          <input
            name="name"
            type="text"
            placeholder="Jane Doe"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: formState.errors.name ? "1px solid #ef4444" : "1px solid #cbd5e1",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {formState.errors.name && (
            <p style={{ color: "#ef4444", fontSize: 13, margin: "6px 0 0" }}>
              {formState.errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 14,
              color: "#334155",
            }}
          >
            Email
          </label>
          <input
            name="email"
            type="email"
            placeholder="jane@example.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: formState.errors.email ? "1px solid #ef4444" : "1px solid #cbd5e1",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {formState.errors.email && (
            <p style={{ color: "#ef4444", fontSize: 13, margin: "6px 0 0" }}>
              {formState.errors.email}
            </p>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 14,
              color: "#334155",
            }}
          >
            Age (Auto-coerced to typed number)
          </label>
          <input
            name="age"
            type="number"
            placeholder="25"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: formState.errors.age ? "1px solid #ef4444" : "1px solid #cbd5e1",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {formState.errors.age && (
            <p style={{ color: "#ef4444", fontSize: 13, margin: "6px 0 0" }}>
              {formState.errors.age}
            </p>
          )}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            fontSize: 14,
            color: "#334155",
          }}
        >
          <input name="newsletter" type="checkbox" style={{ width: 16, height: 16 }} />
          Subscribe to newsletter (Auto-coerced to boolean)
        </label>

        <button
          type="submit"
          disabled={formState.submitting}
          style={{
            marginTop: 8,
            padding: "12px 20px",
            background: formState.submitting ? "#94a3b8" : "#0284c7",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: formState.submitting ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: 15,
            transition: "background 0.2s",
          }}
        >
          {formState.submitting ? "Validating with Zod..." : "Submit Form"}
        </button>
      </form>

      {submittedData && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#0f172a",
            color: "#38bdf8",
            borderRadius: 8,
            border: "1px solid #1e293b",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>
              Validated Output (Typed JSON):
            </span>
            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
              ✓ Schema Passed
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 13,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              overflowX: "auto",
            }}
          >
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
