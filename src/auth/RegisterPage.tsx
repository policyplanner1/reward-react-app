import { useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "./useAuth";

type Role = "vendor" | "vendor_manager" | "admin" | "warehouse_manager";

export default function RegisterPage() {
  const { register, loading, error: authError } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "vendor" as Role,
    phone: "",
  });

  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        formData.phone
      );
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? err.message ?? "Register failed");
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  // Tailwind Class Constants to keep code clean
  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-800 placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="flex items-center justify-center w-full min-h-screen p-4 bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-800">
      <div className="w-full max-w-lg overflow-hidden bg-white shadow-2xl rounded-2xl">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-3xl font-extrabold text-gray-900">Create Account</h2>
          <p className="mt-1 text-sm text-gray-500">Join our warehouse management system</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          
          {/* Error Alert */}
          {(error || authError) && (
            <div className="p-3 text-sm text-red-700 border-l-4 border-red-500 rounded bg-red-50">
              {error || (authError as string)}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Name */}
            <div>
              <label className={labelClass}>Full Name</label>
              <input name="name" placeholder="John Doe" className={inputClass} onChange={handleChange} required />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" placeholder="john@example.com" className={inputClass} onChange={handleChange} required />
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>Phone Number</label>
              <input name="phone" type="tel" placeholder="+1 234 567 890" className={inputClass} onChange={handleChange} />
            </div>

            {/* Role */}
            <div>
              <label className={labelClass}>User Role</label>
              <select name="role" className={inputClass} onChange={handleChange} value={formData.role}>
                <option value="vendor">Vendor</option>
                <option value="vendor_manager">Vendor Manager</option>
                <option value="admin">Admin</option>
                <option value="warehouse_manager">Warehouse Manager</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className={labelClass}>Password</label>
              <input name="password" type="password" placeholder="••••••••" className={inputClass} onChange={handleChange} required />
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input name="confirmPassword" type="password" placeholder="••••••••" className={inputClass} onChange={handleChange} required />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Register Now"}
          </button>

          <p className="mt-4 text-sm text-center text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-purple-600 hover:underline">
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}