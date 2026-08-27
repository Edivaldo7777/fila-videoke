"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function login() {
    if (!email || !password) {
      setMessage("Preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      // 1. Tenta fazer o login seguro pelo Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setMessage("E-mail ou senha inválidos.");
        setIsLoading(false);
        return;
      }

      // 2. Se a senha está correta, busca o perfil na tabela customizada 'users'
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim())
        .single();

      if (profileError || !userProfile) {
        setMessage("Perfil de usuário não encontrado.");
        await supabase.auth.signOut(); // Desloga por segurança
        setIsLoading(false);
        return;
      }

      // 3. Validações de Status do seu negócio
      if (userProfile.status === "pending") {
        setMessage("Seu cadastro ainda não foi aprovado pelo administrador.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (userProfile.status === "blocked") {
        setMessage("Seu acesso está bloqueado. Contate o suporte.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // 4. Salva no localStorage para compatibilidade com o resto do sistema
      localStorage.setItem("user", JSON.stringify(userProfile));

      // 5. Redirecionamento
      if (userProfile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      
    } catch (error) {
      console.error(error);
      setMessage("Ocorreu um erro inesperado ao conectar.");
      setIsLoading(false);
    }
  }
  async function forgotPassword() {
  const normalizedEmail =
    email.trim().toLowerCase();

  if (!normalizedEmail) {
    setMessage(
      "Informe seu e-mail para recuperar a senha."
    );
    return;
  }

  const confirmed = confirm(
    `Enviar um link de redefinição de senha para ${normalizedEmail}?`
  );

  if (!confirmed) {
    return;
  }

  setIsLoading(true);
  setMessage("");

  try {
    const redirectTo =
      `${window.location.origin}/auth/update-password`;

    const { error } =
      await supabase.auth
        .resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
        );

    if (error) {
      console.error(
        "Erro ao recuperar senha:",
        error
      );

      setMessage(
        `Não foi possível enviar o link: ${error.message}`
      );
      return;
    }

    setMessage(
      "✅ Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha."
    );
  } catch (error) {
    console.error(
      "Erro inesperado na recuperação:",
      error
    );

    setMessage(
      "Não foi possível solicitar a recuperação de senha."
    );
  } finally {
    setIsLoading(false);
  }
}
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        
        <h1 className="text-3xl font-black mb-6 text-center text-slate-800">
          🔐 Login
        </h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-slate-300 p-3 rounded-lg w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-slate-300 p-3 rounded-lg w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {message && (
  <div
    className={`text-sm font-bold text-center mb-4 rounded-xl border p-3 ${
      message.startsWith("✅")
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-red-50 border-red-200 text-red-600"
    }`}
  >
    {message}
  </div>
)}

        <button
          onClick={login}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full p-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? "Entrando..." : "Entrar"}
        </button>
         <button
          type="button"
          onClick={forgotPassword}
          disabled={isLoading}
          className="w-full mt-4 text-purple-600 hover:text-purple-800 font-bold text-sm transition-colors disabled:opacity-50"
        >
              🔑 Esqueci minha senha
        </button>
        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => router.push("/auth/register")}
            className="text-blue-600 hover:text-blue-800 font-bold transition-colors"
          >
            📝 Criar nova conta
          </button>
        </div>

      </div>
    </main>
  );
}