import { useState, useCallback } from "react";
import { apiService } from "../services/apiService";

export function useChatSession(initialChatId = null) {
  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (content, selectedDocumentId = null) => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);

    // Optimistic UI update
    const userMsg = { id: Date.now(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    try:
      const response = await apiService.sendMessage(chatId, content, selectedDocumentId);
      if (response && response.message) {
        const assistantMsg = {
          id: Date.now() + 1,
          role: "assistant",
          content: response.message.content || response.message
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (response.chat_id) {
          setChatId(response.chat_id);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  return {
    chatId,
    messages,
    loading,
    error,
    sendMessage,
    setMessages,
    setChatId
  };
}
