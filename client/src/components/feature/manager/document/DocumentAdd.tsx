"use client";

import React, { useEffect, useState } from "react";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiPlus,
  FiX,
  FiSave,
  FiFileText,
} from "react-icons/fi";

const API_BASE_URL = "http://localhost:5000/api";

interface DocumentItem {
  document_id: number;
  document_name: string;
  created_at: string;
}

export default function DocumentManagement() {
  /* =============================
        STATE
  ============================== */
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [document_name, setDocumentName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DocumentItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  /* =============================
        FETCH ALL DOCUMENTS
  ============================== */
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/manager/documents`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json",
        },
      });

      const response = await res.json();

      setDocuments(response.data || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
      setDocuments([]);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  /* =============================
        ADD DOCUMENT (POST)
  ============================== */
  const handleAdd = async () => {
    if (!document_name.trim()) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/manager/create-document`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name:document_name }),
      });

      if (!res.ok) throw new Error("Failed to add document");

      setDocumentName("");
      fetchDocuments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* =============================
        VIEW DOCUMENT (GET BY ID)
  ============================== */
  const handleView = async (document_id: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/manager/document/${document_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();

      setSelected(data.data);
      setEditName(data.data.document_name);
      setEditMode(false);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Failed to fetch document", err);
    }
  };

  /* =============================
        UPDATE DOCUMENT (PUT)
  ============================== */
  const handleSaveEdit = async () => {
    if (!selected || !editName.trim()) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/manager/update-document/${selected.document_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: editName }),
        }
      );

      if (!res.ok) throw new Error("Failed to update document");

      fetchDocuments();
      setSelected({ ...selected, document_name: editName });
      setEditMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  /* =============================
        DELETE DOCUMENT
  ============================== */
  const handleDelete = async (document_id: number) => {
    if (!confirm("Delete this document?")) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/manager/delete-document/${document_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "Content-Type": "application/json",
          },
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error("Failed to delete document");

      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      {/* HEADER */}
      <h1 className="flex items-center gap-2 mb-6 text-3xl font-bold text-purple-700">
        <FiFileText /> Document Management
      </h1>

      {/* ADD DOCUMENT */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row">
        <input
          value={document_name}
          onChange={(e) => setDocumentName(e.target.value)}
          className="flex-1 px-4 py-3 border rounded-xl"
          placeholder="Enter document name"
        />

        <button
          disabled={loading}
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
        >
          <FiPlus /> Add Document
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-2xl">
        <table className="min-w-full">
          <thead className="text-white bg-purple-600">
            <tr>
              <th className="px-6 py-4 text-left">Document Name</th>
              <th className="px-6 py-4 text-left">Created Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                  No documents found
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr
                  key={doc.document_id}
                  className="border-b hover:bg-purple-50"
                >
                  <td className="px-6 py-4 font-medium">{doc.document_name}</td>
                  <td className="px-6 py-4">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="flex justify-end gap-3 px-6 py-4">
                    <button onClick={() => handleView(doc.document_id)}>
                      <FiEye />
                    </button>
                    <button
                      className="text-purple-600"
                      onClick={() => {
                        handleView(doc.document_id);
                        setEditMode(true);
                      }}
                    >
                      <FiEdit />
                    </button>
                    <button
                      className="text-red-600"
                      onClick={() => handleDelete(doc.document_id)}
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DRAWER */}
      {drawerOpen && selected && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-[400px] bg-white shadow-xl rounded-l-2xl">
            <div className="flex justify-between p-6 bg-purple-600">
              <h2 className="text-xl font-bold text-white">
                {selected.document_name}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-white"
              >
                <FiX size={22} />
              </button>
            </div>

            <div className="p-6">
              {!editMode ? (
                <button
                  className="w-full py-3 mb-3 font-semibold text-white bg-purple-600 rounded-xl"
                  onClick={() => setEditMode(true)}
                >
                  <FiEdit className="inline-block mr-2" />
                  Edit Document
                </button>
              ) : (
                <>
                  <label className="text-sm font-medium">Document Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 mb-4 border rounded-xl"
                  />

                  <button
                    onClick={handleSaveEdit}
                    className="w-full py-3 mb-3 text-white bg-purple-700 rounded-xl"
                  >
                    <FiSave className="inline-block mr-2" />
                    Save Changes
                  </button>

                  <button
                    onClick={() => setEditMode(false)}
                    className="w-full py-3 border rounded-xl"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
