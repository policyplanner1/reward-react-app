import { LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../api/api";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getErrorMessage = (err: unknown, fallback = "Something went wrong") => {
    if (!err) return fallback;
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (typeof err === "object" && err !== null) {
      const maybe = err as { response?: { data?: { message?: string } } };
      return maybe.response?.data?.message ?? fallback;
    }
    return fallback;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter a valid email.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send reset email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-6 text-center text-2xl font-semibold">
          Forgot Password?
        </h2>

        {success ? (
          <p className="text-center text-green-600">
            Reset email sent. Please check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  className="w-full pl-10 px-4 py-2 border rounded-lg"
                  placeholder="Enter your email"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <button
              disabled={loading}
              className="w-full py-2 bg-black text-white rounded-lg"
            >
              {loading ? (
                <LoaderCircle className="animate-spin mx-auto" />
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-blue-600">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
