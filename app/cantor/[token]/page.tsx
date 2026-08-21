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
  const [eventMode, setEventMode] = useState("traditional");
  const [nextSong, setNextSong] = useState("");
  
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [currentSinger, setCurrentSinger] = useState("");

  useEffect(() => {
    async function init() {
      const route = await params;
      setToken(route.token);
    }
    init();
  }, [params]);

  // NOVO USE EFFECT: Com Supabase Realtime para a página do cantor
  useEffect(() => {
    if (!token) return;

    let channel: any;

    async function initializeSinger() {
      await loadSinger();

      // Pegamos o roomCode para filtrar o Realtime da sala correta
      const { data } = await supabase
        .from("singer_profile")
        .select("room_code")
        .eq("singer_token", token)
        .single();

      if (data?.room_code) {
        // Inscreve no canal para escutar alterações na fila, sala ou cantor atual
        channel = supabase
          .channel("singer_room_updates")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "queue", filter: `room_code=eq.${data.room_code}` },
            () => loadSinger()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "current_singer", filter: `room_code=eq.${data.room_code}` },
            () => loadSinger()
          )
          .subscribe();
      }
    }

    initializeSinger();

    // Limpeza ao sair da página
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [token]);

  async function loadSinger() {
    if (!token) return;

    const { data } = await supabase
      .from("singer_profile")
      .select("*")
      .eq("singer_token", token)
      .single();

    if (!data) return;

    setSingerName(data.singer_name);
    setRoomCode(data.room_code);
    
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", data.room_code)
      .single();

    if (room) {
      setEventMode(room.event_mode || "traditional");
    }

    setNextSong((currentValue) => {
      if (currentValue === "" && data.next_song) {
        return data.next_song;
      }
      return currentValue;
    });

    const { data: queueData } = await supabase
      .from("queue")
      .select("*")
      .eq("room_code", data.room_code)
      .order("created_at");

    if (queueData) {
      const index = queueData.findIndex(
        (item: any) => item.singer_token === token
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
    } else {
      setCurrentSinger("");
    }
  }

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

    setMessage("✅ Próxima música salva com sucesso!");
    loadSinger();
  }
  
  async function becomeJuror() {
    const confirmed = confirm(
      "Você perderá sua posição na fila e passará a atuar como jurado. Deseja continuar?"
    );

    if (!confirmed) return;

    const voterToken = crypto.randomUUID();

    await supabase.from("voters").insert({
      room_code: roomCode,
      voter_token: voterToken,
      voter_name: singerName,
    });

    await supabase.from("queue").delete().eq("singer_token", token);
    await supabase.from("singer_profile").delete().eq("singer_token", token);

    window.location.href = `/jurado/${voterToken}`;
  }

  const singersAhead = position && position > 1 ? position - 1 : 0;
  const estimatedMinutes = singersAhead * 5;

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
            <strong>🎤 Cantando agora:</strong>{" "}
            {currentSinger || "Aguardando cantor"}
          </p>

          <p className="mt-2">
            <strong>📍 Sua posição:</strong>{" "}
            {position ?? "-"}
          </p>

          <p>
            <strong>⏳ Faltam:</strong>{" "}
            {singersAhead} cantores
          </p>

          <p>
            <strong>⌚ Tempo estimado:</strong>{" "}
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
          <p>✅ Sua próxima participação já está reservada na fila.</p>
          <p className="mt-2">Informe abaixo qual será sua próxima música.</p>
        </div>

        <label className="block mb-2 font-bold">
          Qual será sua próxima música?
        </label>

        <input
          type="text"
          value={nextSong}
          onChange={(e) => setNextSong(e.target.value)}
          className="border rounded p-2 w-full mb-4"
          placeholder="Digite a próxima música"
        />

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={saveNextSong}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Salvar
          </button>

          {eventMode === "interactive" && (
            <button
              onClick={becomeJuror}
              className="bg-yellow-500 text-black px-4 py-2 rounded"
            >
              ⭐ Virar Jurado
            </button>
          )}
        </div>

        {message && (
          <p className="mt-4 text-green-600 font-bold">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}