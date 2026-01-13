import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { api } from "../api/api";
import {
  Lock,
  ShieldCheck,
  LoaderCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("User not authenticated.");
      return;
    }

    const email = user?.email;

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

  const labelClass =
    "block text-[11px] font-bold tracking-widest text-slate-600 uppercase";

  const inputClass =
    "relative w-full pl-11 pr-12 py-3 rounded-2xl bg-white/90 text-slate-900 placeholder:text-slate-400 " +
    "border border-slate-200 shadow-sm outline-none transition-all duration-300 " +
    "focus:border-transparent focus:ring-4 focus:ring-[#852BAF]/15 focus:shadow-lg focus:shadow-[#852BAF]/10";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD] px-4">
      <div className="w-full max-w-lg">
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-white/40 via-white/10 to-white/40 shadow-2xl">
          <div className="relative rounded-3xl bg-white/95 backdrop-blur-xl px-8 py-8 shadow-xl overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#38bdf8]/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-[#ec4899]/15 blur-2xl" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
                  Change Password
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Update your account password securely.
                </p>
              </div>

              <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-[#852BAF] to-[#FC3F78] shadow-md shadow-[#852BAF]/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="text-white" size={18} />
              </div>
            </div>

            {error && (
              <div className="relative mt-5 p-3 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="relative mt-5 p-3 rounded-2xl bg-green-50 text-green-700 border border-green-200 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">
              {/* Current Password */}
              <div>
                <label className={labelClass}>Current Password</label>
                <div className="relative group mt-2">
                  <Lock
                    className="absolute left-4 top-3.5 text-slate-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className={labelClass}>New Password</label>
                <div className="relative group mt-2">
                  <Lock
                    className="absolute left-4 top-3.5 text-slate-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <div className="relative group mt-2">
                  <Lock
                    className="absolute left-4 top-3.5 text-slate-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 text-white font-bold py-3.5 rounded-2xl text-lg
                           bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
                           shadow-lg shadow-[#852BAF]/25 transition-all duration-300 cursor-pointer
                           hover:bg-gradient-to-r hover:from-[#FC3F78] hover:to-[#852BAF]
                           hover:shadow-xl active:scale-95
                           disabled:opacity-60 disabled:cursor-not-allowed
                           inline-flex items-center justify-center"
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}