import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "./useAuth";
import logoImage from "../assets/logo.svg";
import { Eye, EyeOff } from "lucide-react";

type Role = "vendor" | "vendor_manager" | "admin" | "warehouse_manager";

type FieldProps = {
  label: string;
  htmlFor: string;
  labelClass: string;
  children: React.ReactNode;
};

function Field({ label, htmlFor, labelClass, children }: FieldProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>

      <div className="relative mt-2">
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 blur-lg transition duration-300
                     bg-gradient-to-r from-[#852BAF]/25 to-[#FC3F78]/25
                     focus-within:opacity-100"
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { register, loading, error: authError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "vendor" as Role,
    phone: "",
  });

  const [error, setError] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const labelClass =
    "block text-[11px] font-bold tracking-widest text-slate-600 uppercase";

  const inputBase =
    "w-full px-4 py-3 rounded-2xl bg-white/90 text-slate-900 placeholder:text-slate-400 border border-slate-200 shadow-sm outline-none transition-all duration-300 focus:border-transparent focus:ring-4 focus:ring-[#852BAF]/15 focus:shadow-lg focus:shadow-[#852BAF]/10";

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-tr from-[#38bdf8] via-[#a855f7] to-[#ec4899] font-sans px-4">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="relative z-10 w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="relative hidden md:block bg-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(900px_circle_at_85%_30%,rgba(168,85,247,0.10),transparent_55%),radial-gradient(900px_circle_at_50%_110%,rgba(236,72,153,0.08),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

          <div className="relative h-full w-full flex items-center justify-center p-10">
            <img
              src={logoImage}
              alt="Register Illustration"
              className="w-full max-w-md drop-shadow-2xl select-none mt-[-4em]"
              draggable={false}
            />
          </div>

          <div className="absolute bottom-8 left-8 right-8 text-slate-900">
            <p className="text-2xl font-extrabold leading-tight">
              Create your account ✨
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Join us and manage everything in one place.
            </p>
          </div>

          {/* premium divider */}
          <div className="pointer-events-none absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          <div className="pointer-events-none absolute top-0 right-[-10px] h-full w-[22px] bg-gradient-to-l from-[#852BAF]/10 via-[#FC3F78]/5 to-transparent blur-xl" />
        </div>

        <div className="relative z-20 w-full bg-white py-8 px-8 md:px-10">
          <div className="pb-4 mb-4 border-b border-gray-100">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Create Account
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Join our warehouse management system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {(error || authError) && (
              <div className="p-3 text-sm text-red-700 border-l-4 border-red-500 rounded-xl bg-red-50">
                {error || (authError as string)}
              </div>
            )}

            {/* ✅ 2 column on md+, 1 column mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" htmlFor="name" labelClass={labelClass}>
                <input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  className={inputBase}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field
                label="Email Address"
                htmlFor="email"
                labelClass={labelClass}
              >
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  className={inputBase}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field
                label="Phone Number"
                htmlFor="phone"
                labelClass={labelClass}
              >
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 234 567 890"
                  className={inputBase}
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Field>

              <Field label="User Role" htmlFor="role" labelClass={labelClass}>
                <select
                  id="role"
                  name="role"
                  className={inputBase + " cursor-pointer"}
                  onChange={handleChange}
                  value={formData.role}
                >
                  <option value="vendor">Vendor</option>
                  <option value="vendor_manager">Vendor Manager</option>
                  <option value="admin">Admin</option>
                  <option value="warehouse_manager">Warehouse Manager</option>
                </select>
              </Field>

              <Field label="Password" htmlFor="password" labelClass={labelClass}>
  <div className="relative">
    <input
      id="password"
      name="password"
      type={showPassword ? "text" : "password"}
      placeholder="••••••••"
      className={inputBase}
      value={formData.password}
      onChange={handleChange}
      required
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</Field>


              <Field
  label="Confirm Password"
  htmlFor="confirmPassword"
  labelClass={labelClass}
>
  <div className="relative">
    <input
      id="confirmPassword"
      name="confirmPassword"
      type={showConfirmPassword ? "text" : "password"}
      placeholder="••••••••"
      className={inputBase}
      value={formData.confirmPassword}
      onChange={handleChange}
      required
    />

    <button
      type="button"
      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
    >
      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</Field>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 text-white font-bold py-3.5 rounded-2xl text-lg
                         bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
                         shadow-lg shadow-[#852BAF]/25 transition-all duration-300 cursor-pointer
                         hover:bg-gradient-to-r hover:from-[#FC3F78] hover:to-[#852BAF]
                         hover:shadow-xl active:scale-95
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Register Now"}
            </button>

            <p className="text-sm text-center text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-[#852BAF] hover:text-[#FC3F78] transition-all hover:underline"
              >
                Login here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
