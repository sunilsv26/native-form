import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { arrayItemPath, formPath } from "@native-form/core";
import { useField, useForm } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const loginSchema = z.object({
  user: z.object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
  teammates: z.array(
    z.object({
      email: z.string().email("Enter a valid teammate email"),
    }),
  ),
});

const USER_EMAIL = formPath("user", "email");
const USER_PASSWORD = formPath("user", "password");
const TEAMMATE_0_EMAIL = arrayItemPath("teammates", 0, "email");

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
  const email = useField({ form, name: USER_EMAIL });
  const password = useField({ form, name: USER_PASSWORD });
  const teammateEmail = useField({ form, name: TEAMMATE_0_EMAIL });

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Native Form Example</h1>
      <form
        ref={form.formRef}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div>
          <label htmlFor={USER_EMAIL}>Email:</label>
          <input
            id={USER_EMAIL}
            name={USER_EMAIL}
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
          <label htmlFor={USER_PASSWORD}>Password:</label>
          <input
            id={USER_PASSWORD}
            name={USER_PASSWORD}
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

        <div>
          <label htmlFor={TEAMMATE_0_EMAIL}>Teammate Email:</label>
          <input
            id={TEAMMATE_0_EMAIL}
            name={TEAMMATE_0_EMAIL}
            type="email"
            defaultValue="teammate@example.com"
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
            label="Teammate Email"
            touched={teammateEmail.touched}
            dirty={teammateEmail.dirty}
            error={teammateEmail.error}
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
