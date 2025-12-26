import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./useAuth";

type Role = "vendor" | "vendor_manager" | "admin" | "warehouse_manager";

interface LoginForm {
  email: string;
  password: string;
  role: Role;
}

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth();
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
    role: "vendor",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(formData.email, formData.password, formData.role);
    } catch (err: unknown) {
      setError("Login failed. Please check your credentials.");
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-6 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="relative w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        <div className="p-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 shadow-lg rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to continue to your dashboard
            </p>
          </div>

          {(error || authError) && (
            <div className="flex items-start gap-3 p-4 mb-6 text-sm text-red-700 border border-red-100 rounded-xl bg-red-50">
              <svg
                className="w-4 h-4 mt-0.5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                />
              </svg>
              {error || authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block mb-1 text-xs font-semibold tracking-wide text-gray-700 uppercase"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
                className="w-full px-4 py-3 text-gray-800 transition-all outline-none text-der-gray-200 boxrder tebg-white te rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange} 
              />
            </div>

            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="block mb-1 text-xs font-semibold tracking-wide text-gray-700 uppercase"
              >
                Account Role
              </label>
              <select
                id="role"
                name="role"
                disabled={loading}
                className="w-full px-4 py-3 transition-all bg-white border border-gray-200 outline-none rounded-xl focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="vendor">Vendor</option>
                <option value="vendor_manager">Vendor Manager</option>
                <option value="admin">Admin</option>
                <option value="warehouse_manager">Warehouse Manager</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block mb-1 text-xs font-semibold tracking-wide text-gray-700 uppercase"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                className="w-full px-4 py-3 transition-all bg-white border border-gray-200 outline-none rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-10 text-sm text-center text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-purple-600 hover:text-purple-800 underline-offset-4 hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
