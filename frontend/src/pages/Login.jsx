import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await login(formData.email, formData.password);
      navigate("/");
    } catch (error) {
      alert(
        error.response?.data?.message || "Login failed"
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a14] px-4">
      <div className="w-full max-w-md rounded-3xl bg-[#1a0d1a] p-8 shadow-2xl border border-[#E63E6D]/20">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E63E6D] to-[#FF5C87] shadow-lg shadow-[#E63E6D]/30 text-white text-3xl font-black">
            R
          </div>
          <h1 className="text-3xl font-bold text-white">
            Rubee
          </h1>
          <p className="mt-2 text-[#a08096]">
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="off"
            className="w-full rounded-xl bg-[#2d1525] px-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#E63E6D] border border-[#E63E6D]/10"
          />

          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            className="w-full rounded-xl bg-[#2d1525] px-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#E63E6D] border border-[#E63E6D]/10"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#E63E6D] to-[#FF5C87] py-4 font-semibold text-white transition hover:opacity-90 shadow-lg shadow-[#E63E6D]/30"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-[#a08096]">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-[#E63E6D] hover:text-[#FF5C87]"
          >
            Create New Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;