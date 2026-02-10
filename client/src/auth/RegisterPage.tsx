import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "./useAuth";
import logoImage from "../assets/logo.svg";
import { Eye, EyeOff } from "lucide-react";

type Role = "vendor";

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

      <div className="relative mt-1.5">
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-xl opacity-0 blur-lg transition
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

  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        "vendor",
        formData.phone,
      );
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? "Register failed");
      } else {
        setError("Unexpected error occurred");
      }
    }
  };

  const labelClass = "text-sm font-semibold text-slate-700";
  const inputBase =
    "w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 " +
    "border border-slate-200 shadow-sm outline-none transition-all duration-300 " +
    "focus:border-transparent focus:ring-4 focus:ring-[#852BAF]/15";

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#38bdf8] via-[#a855f7] to-[#ec4899] px-4">
  <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
    {/* LEFT ILLUSTRATION */}
    <div className="relative hidden md:flex items-center justify-center bg-white p-6">
      {/* ✅ same dot-dot background like login (behind image) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(900px_circle_at_85%_30%,rgba(168,85,247,0.10),transparent_55%),radial-gradient(900px_circle_at_50%_110%,rgba(236,72,153,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

      <img
        src={logoImage}
        alt="Register"
        className="relative max-w-sm w-full select-none"
        draggable={false}
      />
      <div className="absolute bottom-8 left-8 right-8 text-slate-900">
  <p className="text-2xl font-extrabold leading-tight">
    Create your account{" "}
  </p>
  <p className="mt-2 text-[16px] font-medium text-gray-600 leading-relaxed">
    Join us and manage everything in one place.
  </p>
</div>

    </div>
    

    {/* FORM */}
    <div className="w-full p-5 md:p-6">
      <h2 className="text-xl font-extrabold text-gray-900 mb-0.5">
        Create Account
      </h2>
      <p className="text-sm text-gray-500 mb-3">
        Join us and manage everything in one place.
      </p>

      {(error || authError) && (
        <div className="mb-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error || (authError as string)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Field label="Full Name" htmlFor="name" labelClass={labelClass}>
            <input
              id="name"
              name="name"
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
              className={inputBase}
              value={formData.phone}
              onChange={handleChange}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="Password"
              htmlFor="password"
              labelClass={labelClass}
            >
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={inputBase}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
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
                  className={inputBase}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 py-3.5 rounded-full text-white font-bold
                     bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
                     shadow-md transition hover:from-[#FC3F78] hover:to-[#852BAF]
                     disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="text-center text-md text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#852BAF] hover:text-[#FC3F78] transition-all hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  </div>
</div>

  );
}
