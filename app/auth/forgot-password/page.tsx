"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function resetPassword() {
    if (!email.trim() || !password.trim()) {
      setMessage("Preencha o e-mail e a nova senha.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const { data, error: selectError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim())
        .single();

      if (selectError || !data) {
        setMessage("E-mail não encontrado.");
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: password,
        })
        .eq("email", email.trim());

      if (updateError) {
        setMessage(updateError.message);
        setIsLoading(false);
        return;
      }

      alert("Senha alterada com sucesso.");
      router.push("/auth/login");
      
    } catch (error: any) {
      console.error(error);
      setMessage("Ocorreu um erro inesperado.");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">

        <h1 className="text-3xl font-black mb-6 text-center text-slate-800">
          🔑 Recuperar Senha
        </h1>

        <input
          type="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-slate-300 p-3 rounded-lg w-full mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-slate-300 p-3 rounded-lg w-full mb-5 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {message && (
          <div className="text-red-500 text-sm font-bold text-center mb-4">
            {message}
          </div>
        )}

        <button
          onClick={resetPassword}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full p-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? "Alterando..." : "Alterar Senha"}
        </button>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/auth/login")}
            className="text-blue-600 hover:text-blue-800 font-bold transition-colors text-sm"
          >
            Voltar ao Login
          </button>
        </div>

      </div>
    </main>
  );
}