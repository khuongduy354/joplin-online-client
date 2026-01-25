import { useEffect, useState, useMemo } from "react";
import type { Item } from "joplin-sync";
import { joplinApi } from "../services/joplinApi";
import "./ItemList.css";

interface Props {
  items: Item[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

interface TreeNode {
  item: Item;
  children: TreeNode[];
}

const ITEM_TYPES = {
  NOTE: 1,
  FOLDER: 2,
  RESOURCE: 4,
  TAG: 5,
  REVISION: 13,
} as const;

export default function ItemList({ items, loading, error, onRefresh }: Props) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemDetail, setItemDetail] = useState<Item | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());



  // Filter out revisions and unknown types
  const validItems = useMemo(() => {
    const filtered = items.filter((item) => {
      // Skip null or undefined items
      if (!item) return false;
      
      // Skip items without type_ property (like info.json, config.yml from file listing)
      if (typeof item.type_ !== 'number') return false;
      
      // Filter out revisions (type 13)
      if (item.type_ === ITEM_TYPES.REVISION) return false;
      
      // Only show notes, folders, resources, and tags
      const validTypes: number[] = [ITEM_TYPES.NOTE, ITEM_TYPES.FOLDER, ITEM_TYPES.RESOURCE, ITEM_TYPES.TAG];
      return validTypes.includes(item.type_);
    });
    
    console.log(`[ItemList] Filtered ${filtered.length} valid items from ${items.length} total items`);
    return filtered;
  }, [items]);

  // Build folder tree structure
  const folderTree = useMemo(() => {
    const folders = validItems.filter((item) => item.type_ === ITEM_TYPES.FOLDER);
    const notes = validItems.filter((item) => item.type_ === ITEM_TYPES.NOTE);
    
    // Create a map of folder ID to TreeNode
    const folderMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Initialize all folders
    folders.forEach((folder) => {
      folderMap.set(folder.id, { item: folder, children: [] });
    });

    // Build tree structure for folders
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id)!;
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Add notes to their parent folders
    notes.forEach((note) => {
      if (note.parent_id && folderMap.has(note.parent_id)) {
        folderMap.get(note.parent_id)!.children.push({
          item: note,
          children: [],
        });
      } else {
        // Orphaned notes (no parent folder)
        rootNodes.push({ item: note, children: [] });
      }
    });

    // Sort children: folders first, then notes, alphabetically
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.item.type_ !== b.item.type_) {
          return a.item.type_ === ITEM_TYPES.FOLDER ? -1 : 1;
        }
        return (a.item.title || "").localeCompare(b.item.title || "");
      });
      node.children.forEach(sortChildren);
    };

    rootNodes.forEach(sortChildren);
    rootNodes.sort((a, b) => {
      if (a.item.type_ !== b.item.type_) {
        return a.item.type_ === ITEM_TYPES.FOLDER ? -1 : 1;
      }
      return (a.item.title || "").localeCompare(b.item.title || "");
    });

    return rootNodes;
  }, [validItems]);

  // Fetch item details when selected
  useEffect(() => {
    if (!selectedItem) {
      setItemDetail(null);
      return;
    }

    const fetchItemDetail = async () => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const detail = await joplinApi.getItem(selectedItem.id);
        setItemDetail(detail);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load item details";
        setDetailError(errorMsg);
        console.error("Error fetching item detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchItemDetail();
  }, [selectedItem]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getItemIcon = (type: number): string => {
    switch (type) {
      case ITEM_TYPES.NOTE:
        return "📄";
      case ITEM_TYPES.FOLDER:
        return "📁";
      case ITEM_TYPES.TAG:
        return "🏷️";
      case ITEM_TYPES.RESOURCE:
        return "📎";
      default:
        return "📋";
    }
  };

  const getItemTypeLabel = (type: number): string => {
    switch (type) {
      case ITEM_TYPES.NOTE:
        return "Note";
      case ITEM_TYPES.FOLDER:
        return "Folder";
      case ITEM_TYPES.TAG:
        return "Tag";
      case ITEM_TYPES.RESOURCE:
        return "Resource";
      default:
        return `Type ${type}`;
    }
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isFolder = node.item.type_ === ITEM_TYPES.FOLDER;
    const isExpanded = expandedFolders.has(node.item.id);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedItem?.id === node.item.id;

    return (
      <div key={node.item.id} className="tree-node">
        <div
          className={`tree-item ${isSelected ? "selected" : ""} ${isFolder ? "folder" : "note"}`}
          style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
          onClick={() => setSelectedItem(node.item)}
        >
          {isFolder && hasChildren && (
            <button
              className="expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.item.id);
              }}
            >
              <span className={`arrow ${isExpanded ? "expanded" : ""}`}>▶</span>
            </button>
          )}
          {isFolder && !hasChildren && <span className="expand-placeholder" />}
          <span className="item-icon">{getItemIcon(node.item.type_)}</span>
          <span className="item-title">{node.item.title || "(Untitled)"}</span>
          {isFolder && hasChildren && (
            <span className="item-count">({node.children.length})</span>
          )}
        </div>
        {isFolder && isExpanded && hasChildren && (
          <div className="tree-children">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="item-list-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="item-list-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p className="error-message">Error: {error}</p>
          <button onClick={onRefresh} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total: validItems.length,
    notes: validItems.filter((i) => i.type_ === ITEM_TYPES.NOTE).length,
    folders: validItems.filter((i) => i.type_ === ITEM_TYPES.FOLDER).length,
    resources: validItems.filter((i) => i.type_ === ITEM_TYPES.RESOURCE).length,
    tags: validItems.filter((i) => i.type_ === ITEM_TYPES.TAG).length,
  };

  return (
    <div className="item-list-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Library</h2>
          <button onClick={onRefresh} className="refresh-btn" title="Refresh">
            ↻
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.folders}</span>
            <span className="stat-label">Folders</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.notes}</span>
            <span className="stat-label">Notes</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.resources}</span>
            <span className="stat-label">Resources</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.tags}</span>
            <span className="stat-label">Tags</span>
          </div>
        </div>

        <div className="tree-container">
          {folderTree.length === 0 ? (
            <div className="empty-state">
              <p>No items found</p>
            </div>
          ) : (
            folderTree.map((node) => renderTreeNode(node))
          )}
        </div>
      </div>

      <div className="detail-panel">
        {!selectedItem ? (
          <div className="empty-detail">
            <div className="empty-icon">📋</div>
            <p>Select an item to view details</p>
          </div>
        ) : loadingDetail ? (
          <div className="loading-detail">
            <div className="spinner" />
            <p>Loading details...</p>
          </div>
        ) : detailError ? (
          <div className="error-detail">
            <div className="error-icon">⚠️</div>
            <p>Error loading details: {detailError}</p>
          </div>
        ) : itemDetail ? (
          <div className="detail-content">
            <div className="detail-header">
              <h2 className="detail-title">
                <span className="detail-icon">{getItemIcon(itemDetail.type_)}</span>
                {itemDetail.title || "(Untitled)"}
              </h2>
              <span className="detail-type">{getItemTypeLabel(itemDetail.type_)}</span>
            </div>

            <div className="detail-metadata">
              <div className="metadata-row">
                <span className="metadata-label">ID</span>
                <code className="metadata-value">{itemDetail.id}</code>
              </div>
              {itemDetail.parent_id && (
                <div className="metadata-row">
                  <span className="metadata-label">Parent ID</span>
                  <code className="metadata-value">{itemDetail.parent_id}</code>
                </div>
              )}
              <div className="metadata-row">
                <span className="metadata-label">Created</span>
                <span className="metadata-value">{formatDate(itemDetail.created_time)}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Updated</span>
                <span className="metadata-value">{formatDate(itemDetail.updated_time)}</span>
              </div>
            </div>

            {itemDetail.body && (
              <div className="detail-body">
                <h3 className="section-title">Content</h3>
                <div className="content-preview">
                  {itemDetail.body}
                </div>
              </div>
            )}

            {itemDetail.type_ === ITEM_TYPES.RESOURCE && (
              <div className="resource-info">
                <h3 className="section-title">Resource Information</h3>
                <div className="detail-metadata">
                  {itemDetail.size && (
                    <div className="metadata-row">
                      <span className="metadata-label">Size</span>
                      <span className="metadata-value">
                        {(itemDetail.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  )}
                  {(itemDetail as any).mime && (
                    <div className="metadata-row">
                      <span className="metadata-label">MIME Type</span>
                      <span className="metadata-value">{(itemDetail as any).mime}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-detail">
            <p>No details available</p>
          </div>
        )}
      </div>
    </div>
  );
}
