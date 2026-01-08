import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { api } from "../api/api";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    let email = user?.email;

    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 5) {
      setError("New password must be at least 5 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/password/reset", {
        email,
        currentPassword,
        newPassword,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Password change failed");
      }

      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD] px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Change Password
        </h1>

        <p className="mt-2 text-gray-500 text-sm">
          Update your account password securely.
        </p>

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
  {/* Current password */}
  <div>
    <label className="block text-sm font-semibold text-gray-800">
      Current Password
    </label>
    <div className="mt-2 relative">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[#852BAF]/20 to-[#FC3F78]/20 blur-[10px] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="relative w-full px-4 py-3.5 rounded-2xl bg-white/90
                   border border-gray-200 shadow-sm
                   placeholder:text-gray-400 text-gray-900
                   outline-none transition-all duration-300
                   focus:border-transparent focus:ring-4 focus:ring-[#852BAF]/15
                   focus:shadow-lg focus:shadow-[#852BAF]/10"
        placeholder="Enter current password"
      />
    </div>
  </div>

  {/* New password */}
  <div>
    <label className="block text-sm font-semibold text-gray-800">
      New Password
    </label>
    <div className="mt-2 relative">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[#852BAF]/20 to-[#FC3F78]/20 blur-[10px] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="relative w-full px-4 py-3.5 rounded-2xl bg-white/90
                   border border-gray-200 shadow-sm
                   placeholder:text-gray-400 text-gray-900
                   outline-none transition-all duration-300
                   focus:border-transparent focus:ring-4 focus:ring-[#852BAF]/15
                   focus:shadow-lg focus:shadow-[#852BAF]/10"
        placeholder="Enter new password"
      />
    </div>
  </div>

  {/* Confirm password */}
  <div>
    <label className="block text-sm font-semibold text-gray-800">
      Confirm New Password
    </label>
    <div className="mt-2 relative">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[#852BAF]/20 to-[#FC3F78]/20 blur-[10px] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="relative w-full px-4 py-3.5 rounded-2xl bg-white/90
                   border border-gray-200 shadow-sm
                   placeholder:text-gray-400 text-gray-900
                   outline-none transition-all duration-300
                   focus:border-transparent focus:ring-4 focus:ring-[#852BAF]/15
                   focus:shadow-lg focus:shadow-[#852BAF]/10"
        placeholder="Confirm new password"
      />
    </div>
  </div>

  {/* Submit */}
  <button
    type="submit"
    disabled={loading}
    className="w-full mt-4 px-6 py-3.5 rounded-2xl font-bold text-white text-lg
               bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
               transition-all duration-300 cursor-pointer active:scale-95
               hover:bg-gradient-to-r hover:from-[#FC3F78] hover:to-[#852BAF]
               shadow-lg shadow-[#852BAF]/25 hover:shadow-xl
               disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {loading ? "Updating..." : "Update Password"}
  </button>
</form>

      </div>
    </div>
  );
}
