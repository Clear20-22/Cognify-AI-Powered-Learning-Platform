// Shared helpers for the assignment pages.

export const STATUS_STYLES = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700" },
  graded: { label: "Graded", className: "bg-green-100 text-green-700" },
};

// Mirrors the backend upload rules (FR-ASG-03)
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".zip", ".png", ".jpg", ".jpeg", ".txt"];
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");
export const MAX_FILE_MB = 20;
export const MAX_ATTACHMENTS = 5;

// Returns an error message, or null if the file may be uploaded
export const checkFile = (file) => {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return `${file.name}: file type not allowed (${ACCEPTED_EXTENSIONS.join(", ")})`;
  }
  if (file.size === 0) return `${file.name}: file is empty`;
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `${file.name}: larger than ${MAX_FILE_MB} MB`;
  }
  return null;
};

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const timeLeft = (iso) => {
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return "Deadline passed";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `Due in ${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `Due in ${hours} hour${hours === 1 ? "" : "s"}`;
  return `Due in ${Math.max(minutes, 1)} min`;
};

// ISO (UTC) -> value for <input type="datetime-local"> in the user's time zone
export const toLocalInput = (iso) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
