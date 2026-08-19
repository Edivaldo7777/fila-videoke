"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function register() {

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      alert(
        "Preencha todos os campos."
      );
      return;
    }

    const { error } =
      await supabase
        .from("users")
        .insert({
          name,
          email,
          password,
          role: "client",
          status: "pending",
          max_rooms: 1,
        });

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Cadastro realizado com sucesso. Aguarde aprovação."
    );

    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">

      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">

        <h1 className="text-3xl font-black mb-6 text-center">
          🎤 Cadastro de Cliente
        </h1>

        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          className="border p-3 rounded w-full mb-3"
        />

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
          onClick={register}
          className="bg-green-600 text-white w-full p-3 rounded"
        >
          Criar Conta
        </button>

      </div>

    </main>
  );
}