"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "../lib/supabase";

type Room = {
  room_code: string;
  room_name: string;
  status?: string;
};

export default function Dashboard() {
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  let query = supabase
    .from("rooms")
    .select("*");

  if (
    user.role &&
    user.role !== "admin"
  ) {
    query = query.eq(
      "owner_id",
      user.id
    );
  }

  const { data } =
    await query.order(
      "created_at",
      {
        ascending: false,
      }
    );

  setRooms(data || []);
}

let query = supabase
  .from("rooms")
  .select("*");

if (user.role !== "admin") {
  query = query.eq(
    "owner_id",
    user.id
  );
}

const { data } =
  await query.order(
    "created_at",
    {
      ascending: false,
    }
  );

  async function startNewEvent(
  roomCode: string
) {

  const confirmed = confirm(
    "Iniciar um novo evento?"
  );

  if (!confirmed) return;

  await supabase
    .from("queue")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  await supabase
    .from("current_singer")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  await supabase
    .from("performances")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  await supabase
    .from("singer_votes")
    .delete();

  await supabase
    .from("event_status")
    .upsert({
      room_code: roomCode,
      status: "running",
    });

  await supabase
    .from("rooms")
    .update({
      status: "ao_vivo",
    })
    .eq(
      "room_code",
      roomCode
    );

  alert(
    "Novo evento iniciado com sucesso."
  );

  loadRooms();
}

  async function createRoom() {
    if (!roomName.trim()) {
      alert("Informe o nome da sala");
      return;
    }

    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    const { error } = await supabase
      .from("rooms")
      .insert({
        room_code: code,
        room_name: roomName,
        owner_id: user.id,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setRoomCode(code);
    setRoomName("");

    loadRooms();
  }

  const roomUrl =
    roomCode !== ""
      ? `http://localhost:3000/room/${roomCode}`
      : "";

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-4xl font-bold mb-6">
        🎤 Painel do Operador
      </h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block font-bold mb-2">
          Nome da Sala
        </label>

        <input
          type="text"
          value={roomName}
          onChange={(e) =>
            setRoomName(e.target.value)
          }
          placeholder="Ex: Videokê do Paulinho"
          className="border rounded p-2 w-full mb-4"
        />

        <button
          onClick={createRoom}
          className="bg-green-600 text-white px-5 py-3 rounded"
        >
          Criar Sala
        </button>
      </div>

      {roomCode && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">
            ✅ Sala Criada
          </h2>

          <p className="mb-2">
            Código: <strong>{roomCode}</strong>
          </p>

          <div className="mt-4 inline-block border p-4 rounded">
            <QRCode
              value={roomUrl}
              size={220}
            />
          </div>

          <p className="mt-4 text-sm break-all">
            {roomUrl}
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">
          🎵 Salas Existentes
        </h2>

        {rooms.length === 0 ? (
          <p>Nenhuma sala cadastrada.</p>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.room_code}
                className="border rounded p-4"
              >
                <h3 className="text-xl font-bold">
                  {room.room_name}
                </h3>

                <p className="mb-3">
                  Código: {room.room_code}
                </p>
                <p className="mb-3 font-bold">

                 {room.status === "encerrada" ? (
                  <span className="text-red-600">
                      🔴 ENCERRADA
                  </span>
                ) : (
                  <span className="text-green-600">
                      🟢 AO VIVO
                  </span>
                   )}
                
                </p>
                {room.status ===
                    "encerrada" && (

               <button
                     onClick={() =>
                     startNewEvent(
                     room.room_code
                    )
                    }
                    className="bg-green-700 text-white px-4 py-2 rounded mb-3"
  >
                    🎬 INICIAR NOVO EVENTO
               </button>

                 )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      window.open(
                        `/room/${room.room_code}`,
                        "_blank"
                      )
                    }
                    className="bg-green-600 text-white px-3 py-2 rounded"
                  >
                    🎤 Participantes
                  </button>

                  <button
                    onClick={() =>
                      window.open(
                        `/operator/${room.room_code}`,
                        "_blank"
                      )
                    }
                    className="bg-orange-600 text-white px-3 py-2 rounded"
                  >
                    🎛️ Operador
                  </button>

                  <button
                    onClick={() =>
                      window.open(
                        `/tv/${room.room_code}`,
                        "_blank"
                      )
                    }
                    className="bg-purple-600 text-white px-3 py-2 rounded"
                  >
                    📺 TV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}