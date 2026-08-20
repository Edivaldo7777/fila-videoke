"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function login() {

    const { data } =
      await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

    if (!data) {
      alert(
        "Usuário ou senha inválidos."
      );
      return;
    }

    if (
      data.status === "pending"
    ) {
      alert(
        "Seu cadastro ainda não foi aprovado."
      );
      return;
    }

    if (
      data.status === "blocked"
    ) {
      alert(
        "Seu acesso está bloqueado."
      );
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify(data)
    );

    if (
      data.role === "admin"
    ) {
      window.location.href =
        "/admin";
      return;
    }

    window.location.href =
      "/dashboard";
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">

      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">

        <h1 className="text-3xl font-black mb-6 text-center">
          🔐 Login
        </h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="border p-3 rounded w-full mb-3"
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          className="border p-3 rounded w-full mb-5"
        />

        <button
          onClick={login}
          className="bg-blue-600 text-white w-full p-3 rounded"
        >
          Entrar
        </button>

        <div className="mt-6 space-y-3 text-center">

          <button
            onClick={() =>
              window.location.href =
                "/auth/register"
            }
            className="text-blue-600 font-bold"
          >
            📝 Criar nova conta
          </button>

          <br />

          <button
            onClick={() =>
              window.location.href =
                "/auth/forgot-password"
            }
            className="text-purple-600 font-bold"
          >
            🔑 Esqueci minha senha
          </button>

        </div>

      </div>

    </main>
  );
}