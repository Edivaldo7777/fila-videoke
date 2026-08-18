"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";

type QueueItem = {
  id: number;
  singer_name: string;
  song_name: string;
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [roomCode, setRoomCode] = useState("");

  const [name, setName] = useState("");
  const [song, setSong] = useState("");

  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    async function init() {
      const room = await params;
      setRoomCode(room.code);
    }

    init();
  }, [params]);

  useEffect(() => {
    if (!roomCode) return;

    loadQueue();

    const timer = setInterval(() => {
      loadQueue();
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [roomCode]);

  async function loadQueue() {
    const { data, error } = await supabase
      .from("queue")
      .select("*")
      .eq("room_code", roomCode)
      .order("created_at");

    if (error) {
      console.error(error);
      return;
    }

    setQueue(data || []);
  }

  async function addToQueue() {
    if (!name.trim() || !song.trim()) return;

    const token = uuidv4();

    const profileResult = await supabase
      .from("singer_profile")
      .insert({
        singer_token: token,
        singer_name: name,
        room_code: roomCode,
        next_song: "Escolherá na hora de cantar",
      });

    if (profileResult.error) {
      alert(profileResult.error.message);
      return;
    }

    const queueResult = await supabase
      .from("queue")
      .insert({
        room_code: roomCode,
        singer_name: name,
        song_name: song,
        singer_token: token,
      });

    if (queueResult.error) {
      alert(queueResult.error.message);
      return;
    }

    window.open(
      `/cantor/${token}`,
      "_blank"
    );

    setName("");
    setSong("");

    loadQueue();
  }

  async function removeItem(id: number) {
    const { error } = await supabase
      .from("queue")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadQueue();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-4xl font-bold mb-2">
        Sala {roomCode}
      </h1>

      <p className="mb-6 text-gray-600">
        Banco Supabase
      </p>

      <div className="bg-white rounded shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">
          Entrar na Fila
        </h2>

        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <input
          type="text"
          placeholder="Nome da música"
          value={song}
          onChange={(e) => setSong(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <button
          onClick={addToQueue}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Entrar na Fila
        </button>
      </div>

      <div className="bg-white rounded shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Fila Atual
        </h2>

        {queue.length === 0 ? (
          <p>Ninguém na fila.</p>
        ) : (
          <ul className="space-y-2">
            {queue.map((item) => (
              <li
                key={item.id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <span>
                  {item.singer_name} | 🎵 {item.song_name}
                </span>

                <button
                  onClick={() => removeItem(item.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}