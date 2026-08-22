"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function register() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setMessage("Preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      // 1. Cria o usuário no sistema seguro de Autenticação do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        setMessage(authError.message);
        setIsLoading(false);
        return;
      }

      // 2. Insere os dados do perfil na sua tabela customizada para o Painel Master gerenciar
      const { error: insertError } = await supabase.from("users").insert({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(), // Mantido temporariamente para compatibilidade
        role: "client",
        status: "pending",
        max_rooms: 1,
      });

      if (insertError) {
        // Se der erro ao inserir na tabela, desfaz o cadastro de auth por segurança
        console.error("Erro ao inserir perfil:", insertError);
        setMessage("Ocorreu um erro ao salvar seu perfil. Tente novamente.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setName("");
      setEmail("");
      setPassword("");

    } catch (error) {
      console.error(error);
      setMessage("Ocorreu um erro inesperado.");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        
        <h1 className="text-3xl font-black mb-6 text-center text-slate-800">
          🎤 Cadastro de Cliente
        </h1>

        {isSuccess ? (
          <div className="text-center">
            <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-6">
              <p className="font-bold text-lg mb-2">Cadastro realizado! 🎉</p>
              <p className="text-sm">
                Sua conta foi criada com sucesso e enviada para aprovação. 
                Aguarde a liberação do administrador para acessar o sistema.
              </p>
            </div>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full p-3 rounded-lg transition-colors"
            >
              Ir para o Login
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Nome da sua empresa ou bar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-slate-300 p-3 rounded-lg w-full mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-slate-300 p-3 rounded-lg w-full mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <input
              type="password"
              placeholder="Senha (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-slate-300 p-3 rounded-lg w-full mb-5 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {message && (
              <div className="text-red-500 text-sm font-bold text-center mb-4">
                {message}
              </div>
            )}

            <button
              onClick={register}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold w-full p-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? "Criando conta..." : "Criar Conta"}
            </button>

            <div className="text-center mt-6">
              <button
                onClick={() => router.push("/auth/login")}
                className="text-slate-500 hover:text-slate-700 font-bold transition-colors text-sm"
              >
                Já tem uma conta? Faça login
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  );
}