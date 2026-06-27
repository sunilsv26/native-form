import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Form } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const App = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Native Form Example</h1>
      <Form
        schema={zodResolver(loginSchema)}
        onSubmit={(values) => {
          console.log("SUBMIT:", values);
          alert("Login successful! Check console for values.");
        }}
        onInvalid={(formErrors) => {
          setErrors(formErrors);
        }}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            name="email"
            type="email"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: errors.email ? "red" : "#ccc",
            }}
          />
          {errors.email && (
            <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
              {errors.email}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            name="password"
            type="password"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: errors.password ? "red" : "#ccc",
            }}
          />
          {errors.password && (
            <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
              {errors.password}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" style={{ flex: 1, padding: "8px" }}>
            Login
          </button>
          <button type="reset" style={{ flex: 1, padding: "8px" }}>
            Reset
          </button>
        </div>
      </Form>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
