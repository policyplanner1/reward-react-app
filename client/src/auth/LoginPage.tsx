import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./useAuth";
import logoImage from "../assets/logo.svg";
// import { User, Lock, Facebook, Twitter, Chrome } from "lucide-react";
import { User, Lock } from "lucide-react";

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-[#38bdf8] via-[#a855f7] to-[#ec4899] font-sans px-4">
      {/* ✅ 2-column card (Left image + Right form) */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
       {/* ✅ LEFT IMAGE PANEL */}
<div className="relative hidden md:block bg-white">
  {/* ✅ soft premium background (white + subtle blobs) */}
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(900px_circle_at_85%_30%,rgba(168,85,247,0.10),transparent_55%),radial-gradient(900px_circle_at_50%_110%,rgba(236,72,153,0.08),transparent_55%)]" />
  <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

  {/* ✅ image */}
  <div className="relative h-full w-full flex items-center justify-center p-10">
    <img
      src={logoImage}
      alt="Login Illustration"
      className="w-full max-w-md drop-shadow-2xl select-none mt-[-4em]"

      draggable={false}
    />
  </div>

  {/* ✅ optional text on image side */}
  <div className="absolute bottom-8 left-8 right-8 text-slate-900">
    <p className="text-2xl font-extrabold leading-tight">Welcome back 👋</p>
    <p className="mt-2 text-sm text-slate-500">
      Sign in and continue to your dashboard.
    </p>
  </div>

  {/* ✅ premium divider line between left & right */}
  <div className="pointer-events-none absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
  {/* ✅ glow on divider for premium look */}
  <div className="pointer-events-none absolute top-0 right-[-10px] h-full w-[22px] bg-gradient-to-l from-[#852BAF]/10 via-[#FC3F78]/5 to-transparent blur-xl" />
</div>

{/* ✅ RIGHT FORM PANEL */}
<div className="w-full bg-white py-10 px-10 relative">
  {/* ✅ very subtle top shine */}
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_0%,rgba(133,43,175,0.05),transparent_45%)]" />

  {/* Header */}
  <h2 className="relative text-4xl font-extrabold text-center text-[#333] mb-10">
    Login
  </h2>

  {(error || authError) && (
    <div className="relative mb-4 text-xs text-center text-red-500 font-medium">
      {error || authError}
    </div>
  )}

  <form onSubmit={handleSubmit} className="relative space-y-8">
    {/* Email/Username Field */}
    <div className="relative border-b-2 border-gray-200 focus-within:border-purple-500 transition-colors">
      <label className="block text-sm text-gray-500 mb-1">Username</label>
      <div className="flex items-center pb-2">
        <User className="w-4 h-4 text-gray-400 mr-3" />
        <input
          name="email"
          type="email"
          required
          className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300"
          placeholder="Type your username"
          value={formData.email}
          onChange={handleChange}
        />
      </div>
    </div>

    {/* Password Field */}
    <div className="relative border-b-2 border-gray-200 focus-within:border-purple-500 transition-colors">
      <label className="block text-sm text-gray-500 mb-1">Password</label>
      <div className="flex items-center pb-2">
        <Lock className="w-4 h-4 text-gray-400 mr-3" />
        <input
          name="password"
          type="password"
          required
          className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300"
          placeholder="Type your password"
          value={formData.password}
          onChange={handleChange}
        />
      </div>
    </div>

    <div className="flex items-center justify-end">
      {/* ✅ Social icons (kept for later use) */}
      {/*
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#3b5998] text-white hover:opacity-80 transition-opacity"
        >
          <Facebook size={16} fill="currentColor" />
        </button>
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1da1f2] text-white hover:opacity-80 transition-opacity"
        >
          <Twitter size={16} fill="currentColor" />
        </button>
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#ea4335] text-white hover:opacity-80 transition-opacity"
        >
          <Chrome size={16} />
        </button>
      </div>
      */}

      <Link
        to="/forgot-password"
        className="text-xs text-gray-400 hover:text-purple-600 transition-colors"
      >
        Forgot password?
      </Link>
    </div>

    {/* Login Button */}
    <button
      type="submit"
      disabled={loading}
      className="w-full mt-6 text-white font-bold py-3.5 rounded-2xl text-lg
               bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
               shadow-lg shadow-[#852BAF]/25 transition-all duration-300 cursor-pointer
               hover:bg-gradient-to-r hover:from-[#FC3F78] hover:to-[#852BAF]
               hover:shadow-xl active:scale-95
               disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Logging in..." : "Login"}
    </button>
  </form>

  <div className="relative mt-10 text-center">
    <p className="mt-10 text-sm text-center text-gray-500">
      Don&apos;t have an account?{" "}
      <Link
        to="/register"
        className="font-semibold text-purple-600 hover:text-[#FC3F78] transition-all hover:underline"
      >
        Create Account
      </Link>
    </p>
  </div>
</div>

      </div>
    </div>
  );
}
