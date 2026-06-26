import React from "react";
import ReactDOM from "react-dom/client";
import { Form } from "@native-form/react";

const App = () => {
  return (
    <div>
      <h1>Native Form Example</h1>
      <Form onSubmit={(values) => console.log("SUBMIT:", values)}>
        <input name="email" />
        <input name="password" type="password" />
        <button type="submit">Login</button>
        <button type="reset">Reset</button>
      </Form>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
