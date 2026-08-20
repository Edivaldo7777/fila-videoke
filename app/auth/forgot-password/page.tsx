"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function resetPassword() {

    const { data } =
      await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

    if (!data) {
      alert(
        "E-mail não encontrado."
      );
      return;
    }

    const { error } =
      await supabase
        .from("users")
        .update({
          password,
        })
        .eq(
          "email",
          email
        );

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Senha alterada com sucesso."
    );

    window.location.href =
      "/auth/login";
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">

      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">

        <h1 className="text-3xl font-black mb-6 text-center">
          🔑 Recuperar Senha
        </h1>

        <input
          type="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="border p-3 rounded w-full mb-3"
        />

        <input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          className="border p-3 rounded w-full mb-5"
        />

        <button
          onClick={resetPassword}
          className="bg-purple-600 text-white w-full p-3 rounded"
        >
          Alterar Senha
        </button>

        <div className="text-center mt-4">

          <button
            onClick={() =>
              window.location.href =
                "/auth/login"
            }
            className="text-blue-600 font-bold"
          >
            Voltar ao Login
          </button>

        </div>

      </div>

    </main>
  );
}