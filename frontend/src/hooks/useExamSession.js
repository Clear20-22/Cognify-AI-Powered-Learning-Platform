import { useState, useCallback } from "react";
import { apiService } from "../services/apiService";

export function useExamSession() {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createExam = useCallback(async (topic, difficulty = "intermediate", numQuestions = 5, language = "English") => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.createExam(topic, difficulty, numQuestions, language);
      setExam(data);
      setAnswers({});
      setResult(null);
      return data;
    } catch (err) {
      setError(err.message || "Failed to create exam");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectAnswer = useCallback((questionIndex, optionLetter) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionLetter
    }));
  }, []);

  const submitExam = useCallback(async (examId) => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.submitExam(examId, answers);
      setResult(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to submit exam");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [answers]);

  return {
    exam,
    answers,
    result,
    loading,
    error,
    createExam,
    selectAnswer,
    submitExam,
    resetExam: () => {
      setExam(null);
      setAnswers({});
      setResult(null);
    }
  };
}
