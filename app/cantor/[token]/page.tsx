"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CantorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState("");

  const [singerName, setSingerName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const [nextSong, setNextSong] = useState("");
  const [message, setMessage] = useState("");

  const [position, setPosition] =
    useState<number | null>(null);

  const [currentSinger, setCurrentSinger] =
    useState("");

  async function loadSinger() {
    const route = await params;

    setToken(route.token);

    const { data } = await supabase
      .from("singer_profile")
      .select("*")
      .eq("singer_token", route.token)
      .single();

    if (!data) return;

    setSingerName(data.singer_name);
    setRoomCode(data.room_code);
    setNextSong(data.next_song || "");

    const { data: queueData } = await supabase
      .from("queue")
      .select("*")
      .eq("room_code", data.room_code)
      .order("created_at");

    if (queueData) {
      const index = queueData.findIndex(
        (item: any) =>
          item.singer_token === route.token
      );

      if (index >= 0) {
        setPosition(index + 1);
      } else {
        setPosition(null);
      }
    }

    const { data: current } = await supabase
      .from("current_singer")
      .select("*")
      .eq("room_code", data.room_code)
      .single();

    if (current) {
      setCurrentSinger(current.singer_name);
    }
  }

  useEffect(() => {
    loadSinger();

    const timer = setInterval(() => {
      loadSinger();
    }, 5000);

    return () => clearInterval(timer);
  }, [params]);

  async function saveNextSong() {
    const { error } = await supabase
      .from("singer_profile")
      .update({
        next_song: nextSong,
      })
      .eq("singer_token", token);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "✅ Próxima música salva com sucesso!"
    );

    loadSinger();
  }

  const singersAhead =
    position && position > 1
      ? position - 1
      : 0;

  const estimatedMinutes =
    singersAhead * 5;

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6">

        <h1 className="text-3xl font-bold mb-4">
          🎤 Área do Cantor
        </h1>

        <p>
          <strong>Nome:</strong> {singerName}
        </p>

        <p>
          <strong>Sala:</strong> {roomCode}
        </p>

        <div className="mt-4 mb-6 p-4 bg-slate-100 rounded">

          <p>
            <strong>
              🎤 Cantando agora:
            </strong>{" "}
            {currentSinger ||
              "Aguardando cantor"}
          </p>

          <p className="mt-2">
            <strong>
              📍 Sua posição:
            </strong>{" "}
            {position ?? "-"}
          </p>

          <p>
            <strong>
              ⏳ Faltam:
            </strong>{" "}
            {singersAhead} cantores
          </p>

          <p>
            <strong>
              ⌚ Tempo estimado:
            </strong>{" "}
            {estimatedMinutes} minutos
          </p>

          {position === 4 && (
            <p className="mt-4 font-bold text-yellow-600">
              🟡 Sua vez está se aproximando.
            </p>
          )}

          {position === 3 && (
            <p className="mt-4 font-bold text-yellow-700">
              🟡 Faltam apenas 2 cantores.
            </p>
          )}

          {position === 2 && (
            <p className="mt-4 font-bold text-orange-600 text-lg">
              🟠 Prepare-se! Você é o próximo.
            </p>
          )}

          {position === 1 && (
            <p className="mt-4 font-bold text-green-600 text-xl">
              🎤 É sua vez de cantar!
            </p>
          )}

        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">

          <p>
            ✅ Sua próxima participação já está reservada na fila.
          </p>

          <p className="mt-2">
            Informe abaixo qual será sua próxima música.
          </p>

        </div>

        <label className="block mb-2 font-bold">
          Qual será sua próxima música?
        </label>

        <input
          type="text"
          value={nextSong}
          onChange={(e) =>
            setNextSong(e.target.value)
          }
          className="border rounded p-2 w-full mb-4"
          placeholder="Digite a próxima música"
        />

        <button
          onClick={saveNextSong}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Salvar
        </button>

        {message && (
          <p className="mt-4 text-green-600 font-bold">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}