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
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black">👑 Painel Master</h1>
        
        {/* Nova div envolvendo os dois botões no topo */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
          >
            📊 Ir para Dashboard
          </button>
          
          <button
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/auth/login";
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
          >
            🚪 Sair
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-sm text-slate-500">Clientes</div>
          <div className="text-3xl font-black">{users.length}</div>
        </div>

        <div className="bg-green-100 p-4 rounded-xl shadow">
          <div className="text-sm">✅ Aprovados</div>
          <div className="text-3xl font-black">{approvedUsers}</div>
        </div>

        <div className="bg-yellow-100 p-4 rounded-xl shadow">
          <div className="text-sm">⏳ Pendentes</div>
          <div className="text-3xl font-black">{pendingUsers}</div>
        </div>

        <div className="bg-red-100 p-4 rounded-xl shadow">
          <div className="text-sm">⛔ Bloqueados</div>
          <div className="text-3xl font-black">{blockedUsers}</div>
        </div>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white p-6 rounded-xl shadow">
            <div className="font-black text-xl mb-1">{user.name}</div>
            
            <div className="text-slate-600 text-sm mb-4 space-y-1">
              <div>Email: {user.email}</div>
              <div>Role: {user.role}</div>
              <div>Status: {user.status}</div>
              <div>Plano: {user.plan_name || "Básico"}</div>
              <div>Limite de salas: {user.max_rooms}</div>
              <div>
                Salas utilizadas: {user.rooms_used || 0} / {user.max_rooms}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => approveUser(user.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold"
              >
                ✅ Aprovar
              </button>

              <button
                onClick={() => blockUser(user.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-bold"
              >
                ⛔ Bloquear
              </button>

              <button
                onClick={() => updatePlan(user.id, "Básico")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold"
              >
                🟢 Básico
              </button>

              <button
                onClick={() => updatePlan(user.id, "Pro")}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-bold"
              >
                🟡 Pro
              </button>

              <button
                onClick={() => updatePlan(user.id, "Premium")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold"
              >
                🔵 Premium
              </button>

              <button
                onClick={() => resetPassword(user.id)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-bold"
              >
                🔑 Resetar Senha
              </button>

              <button
                onClick={() => deleteUser(user)}
                className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded text-sm font-bold"
              >
                🗑 Excluir Cliente
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}