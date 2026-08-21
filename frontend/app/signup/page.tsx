"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND_HTTP =
  process.env.NEXT_PUBLIC_BACKEND_HTTP ||
  "http://127.0.0.1:8000";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${BACKEND_HTTP}/api/v1/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to create your account."
        );
      }

      router.push("/login?registered=true");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F8F7] text-slate-950">

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

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_30%)]" />
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
          onClick={() => router.push("/login")}
          className="text-sm font-bold text-slate-500 transition hover:text-slate-950"
        >
          Already have an account?{" "}
          <span className="text-emerald-600">
            Log in
          </span>
        </button>

      </nav>

      {/* FORM */}

      <section className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-6 py-10">

        <div className="w-full max-w-md">

          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">

            <div className="mb-8">

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Create account
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight">
                Start your S33 workspace
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Save your buildings, evacuation
                configurations and simulation history.
              </p>

            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSignup}
              className="space-y-5"
            >

              {/* NAME */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Full name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter your name"
                  autoComplete="name"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />

              </div>

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
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />

              </div>

              {/* PASSWORD */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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
                  ? "Creating account..."
                  : "Create account →"}
              </button>

            </form>

            <div className="mt-7 border-t border-slate-100 pt-6 text-center">

              <p className="text-xs text-slate-400">
                Already registered?
              </p>

              <button
                onClick={() => router.push("/login")}
                className="mt-2 text-sm font-black text-emerald-600 hover:text-emerald-700"
              >
                Log in to S33
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