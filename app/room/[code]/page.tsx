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

  const [mode, setMode] = useState<
    "singer" | "voter" | null
  >(null);

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

    return () => clearInterval(timer);
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
    if (!name.trim() || !song.trim()) {
      alert("Informe nome e música.");
      return;
    }

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

  async function registerVoter() {
    if (!name.trim()) {
      alert("Informe seu nome.");
      return;
    }

    const voterToken = uuidv4();

    const result = await supabase
      .from("voters")
      .insert({
        room_code: roomCode,
        voter_token: voterToken,
        voter_name: name,
      });

    if (result.error) {
      alert(result.error.message);
      return;
    }

    window.open(
      `/jurado/${voterToken}`,
      "_blank"
    );

    setName("");
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
    <main className="min-h-screen bg-slate-950 text-white p-8">

      <h1 className="text-5xl font-black mb-2">
        🎤 Sala {roomCode}
      </h1>

      <p className="text-slate-400 mb-8">
        Escolha como deseja participar
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">

        <button
          onClick={() => setMode("singer")}
          className={`rounded-xl p-6 text-left border ${
            mode === "singer"
              ? "border-blue-500 bg-blue-900"
              : "border-slate-700 bg-slate-800"
          }`}
        >
          <div className="text-3xl mb-2">
            🎤
          </div>

          <h2 className="text-2xl font-bold">
            Quero Cantar
          </h2>

          <p className="text-slate-300 mt-2">
            Entrar na fila e cantar músicas.
          </p>
        </button>

        <button
          onClick={() => setMode("voter")}
          className={`rounded-xl p-6 text-left border ${
            mode === "voter"
              ? "border-yellow-500 bg-yellow-900"
              : "border-slate-700 bg-slate-800"
          }`}
        >
          <div className="text-3xl mb-2">
            ⭐
          </div>

          <h2 className="text-2xl font-bold">
            Apenas Votar
          </h2>

          <p className="text-slate-300 mt-2">
            Participar avaliando os cantores.
          </p>
        </button>

      </div>

      {mode === "singer" && (
        <div className="bg-slate-800 rounded-xl p-6 mb-8">

          <h2 className="text-2xl font-bold mb-4">
            🎤 Entrar na Fila
          </h2>

          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full p-3 rounded bg-slate-700 mb-3"
          />

          <input
            type="text"
            placeholder="Nome da música"
            value={song}
            onChange={(e) =>
              setSong(e.target.value)
            }
            className="w-full p-3 rounded bg-slate-700 mb-3"
          />

          <button
            onClick={addToQueue}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded"
          >
            Entrar na Fila
          </button>

        </div>
      )}

      {mode === "voter" && (
        <div className="bg-slate-800 rounded-xl p-6 mb-8">

          <h2 className="text-2xl font-bold mb-4">
            ⭐ Entrar como Jurado
          </h2>

          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full p-3 rounded bg-slate-700 mb-3"
          />

          <button
            onClick={registerVoter}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-3 rounded font-bold"
          >
            Entrar como Jurado
          </button>

        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-6">

        <h2 className="text-2xl font-bold mb-4">
          🎤 Fila Atual
        </h2>

        {queue.length === 0 ? (
          <p>Ninguém na fila.</p>
        ) : (
          <ul className="space-y-2">

            {queue.map((item, index) => (
              <li
                key={item.id}
                className="bg-slate-700 rounded p-4 flex justify-between items-center"
              >
                <span>
                  #{index + 1}{" "}
                  {item.singer_name}
                  {" | "}
                  🎵 {item.song_name}
                </span>


              </li>
            ))}

          </ul>
        )}

      </div>

    </main>
  );
}