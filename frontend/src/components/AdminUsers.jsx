import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { apiService } from "../services/apiService";
import Sidebar from "./Sidebar";
import { Bars3Icon } from "@heroicons/react/24/outline";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
];

const toSummary = (user) => ({
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  is_active: user.is_active,
  created_at: user.created_at,
});

// Admin user management (FR-AUTH-09). The backend enforces admin-only access;
// this page is also hidden from the sidebar and redirects non-admins.
function AdminUsers({ onNavigate }) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await apiService.listUsers();
        setUsers(data.users || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const replaceUser = (updated) =>
    setUsers((current) =>
      current.map((u) => (u.id === updated.id ? toSummary(updated) : u))
    );

  const changeRole = async (target, role) => {
    if (role === target.role) return;
    setBusyId(target.id);
    setNotice(null);
    try {
      replaceUser(await apiService.setUserRole(target.id, role));
      setNotice({
        type: "success",
        text: `${target.email} is now ${ROLE_OPTIONS.find((r) => r.value === role).label}`,
      });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (target) => {
    const activate = !target.is_active;
    if (
      !activate &&
      !window.confirm(
        `Deactivate ${target.email}? They will not be able to sign in until reactivated.`
      )
    ) {
      return;
    }
    setBusyId(target.id);
    setNotice(null);
    try {
      replaceUser(await apiService.setUserStatus(target.id, activate));
      setNotice({
        type: "success",
        text: `${target.email} ${activate ? "reactivated" : "deactivated"}`,
      });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const query = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === "active" && !u.is_active) return false;
    if (statusFilter === "inactive" && u.is_active) return false;
    if (!query) return true;
    return [u.full_name, u.email].some((text) =>
      (text || "").toLowerCase().includes(query)
    );
  });

  const counts = {
    total: users.length,
    student: users.filter((u) => u.role === "student").length,
    teacher: users.filter((u) => u.role === "teacher").length,
    admin: users.filter((u) => u.role === "admin").length,
    inactive: users.filter((u) => !u.is_active).length,
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const selectClass =
    "px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={onNavigate}
        currentPage="admin"
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
          <h1 className="text-lg font-bold">Admin</h1>
          <div className="w-10"></div>
        </div>

        <div className="px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              User Management
            </h2>
            <p className="text-gray-600">
              View all accounts, change roles, and deactivate or reactivate users
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total users", value: counts.total },
              { label: "Students", value: counts.student },
              { label: "Teachers", value: counts.teacher },
              { label: "Admins", value: counts.admin },
              { label: "Deactivated", value: counts.inactive },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              aria-label="Search users"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className={selectClass}
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className={selectClass}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>

          {notice && (
            <div
              role={notice.type === "success" ? "status" : "alert"}
              className={`mb-4 p-3 border rounded-xl text-sm font-medium ${
                notice.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Users table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
            >
              Could not load users: {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-gray-600 py-16">
              No users match these filters.
            </p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id;
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id} className={u.is_active ? "" : "bg-gray-50"}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {u.full_name || "—"}
                            {isSelf && (
                              <span className="ml-2 text-xs text-gray-500">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-gray-500 break-all">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value)}
                            disabled={isSelf || busy}
                            aria-label={`Role for ${u.email}`}
                            title={isSelf ? "You cannot change your own role" : ""}
                            className="px-3 py-2 border border-gray-200 rounded-lg bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              u.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {u.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={isSelf || busy}
                            title={
                              isSelf ? "You cannot deactivate your own account" : ""
                            }
                            className={`px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              u.is_active
                                ? "text-red-600 hover:bg-red-50"
                                : "text-green-700 hover:bg-green-50"
                            }`}
                          >
                            {busy
                              ? "Saving..."
                              : u.is_active
                              ? "Deactivate"
                              : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;
