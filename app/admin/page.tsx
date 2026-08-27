"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);

  const approvedUsers = users.filter(
    (user) => user.status === "approved"
  ).length;

  const pendingUsers = users.filter(
    (user) => user.status === "pending"
  ).length;

  const blockedUsers = users.filter(
    (user) => user.status === "blocked"
  ).length;

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (!usersData) {
      setUsers([]);
      return;
    }

    const usersWithRooms = await Promise.all(
      usersData.map(async (user) => {
        const { count } = await supabase
          .from("rooms")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("owner_id", user.id);

        return {
          ...user,
          rooms_used: count || 0,
        };
      })
    );

    setUsers(usersWithRooms);
  }

  async function approveUser(id: string) {
    await supabase
      .from("users")
      .update({
        status: "approved",
      })
      .eq("id", id);

    loadUsers();
  }

  async function blockUser(id: string) {
    await supabase
      .from("users")
      .update({
        status: "blocked",
      })
      .eq("id", id);

    loadUsers();
  }

  async function updatePlan(id: string, plan: string) {
    let maxRooms = 1;

    if (plan === "Pro") {
      maxRooms = 3;
    }

    if (plan === "Premium") {
      maxRooms = 10;
    }

    await supabase
      .from("users")
      .update({
        plan_name: plan,
        max_rooms: maxRooms,
      })
      .eq("id", id);

    loadUsers();
  }

  async function resetPassword(id: string) {
    const newPassword = prompt("Digite a nova senha:");

    if (!newPassword) {
      return;
    }

    await supabase
      .from("users")
      .update({
        password: newPassword,
      })
      .eq("id", id);

    alert("Senha alterada com sucesso.");
    loadUsers();
  }

  async function deleteUser(user: any) {
    const confirmed = confirm(`Excluir ${user.name}?`);

    if (!confirmed) return;

    // Como configuramos o ON DELETE CASCADE nas chaves estrangeiras do banco,
    // deletar o usuário remove automaticamente todas as suas salas e dados vinculados.
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);

    if (error) {
      alert("Erro ao excluir cliente: " + error.message);
      return;
    }

    alert("Cliente removido com sucesso.");
    loadUsers();
  }

  return (
  <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-black text-white">

    <div className="max-w-7xl mx-auto p-4 md:p-8">

      {/* Cabeçalho */}
      <header className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>

            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-bold mb-3">

              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />

              ADMINISTRAÇÃO DO SISTEMA

            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">

              👑 Painel Master

            </h1>

            <p className="text-slate-400 mt-2">

              Gerencie clientes, acessos, planos e limites de salas.

            </p>

          </div>

          <div className="flex flex-col sm:flex-row gap-3">

            <button
              onClick={() => {
                window.location.href =
                  "/dashboard";
              }}
              className="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-200 hover:text-white px-5 py-3 rounded-xl font-bold transition-all"
            >

              📊 Ir para Dashboard

            </button>

            <button
              onClick={() => {
                localStorage.removeItem(
                  "user"
                );

                window.location.href =
                  "/auth/login";
              }}
              className="bg-red-500/10 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white px-5 py-3 rounded-xl font-bold transition-all"
            >

              🚪 Sair

            </button>

          </div>

        </div>

      </header>

      {/* Indicadores */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        <div className="bg-gradient-to-br from-blue-600/20 to-blue-950/30 border border-blue-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs uppercase tracking-widest text-blue-300 font-bold">

                Clientes

              </p>

              <p className="text-4xl font-black mt-2">

                {users.length}

              </p>

            </div>

            <div className="text-4xl">

              👥

            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3">

            Cadastros encontrados

          </p>

        </div>

        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold">

                Aprovados

              </p>

              <p className="text-4xl font-black mt-2 text-emerald-300">

                {approvedUsers}

              </p>

            </div>

            <div className="text-4xl">

              ✅

            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3">

            Contas com acesso liberado

          </p>

        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-950/30 border border-yellow-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs uppercase tracking-widest text-yellow-300 font-bold">

                Pendentes

              </p>

              <p className="text-4xl font-black mt-2 text-yellow-300">

                {pendingUsers}

              </p>

            </div>

            <div className="text-4xl">

              ⏳

            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3">

            Aguardando aprovação

          </p>

        </div>

        <div className="bg-gradient-to-br from-red-600/20 to-red-950/30 border border-red-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs uppercase tracking-widest text-red-300 font-bold">

                Bloqueados

              </p>

              <p className="text-4xl font-black mt-2 text-red-300">

                {blockedUsers}

              </p>

            </div>

            <div className="text-4xl">

              ⛔

            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3">

            Contas sem acesso

          </p>

        </div>

      </section>

      {/* Lista de clientes */}
      <section className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-5 md:p-8 shadow-2xl">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">

          <div>

            <h2 className="text-2xl md:text-3xl font-black">

              🧑‍💼 Gestão de Clientes

            </h2>

            <p className="text-slate-400 mt-1">

              Controle o acesso, o plano e o limite de salas de cada conta.

            </p>

          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-full px-5 py-2 font-black">

            {users.length}{" "}

            {users.length === 1
              ? "cliente"
              : "clientes"}

          </div>

        </div>

        {users.length === 0 ? (

          <div className="border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center">

            <div className="text-6xl mb-4">

              👤

            </div>

            <h3 className="text-xl font-black">

              Nenhum cliente encontrado

            </h3>

            <p className="text-slate-400 mt-2">

              Os novos cadastros aparecerão nesta área.

            </p>

          </div>

        ) : (

          <div className="grid xl:grid-cols-2 gap-5">

            {users.map((user) => {

              const statusLabel =
                user.status === "approved"
                  ? "APROVADO"
                  : user.status === "pending"
                    ? "PENDENTE"
                    : user.status === "blocked"
                      ? "BLOQUEADO"
                      : user.status ||
                        "NÃO INFORMADO";

              const statusClass =
                user.status === "approved"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : user.status === "pending"
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300";

              const planName =
                user.plan_name ||
                "Básico";

              const planClass =
                planName === "Premium"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                  : planName === "Pro"
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";

              const maxRooms =
                Number(
                  user.max_rooms ||
                    1
                );

              const roomsUsed =
                Number(
                  user.rooms_used ||
                    0
                );

              const roomPercentage =
                maxRooms > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (
                          roomsUsed /
                          maxRooms
                        ) * 100
                      )
                    )
                  : 0;

              return (

                <article
                  key={user.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl transition-all"
                >

                  {/* Identificação */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                    <div className="flex items-start gap-4 min-w-0">

                      <div className="w-14 h-14 bg-purple-500/15 border border-purple-500/30 rounded-2xl flex items-center justify-center text-3xl shrink-0">

                        {user.role === "admin"
                          ? "👑"
                          : "👤"}

                      </div>

                      <div className="min-w-0">

                        <h3 className="text-xl md:text-2xl font-black break-words">

                          {user.name ||
                            "Cliente sem nome"}

                        </h3>

                        <p className="text-slate-400 text-sm mt-1 break-all">

                          {user.email}

                        </p>

                        <p className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-bold">

                          {user.role === "admin"
                            ? "Administrador"
                            : "Cliente"}

                        </p>

                      </div>

                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">

                      <span
                        className={`border px-3 py-1 rounded-full text-xs font-black ${statusClass}`}
                      >

                        {statusLabel}

                      </span>

                      <span
                        className={`border px-3 py-1 rounded-full text-xs font-black ${planClass}`}
                      >

                        {planName}

                      </span>

                    </div>

                  </div>

                  {/* Uso de salas */}
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-4 mt-5">

                    <div className="flex items-center justify-between gap-3 mb-3">

                      <div>

                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">

                          Utilização de salas

                        </p>

                        <p className="font-black mt-1">

                          {roomsUsed} de{" "}
                          {maxRooms} utilizadas

                        </p>

                      </div>

                      <div className="text-2xl font-black text-blue-300">

                        {roomPercentage}%

                      </div>

                    </div>

                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">

                      <div
                        className={`h-full rounded-full transition-all ${
                          roomPercentage >= 100
                            ? "bg-red-500"
                            : roomPercentage >= 70
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                        }`}
                        style={{
                          width:
                            `${roomPercentage}%`,
                        }}
                      />

                    </div>

                  </div>

                  {/* Status */}
                  <div className="grid grid-cols-2 gap-3 mt-4">

                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">

                      <p className="text-xs text-slate-500 uppercase font-bold">

                        Plano atual

                      </p>

                      <p className="font-black mt-1">

                        {planName}

                      </p>

                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">

                      <p className="text-xs text-slate-500 uppercase font-bold">

                        Limite de salas

                      </p>

                      <p className="font-black mt-1">

                        {maxRooms}

                      </p>

                    </div>

                  </div>

                  {/* Aprovação e bloqueio */}
                  <div className="mt-5">

                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">

                      Controle de acesso

                    </p>

                    <div className="grid grid-cols-2 gap-2">

                      <button
                        onClick={() =>
                          approveUser(
                            user.id
                          )
                        }
                        disabled={
                          user.status ===
                          "approved"
                        }
                        className={`px-4 py-3 rounded-xl text-sm font-black transition-all ${
                          user.status ===
                          "approved"
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/50 cursor-not-allowed"
                            : "bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-200 hover:text-white"
                        }`}
                      >

                        ✅{" "}

                        {user.status ===
                        "approved"
                          ? "Aprovado"
                          : "Aprovar"}

                      </button>

                      <button
                        onClick={() =>
                          blockUser(
                            user.id
                          )
                        }
                        disabled={
                          user.status ===
                          "blocked"
                        }
                        className={`px-4 py-3 rounded-xl text-sm font-black transition-all ${
                          user.status ===
                          "blocked"
                            ? "bg-red-500/10 border border-red-500/20 text-red-500/50 cursor-not-allowed"
                            : "bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-200 hover:text-white"
                        }`}
                      >

                        ⛔{" "}

                        {user.status ===
                        "blocked"
                          ? "Bloqueado"
                          : "Bloquear"}

                      </button>

                    </div>

                  </div>

                  {/* Planos */}
                  <div className="mt-5">

                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">

                      Alterar plano

                    </p>

                    <div className="grid grid-cols-3 gap-2">

                      <button
                        onClick={() =>
                          updatePlan(
                            user.id,
                            "Básico"
                          )
                        }
                        className={`px-3 py-3 rounded-xl text-sm font-black transition-all ${
                          planName ===
                          "Básico"
                            ? "bg-emerald-500 text-black ring-2 ring-emerald-300/30"
                            : "bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500"
                        }`}
                      >

                        🟢 Básico

                      </button>

                      <button
                        onClick={() =>
                          updatePlan(
                            user.id,
                            "Pro"
                          )
                        }
                        className={`px-3 py-3 rounded-xl text-sm font-black transition-all ${
                          planName === "Pro"
                            ? "bg-yellow-500 text-black ring-2 ring-yellow-300/30"
                            : "bg-slate-800 hover:bg-yellow-600 border border-slate-700 hover:border-yellow-500"
                        }`}
                      >

                        🟡 Pro

                      </button>

                      <button
                        onClick={() =>
                          updatePlan(
                            user.id,
                            "Premium"
                          )
                        }
                        className={`px-3 py-3 rounded-xl text-sm font-black transition-all ${
                          planName ===
                          "Premium"
                            ? "bg-blue-500 text-white ring-2 ring-blue-300/30"
                            : "bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500"
                        }`}
                      >

                        🔵 Premium

                      </button>

                    </div>

                  </div>

                  {/* Ações administrativas */}
                  <div className="grid sm:grid-cols-2 gap-2 mt-5 pt-5 border-t border-slate-800">

                    <button
                      onClick={() =>
                        resetPassword(
                          user.id
                        )
                      }
                      className="bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-200 hover:text-white px-4 py-3 rounded-xl text-sm font-black transition-all"
                    >

                      🔑 Resetar Senha

                    </button>

                    <button
                      onClick={() =>
                        deleteUser(
                          user
                        )
                      }
                      className="bg-red-950/50 hover:bg-red-800 border border-red-800/50 text-red-300 hover:text-white px-4 py-3 rounded-xl text-sm font-black transition-all"
                    >

                      🗑 Excluir Cliente

                    </button>

                  </div>

                </article>

              );

            })}

          </div>

        )}

      </section>

      <footer className="text-center text-xs text-slate-500 py-7">

        Fila Videokê • Administração e gerenciamento de clientes

      </footer>

    </div>

  </main>
);
}