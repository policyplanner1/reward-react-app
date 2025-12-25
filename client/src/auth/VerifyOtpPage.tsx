import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "./useAuth";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const { verifyOtp, resendOtp, loading, error } = useAuth();

  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("otp_email");

    if (!storedEmail) {
      navigate("/register", { replace: true });
    } else {
      setEmail(storedEmail);
    }
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError("");

    if (otp.length !== 6) {
      setLocalError("Enter valid 6-digit OTP");
      return;
    }

    try {
      await verifyOtp(email!, otp);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setLocalError(err.response?.data?.message ?? err.message ?? "OTP failed");
      } else if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError("OTP failed");
      }
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    try {
      await resendOtp(email);
      setCooldown(30);
    } catch (err: unknown) {
      setLocalError("Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-600">
      <div className="bg-white p-8 rounded-xl w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-4">Verify OTP</h2>

        {(localError || error) && (
          <p className="text-red-600 text-sm mb-3">
            {localError || error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, ""))
            }
            className="w-full text-center px-4 py-3 border rounded-lg mb-4 tracking-widest"
            placeholder="Enter OTP"
          />

          <button
            disabled={loading}
            className="w-full py-3 bg-purple-600 text-white rounded-lg"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-purple-600"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}
