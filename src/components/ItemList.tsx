import { useState } from "react";
import type { Item } from "joplin-sync";

interface Props {
  items: Item[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function ItemList({ items, loading, error, onRefresh }: Props) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [filter, setFilter] = useState<
    "all" | "notes" | "folders" | "tags" | "resources"
  >("all");

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "notes") return item.type_ === 1;
    if (filter === "folders") return item.type_ === 2;
    if (filter === "tags") return item.type_ === 5;
    if (filter === "resources") return item.type_ === 4;
    return true;
  });

  const getItemTypeLabel = (type: number): string => {
    switch (type) {
      case 1:
        return "Note";
      case 2:
        return "Folder";
      case 5:
        return "Tag";
      case 4:
        return "Resource";
      default:
        return `Type ${type}`;
    }
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Loading items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "red" }}>
        <p>Error: {error}</p>
        <button
          onClick={onRefresh}
          style={{ marginTop: "10px", padding: "8px 16px" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      <div
        style={{
          flex: "0 0 300px",
          borderRight: "1px solid #ddd",
          paddingRight: "20px",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>Items ({filteredItems.length})</h2>
          <button
            onClick={onRefresh}
            style={{ padding: "6px 12px", fontSize: "14px" }}
          >
            Refresh
          </button>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Filter:
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{ width: "100%", padding: "6px", fontSize: "14px" }}
          >
            <option value="all">All ({items.length})</option>
            <option value="notes">
              Notes ({items.filter((i) => i.type_ === 1).length})
            </option>
            <option value="folders">
              Folders ({items.filter((i) => i.type_ === 2).length})
            </option>
            <option value="tags">
              Tags ({items.filter((i) => i.type_ === 5).length})
            </option>
            <option value="resources">
              Resources ({items.filter((i) => i.type_ === 4).length})
            </option>
          </select>
        </div>

        <div style={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
          {filteredItems.length === 0 ? (
            <p style={{ color: "#666" }}>No items found</p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                style={{
                  padding: "10px",
                  marginBottom: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  backgroundColor:
                    selectedItem?.id === item.id ? "#e3f2fd" : "white",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  {item.title || "(Untitled)"}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {getItemTypeLabel(item.type_)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {selectedItem ? (
          <div>
            <h2>{selectedItem.title || "(Untitled)"}</h2>
            <div
              style={{
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <strong>Type:</strong> {getItemTypeLabel(selectedItem.type_)}
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong>ID:</strong> <code>{selectedItem.id}</code>
              </div>
              {selectedItem.parent_id && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>Parent ID:</strong>{" "}
                  <code>{selectedItem.parent_id}</code>
                </div>
              )}
              <div style={{ marginBottom: "8px" }}>
                <strong>Created:</strong>{" "}
                {formatDate(selectedItem.created_time)}
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong>Updated:</strong>{" "}
                {formatDate(selectedItem.updated_time)}
              </div>
            </div>

            {selectedItem.body && (
              <div>
                <h3>Content:</h3>
                <div
                  style={{
                    padding: "15px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  {selectedItem.body}
                </div>
              </div>
            )}

            {selectedItem.type_ === 4 && (
              <div style={{ marginTop: "15px" }}>
                <h3>Resource Info:</h3>
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  {selectedItem.size && (
                    <div>
                      <strong>Size:</strong> {selectedItem.size} bytes
                    </div>
                  )}
                  {selectedItem.localResourceContentPath && (
                    <div>
                      <strong>Local Path:</strong>{" "}
                      {selectedItem.localResourceContentPath}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
            <p>Select an item to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
