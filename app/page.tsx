"use client";

import { useState } from "react";

export default function Dashboard() {
  const [roomCode, setRoomCode] = useState("");

  function createRoom() {
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    setRoomCode(code);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-4xl font-bold mb-6">
        Painel do Operador
      </h1>

      <button
        onClick={createRoom}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Criar Sala
      </button>

      {roomCode && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">
            Sala Criada
          </h2>

          <p>
            Código: <strong>{roomCode}</strong>
          </p>

          <p>
            Link:
            {" "}
            http://localhost:3000/room/{roomCode}
          </p>
        </div>
      )}
    </main>
  );
}