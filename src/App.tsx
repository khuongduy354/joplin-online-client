import { useState } from "react";
import "./App.css";
import CredentialForm, { type Credentials } from "./components/CredentialForm";
import ItemList from "./components/ItemList";
import { joplinApi } from "./services/joplinApi";
import type { Item } from "joplin-sync";

function App() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  const handleConnect = async (credentials: Credentials) => {
    setLoading(true);
    setError(null);

    try {
      await joplinApi.connect(credentials);
      const fetchedItems = await joplinApi.getItems();
      setItems(fetchedItems);
      setConnected(true);
      console.log("Connected successfully. Items:", fetchedItems);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect";
      setError(errorMessage);
      console.error("Connection error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!joplinApi.isInitialized()) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedItems = await joplinApi.getItems();
      setItems(fetchedItems);
      console.log("Refreshed items:", fetchedItems);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh";
      setError(errorMessage);
      console.error("Refresh error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    joplinApi.disconnect();
    setConnected(false);
    setItems([]);
    setError(null);
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          padding: "15px 20px",
          backgroundColor: "#1e1e1e",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Joplin Online Viewer</h1>
        {connected && (
          <button
            onClick={handleDisconnect}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>
        )}
      </header>

      {!connected ? (
        <CredentialForm onSubmit={handleConnect} />
      ) : (
        <ItemList
          items={items}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
export default App;
