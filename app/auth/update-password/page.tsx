"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from
  "../../lib/supabase";

export default function UpdatePasswordPage() {

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [recoveryReady, setRecoveryReady] =
    useState(false);

  useEffect(() => {

    async function checkSession() {

      const {
        data: sessionData,
      } = await supabase.auth
        .getSession();

      if (sessionData.session) {
        setRecoveryReady(true);
      }
    }

    checkSession();

    const {
      data: authListener,
    } = supabase.auth
      .onAuthStateChange(
        (event) => {

          if (
            event ===
            "PASSWORD_RECOVERY"
          ) {
            setRecoveryReady(true);
          }

          if (
            event ===
            "SIGNED_IN"
          ) {
            setRecoveryReady(true);
          }
        }
      );

    return () => {
      authListener.subscription
        .unsubscribe();
    };

  }, []);

  async function updatePassword() {

    setMessage("");

    if (!recoveryReady) {
      setMessage(
        "O link de recuperação não é válido ou expirou. Solicite um novo link."
      );
      return;
    }

    if (
      password.length < 8
    ) {
      setMessage(
        "A nova senha deve possuir pelo menos 8 caracteres."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "As senhas não conferem."
      );
      return;
    }

    setIsLoading(true);

    try {

      const { error } =
        await supabase.auth
          .updateUser({
            password,
          });

      if (error) {
        console.error(
          "Erro ao alterar senha:",
          error
        );

        setMessage(
          error.message
        );
        return;
      }

      setMessage(
        "✅ Senha alterada com sucesso. Você será direcionado para o login."
      );

      setPassword("");
      setConfirmPassword("");

      await supabase.auth
        .signOut();

      window.setTimeout(
        () => {
          window.location.href =
            "/auth/login";
        },
        2000
      );

    } catch (error) {

      console.error(
        "Erro inesperado:",
        error
      );

      setMessage(
        "Ocorreu um erro inesperado ao alterar a senha."
      );

    } finally {

      setIsLoading(false);

    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-black text-white flex items-center justify-center p-5">

      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-7 md:p-9 shadow-2xl">

        <div className="text-center mb-7">

          <div className="w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5">
            🔐
          </div>

          <h1 className="text-3xl font-black">
            Criar Nova Senha
          </h1>

          <p className="text-slate-400 mt-2">
            Digite e confirme sua nova senha de acesso.
          </p>

        </div>

        {!recoveryReady && (

          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-xl p-4 mb-5 text-sm">

            ⏳ Validando o link de recuperação...

          </div>

        )}

        <label className="block text-sm font-bold text-slate-300 mb-2">

          Nova senha

        </label>

        <input
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          placeholder="Mínimo de 8 caracteres"
          autoComplete="new-password"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
        />

        <label className="block text-sm font-bold text-slate-300 mb-2">

          Confirmar nova senha

        </label>

        <input
          type="password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          placeholder="Digite novamente"
          autoComplete="new-password"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
        />

        <button
          onClick={updatePassword}
          disabled={
            isLoading ||
            !recoveryReady
          }
          className={`w-full px-5 py-4 rounded-xl font-black transition-all ${
            isLoading ||
            !recoveryReady
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-500 text-white"
          }`}
        >

          {isLoading
            ? "⏳ Alterando..."
            : "🔑 Alterar Senha"}

        </button>

        {message && (

          <div className="mt-5 bg-slate-900 border border-slate-700 rounded-xl p-4 text-center font-bold">

            {message}

          </div>

        )}

      </div>

    </main>
  );
}