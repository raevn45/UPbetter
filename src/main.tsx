import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import EditorialRuntime from "./components/EditorialRuntime";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("UP offline support could not be registered:", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><EditorialRuntime/><App /></React.StrictMode>
);