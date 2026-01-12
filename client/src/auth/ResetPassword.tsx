import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Guard: invalid or missing token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD] px-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-red-200 text-center max-w-md w-full">
          <h2 className="text-xl font-extrabold text-red-700">
            Invalid or Expired Link
          </h2>

          <p className="mt-3 text-sm text-gray-600">
            The password reset link is invalid or has expired. Please request a
            new password reset.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => (window.location.href = "https://rewardplanners.com/crm/login")}
              className="px-6 py-3 rounded-2xl font-bold text-white
                       bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
                       shadow-lg shadow-[#852BAF]/25
                       transition-all duration-300
                       hover:from-[#FC3F78] hover:to-[#852BAF]
                       active:scale-95"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 5) {
      setError("Password must be at least 5 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Password reset failed");
      }

      setSuccess("Password reset successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD] px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Reset Password
        </h1>

        <p className="mt-2 text-gray-500 text-sm">
          Enter a new password for your account.
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
          {/* New password */}
          <div>
            <label className="block text-sm font-semibold text-gray-800">
              New Password
            </label>
            <div className="mt-2 relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-white
                           border border-gray-200 shadow-sm
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
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-white
                           border border-gray-200 shadow-sm
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
