import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { useField, useForm } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const loginSchema = z.object({
  user: z.object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

const FieldStatus = ({
  label,
  touched,
  dirty,
  error,
}: {
  label: string;
  touched: boolean;
  dirty: boolean;
  error?: string;
}) => {
  return (
    <p
      style={{
        margin: "6px 0 0",
        fontSize: "12px",
        color: error ? "#b42318" : "#667085",
      }}
    >
      {label}: {error ?? "ok"} (touched: {String(touched)}, dirty:{" "}
      {String(dirty)})
    </p>
  );
};

const App = () => {
  const schema = useMemo(() => zodResolver(loginSchema), []);

  const form = useForm({
    schema,
    onSubmit: (values) => {
      console.log("SUBMIT:", values);
      alert("Login successful! Check console for values.");
    },
  });
  const email = useField({ form, name: "user.email" });
  const password = useField({ form, name: "user.password" });

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Native Form Example</h1>
      <form
        ref={form.formRef}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div>
          <label htmlFor="user.email">Email:</label>
          <input
            id="user.email"
            name="user.email"
            type="email"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#ccc",
            }}
          />
          <FieldStatus
            label="Email"
            touched={email.touched}
            dirty={email.dirty}
            error={email.error}
          />
        </div>

        <div>
          <label htmlFor="user.password">Password:</label>
          <input
            id="user.password"
            name="user.password"
            type="password"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#ccc",
            }}
          />
          <FieldStatus
            label="Password"
            touched={password.touched}
            dirty={password.dirty}
            error={password.error}
          />
        </div>

        <p style={{ margin: 0, fontSize: "12px", color: "#344054" }}>
          Form valid: {String(form.formState.valid)} | submitting:{" "}
          {String(form.formState.submitting)}
        </p>

        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" style={{ flex: 1, padding: "8px" }}>
            Login
          </button>
          <button type="reset" style={{ flex: 1, padding: "8px" }}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
