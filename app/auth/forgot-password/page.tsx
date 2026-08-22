"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleResetPassword() {
    if (!email) {
      setMessage("Por favor, informe seu e-mail.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      // Usa o serviço nativo e seguro do Supabase para disparar o e-mail
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // Redireciona o usuário para a página de criar nova senha após clicar no link do e-mail
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        setMessage("Não foi possível enviar o e-mail. Verifique se o endereço está correto.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      
    } catch (error) {
      setMessage("Ocorreu um erro inesperado de conexão.");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        
        <h1 className="text-3xl font-black mb-6 text-center text-slate-800">
          🔑 Recuperar Senha
        </h1>

        {isSuccess ? (
          <div className="text-center">
            <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-6">
              <p className="font-bold text-lg mb-2">E-mail enviado! 📨</p>
              <p className="text-sm">
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Verifique sua caixa de entrada (e a pasta de spam).
              </p>
            </div>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold w-full p-3 rounded-lg transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        ) : (
          <>
            <p className="text-slate-600 text-sm mb-6 text-center">
              Digite o e-mail cadastrado na sua conta. Nós enviaremos um link seguro para você criar uma nova senha.
            </p>

            <input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-slate-300 p-3 rounded-lg w-full mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {message && (
              <div className="text-red-500 text-sm font-bold text-center mb-4">
                {message}
              </div>
            )}

            <button
              onClick={handleResetPassword}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full p-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? "Enviando e-mail..." : "Receber link por e-mail"}
            </button>

            <div className="text-center mt-6">
              <button
                onClick={() => router.push("/auth/login")}
                className="text-blue-600 hover:text-blue-800 font-bold transition-colors"
              >
                Lembrei minha senha
              </button>
            </div>
          </>
        )}
        
      </div>
    </main>
  );
}