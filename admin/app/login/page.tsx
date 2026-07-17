"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import useTokenStore, { decodeToken } from "@/lib/tokenStore";

// Login (A1): decode -> role check -> store write happens in exactly that
// synchronous order. The non-ADMIN branch returns before setToken/router
// push are ever reached, so nothing is persisted and no navigation happens.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      // Client precedent: the access token arrives in the Authorization
      // RESPONSE HEADER, not the response body.
      const authHeader: string | undefined =
        res.headers?.authorization ?? res.headers?.Authorization;
      if (!authHeader) {
        setError("Login succeeded but no access token header was returned.");
        return;
      }
      const token = authHeader.split(" ")[1];

      const decoded = decodeToken(token);
      const role = decoded?.user?.role;
      if (role !== "ADMIN") {
        // Refusal path: the store setter is never called, nothing persists.
        setError("This account is not an admin. Access denied.");
        return;
      }

      useTokenStore.getState().setToken(token);
      router.replace("/config");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <h1>Admin sign in</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        {error && (
          <p className="login-page__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
