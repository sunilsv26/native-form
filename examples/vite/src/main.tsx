import React from "react";
import ReactDOM from "react-dom/client";
import { createForm } from "@native-form/react";

const App = () => {
  const form = createForm();

  return (
    <div>
      <h1>Native Form Example</h1>
      <pre>{JSON.stringify(form.submit(), null, 2)}</pre>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
