import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import { Bars3Icon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const ROLE_LABELS = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};

// Mirrors the backend password policy (FR-AUTH-03)
const isStrongPassword = (password) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password);

function StatusMessage({ status }) {
  if (!status) return null;
  const styles =
    status.type === "success"
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-red-50 border-red-200 text-red-700";
  return (
    <div
      role={status.type === "success" ? "status" : "alert"}
      className={`p-3 border rounded-xl text-sm font-medium ${styles}`}
    >
      {status.text}
    </div>
  );
}

function ProfileSettings({ onNavigate }) {
  const { user, role, isDemo, updateProfile, changePassword } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [fullName, setFullName] = useState(user?.name || "");
  const [nameStatus, setNameStatus] = useState(null);
  const [savingName, setSavingName] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Demo sessions have no account to edit
  if (isDemo) {
    return <Navigate to="/dashboard" replace />;
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      setNameStatus({ type: "error", text: "Name cannot be empty" });
      return;
    }
    if (trimmed === user?.name) {
      setNameStatus({ type: "success", text: "Your name is already up to date" });
      return;
    }

    setSavingName(true);
    setNameStatus(null);
    const { error } = await updateProfile(trimmed);
    setSavingName(false);
    if (error) {
      setNameStatus({ type: "error", text: error.message });
    } else {
      setFullName(trimmed);
      setNameStatus({ type: "success", text: "Name updated" });
    }
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setPasswordStatus(null);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwords.current) {
      setPasswordStatus({ type: "error", text: "Enter your current password" });
      return;
    }
    if (!isStrongPassword(passwords.next)) {
      setPasswordStatus({
        type: "error",
        text: "New password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a digit",
      });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordStatus({ type: "error", text: "New passwords do not match" });
      return;
    }

    setSavingPassword(true);
    setPasswordStatus(null);
    const { error } = await changePassword(passwords.current, passwords.next);
    setSavingPassword(false);
    if (error) {
      setPasswordStatus({ type: "error", text: error.message });
    } else {
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordStatus({
        type: "success",
        text: "Password changed. Use the new password next time you sign in.",
      });
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all";
  const buttonClass =
    "px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={onNavigate}
        currentPage="profile"
        theme="white"
      />

      <div
        className={`transition-all duration-300 min-h-screen ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Profile</h1>
          <div className="w-10"></div>
        </div>

        <div className="px-6 py-8 max-w-3xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Profile Settings
            </h2>
            <p className="text-gray-600">
              Manage your account details and password
            </p>
          </div>

          {/* Account details */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900 break-all">
                  {user?.email}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Role</dt>
                <dd className="font-medium text-gray-900">
                  {ROLE_LABELS[role] || ROLE_LABELS.student}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Member since</dt>
                <dd className="font-medium text-gray-900">{memberSince}</dd>
              </div>
            </dl>
          </section>

          {/* Name */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Display name
            </h3>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setNameStatus(null);
                  }}
                  maxLength={100}
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              <StatusMessage status={nameStatus} />
              <button type="submit" disabled={savingName} className={buttonClass}>
                {savingName ? "Saving..." : "Save name"}
              </button>
            </form>
          </section>

          {/* Password */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Change password
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                {showPasswords ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
                {showPasswords ? "Hide" : "Show"}
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {[
                {
                  name: "current",
                  label: "Current password",
                  autoComplete: "current-password",
                },
                {
                  name: "next",
                  label: "New password",
                  autoComplete: "new-password",
                },
                {
                  name: "confirm",
                  label: "Confirm new password",
                  autoComplete: "new-password",
                },
              ].map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={`password-${field.name}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`password-${field.name}`}
                    name={field.name}
                    type={showPasswords ? "text" : "password"}
                    value={passwords[field.name]}
                    onChange={handlePasswordChange}
                    autoComplete={field.autoComplete}
                    maxLength={128}
                    className={inputClass}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500">
                At least 8 characters, with an uppercase letter, a lowercase
                letter, and a digit.
              </p>
              <StatusMessage status={passwordStatus} />
              <button
                type="submit"
                disabled={savingPassword}
                className={buttonClass}
              >
                {savingPassword ? "Changing..." : "Change password"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
