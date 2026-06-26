import React from "react";
import ReactDOM from "react-dom/client";
import { Form } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const App = () => {
  return (
    <div>
      <h1>Native Form Example</h1>
      <Form
        schema={zodResolver(loginSchema)}
        onSubmit={(values) => console.log("SUBMIT:", values)}
      >
        <input name="email" type="email" />
        <input name="password" type="password" />
        <button type="submit">Login</button>
        <button type="reset">Reset</button>
      </Form>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
