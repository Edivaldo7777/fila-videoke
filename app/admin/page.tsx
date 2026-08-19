"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

export default function AdminPage() {

  const [users, setUsers] =
    useState<any[]>([]);
  
  const approvedUsers =
  users.filter(
    (user) =>
      user.status === "approved"
  ).length;

const pendingUsers =
  users.filter(
    (user) =>
      user.status === "pending"
  ).length;

const blockedUsers =
  users.filter(
    (user) =>
      user.status === "blocked"
  ).length;

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {

    const { data } =
      await supabase
        .from("users")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    setUsers(data || []);
  }

  async function approveUser(
    id: string
  ) {
    await supabase
      .from("users")
      .update({
        status: "approved",
      })
      .eq("id", id);

    loadUsers();
  }

  async function blockUser(
    id: string
  ) {
    await supabase
      .from("users")
      .update({
        status: "blocked",
      })
      .eq("id", id);

    loadUsers();
  }

  async function updateRooms(
    id: string,
    maxRooms: number
  ) {

    await supabase
      .from("users")
      .update({
        max_rooms: maxRooms,
      })
      .eq("id", id);

    loadUsers();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">

      <h1 className="text-4xl font-black mb-8">
  👑 Painel Master
</h1>

<div className="grid md:grid-cols-4 gap-4 mb-8">

  <div className="bg-white p-4 rounded-xl shadow">
    <div className="text-sm text-slate-500">
      Clientes
    </div>
    <div className="text-3xl font-black">
      {users.length}
    </div>
  </div>

  <div className="bg-green-100 p-4 rounded-xl shadow">
    <div className="text-sm">
      ✅ Aprovados
    </div>
    <div className="text-3xl font-black">
      {approvedUsers}
    </div>
  </div>

  <div className="bg-yellow-100 p-4 rounded-xl shadow">
    <div className="text-sm">
      ⏳ Pendentes
    </div>
    <div className="text-3xl font-black">
      {pendingUsers}
    </div>
  </div>

  <div className="bg-red-100 p-4 rounded-xl shadow">
    <div className="text-sm">
      ⛔ Bloqueados
    </div>
    <div className="text-3xl font-black">
      {blockedUsers}
    </div>
  </div>

</div>

      <div className="space-y-4">

        {users.map((user) => (

          <div
            key={user.id}
            className="bg-white p-6 rounded-xl shadow"
          >

            <div className="font-black text-xl">
              {user.name}
            </div>

            <div>
              {user.email}
            </div>

            <div className="mt-2">
  Email: {user.email}
</div>

<div>
  Role: {user.role}
</div>

<div>
  Status: {user.status}
</div>

<div>
  Plano: {user.plan_name || "Básico"}
</div>

<div>
  Limite de salas: {user.max_rooms}
</div>

            <div className="flex flex-wrap gap-2 mt-4">

              <button
                onClick={() =>
                  approveUser(user.id)
                }
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                ✅ Aprovar
              </button>

              <button
                onClick={() =>
                  blockUser(user.id)
                }
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                ⛔ Bloquear
              </button>

              <button
                onClick={() => {

                  const value =
                    prompt(
                      "Quantidade de salas:",
                      String(
                        user.max_rooms
                      )
                    );

                  if (!value)
                    return;

                  updateRooms(
                    user.id,
                    Number(value)
                  );

                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                🏢 Definir Salas
              </button>

            </div>

          </div>

        ))}

      </div>

    </main>
  );
}