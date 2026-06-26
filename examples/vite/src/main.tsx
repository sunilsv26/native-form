import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Form } from "@native-form/react";
import { Runtime } from "@native-form/core";

const App = () => {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!formRef.current) return;

    const runtime = new Runtime();

    runtime.subscribe((event) => {
      console.log("EVENT:", event);
    });

    runtime.mount(formRef.current);

    return () => runtime.unmount();
  }, []);

  return (
    <div>
      <h1>Native Form Example</h1>
      <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
        <input name="email" />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
