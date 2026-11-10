import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password);
      navigate("/");
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a14] px-4">
      <div className="w-full max-w-md rounded-3xl bg-[#1a0d1a] p-8 shadow-2xl border border-[#E63E6D]/20">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E63E6D] to-[#FF5C87] shadow-lg shadow-[#E63E6D]/30 text-white text-3xl font-black">
            R
          </div>
          <h1 className="text-3xl font-bold text-white">Rubee</h1>
          <p className="mt-2 text-[#a08096]">Create your account</p>
        </div>

        <div className="space-y-5">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-[#2d1525] px-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#E63E6D] border border-[#E63E6D]/10"
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-[#2d1525] px-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#E63E6D] border border-[#E63E6D]/10"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-[#2d1525] px-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#E63E6D] border border-[#E63E6D]/10"
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#E63E6D] to-[#FF5C87] py-4 font-semibold text-white transition hover:opacity-90 shadow-lg shadow-[#E63E6D]/30 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </div>

        <p className="mt-6 text-center text-[#a08096]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-[#E63E6D] hover:text-[#FF5C87]"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;