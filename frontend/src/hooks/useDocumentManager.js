import { useState, useCallback, useEffect } from "react";
import { apiService } from "../services/apiService";

export function useDocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getDocuments();
      setDocuments(Array.isArray(data) ? data : data.documents || []);
    } catch (err) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (file) => {
    setUploading(true);
    setError(null);
    try {
      const result = await apiService.uploadDocument(file);
      await fetchDocuments();
      return result;
    } catch (err) {
      setError(err.message || "Failed to upload document");
      throw err;
    } finally {
      setUploading(false);
    }
  }, [fetchDocuments]);

  const deleteDocument = useCallback(async (docId) => {
    try {
      await apiService.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId && d._id !== docId));
    } catch (err) {
      setError(err.message || "Failed to delete document");
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    uploading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument
  };
}
