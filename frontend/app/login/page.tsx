"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BACKEND_HTTP =
  process.env.NEXT_PUBLIC_BACKEND_HTTP ||
  "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (
      searchParams.get("registered") ===
      "true"
    ) {
      setRegistered(true);
    }
  }, [searchParams]);

async function handleLogin(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setError("");
  setRegistered(false);

  if (!email.trim() || !password) {
    setError(
      "Please enter your email and password."
    );
    return;
  }

  try {
    setLoading(true);

    const response = await fetch(
      `${BACKEND_HTTP}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
          "Invalid email or password."
      );
    }

    if (!data.access_token) {
      throw new Error(
        "Login succeeded but no authentication token was received."
      );
    }

    // Store JWT using the key expected by the dashboard
    localStorage.setItem(
      "s33_access_token",
      data.access_token
    );

    // Keep the user information
    localStorage.setItem(
      "s33_user",
      JSON.stringify(data.user)
    );

    // Used by the authenticated dashboard
    localStorage.setItem(
      "s33-authenticated",
      "true"
    );

    router.push("/dashboard");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to log in."
    );
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="min-h-screen bg-[#F5F8F7] text-slate-950">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 opacity-60">

        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(#DDE7E3 1px, transparent 1px),
              linear-gradient(90deg, #DDE7E3 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_30%)]" />

      </div>

      {/* NAV */}

      <nav className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">

        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
        >

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
            S33
          </div>

          <div className="text-left">

            <div className="text-sm font-black">
              Evacuation Digital Twin
            </div>

            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Safety Intelligence
            </div>

          </div>

        </button>

        <button
          onClick={() => router.push("/signup")}
          className="text-sm font-bold text-slate-500 transition hover:text-slate-950"
        >
          New to S33?{" "}
          <span className="text-emerald-600">
            Create account
          </span>
        </button>

      </nav>

      {/* LOGIN */}

      <section className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-6 py-10">

        <div className="w-full max-w-md">

          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">

            {/* HEADER */}

            <div className="mb-8">

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                Welcome back

              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight">
                Sign in to S33
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Continue managing your buildings,
                evacuation simulations and safety
                configurations.
              </p>

            </div>

            {/* SUCCESS */}

            {registered && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Account created successfully.
                Please log in.
              </div>
            )}

            {/* ERROR */}

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* FORM */}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* EMAIL */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />

              </div>

              {/* PASSWORD */}

              <div>

                <div className="flex items-center justify-between">

                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Password
                  </label>

                </div>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading
                  ? "Signing in..."
                  : "Sign in →"}

              </button>

            </form>

            {/* SIGNUP */}

            <div className="mt-7 border-t border-slate-100 pt-6 text-center">

              <p className="text-xs text-slate-400">
                Don't have an account?
              </p>

              <button
                onClick={() =>
                  router.push("/signup")
                }
                className="mt-2 text-sm font-black text-emerald-600 hover:text-emerald-700"
              >
                Create your S33 account
              </button>

            </div>

          </div>

          <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
            S33 provides evacuation recommendations
            for safety planning and simulation.
          </p>

        </div>

      </section>

    </main>
  );
}