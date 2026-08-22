"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function JuradoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [voterToken, setVoterToken] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [voterName, setVoterName] = useState("");
  const [currentSinger, setCurrentSinger] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [eventMode, setEventMode] = useState("traditional");

  useEffect(() => {
    async function init() {
      const route = await params;
      setVoterToken(route.token);

      const { data: voter } = await supabase
        .from("voters")
        .select("*")
        .eq("voter_token", route.token)
        .single();

      if (voter) {
        setRoomCode(voter.room_code);
        setVoterName(voter.voter_name);

        const { data: room } = await supabase
          .from("rooms")
          .select("*")
          .eq("room_code", voter.room_code)
          .single();

        if (room) {
          setEventMode(room.event_mode || "traditional");
        }
      }
    }

    init();
  }, [params]);

  // NOVO USE EFFECT: Com Supabase Realtime para a página do jurado
  useEffect(() => {
    if (!roomCode) return;

    let channel: any;

    async function initializeJuror() {
      await loadCurrentSinger();

      // Inscreve no canal para escutar alterações em tempo real no cantor atual desta sala
      channel = supabase
        .channel("juror_room_updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "current_singer", filter: `room_code=eq.${roomCode}` },
          () => loadCurrentSinger()
        )
        .subscribe();
    }

    initializeJuror();

    // Limpeza ao sair da página
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomCode]);

  async function loadCurrentSinger() {
    const { data } = await supabase
      .from("current_singer")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    setCurrentSinger(data);
  }

  async function vote() {
    try {
      setMessage("");

      if (!currentSinger) {
        setMessage("Nenhum cantor está se apresentando.");
        return;
      }

      if (score === 0) {
        setMessage("Selecione uma nota.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("singer_profile")
        .select("*")
        .eq("singer_name", currentSinger.singer_name)
        .eq("room_code", roomCode)
        .single();

      if (profileError) {
        console.error(profileError);
        setMessage(profileError.message);
        return;
      }

      if (!profile) {
        setMessage("Cantor não encontrado.");
        return;
      }

      const result = await supabase.from("singer_votes").insert({
        room_code: roomCode,
        singer_token: profile.singer_token,
        voter_token: voterToken,
        score,
      });

      if (result.error) {
        console.error(result.error);
        setMessage(result.error.message);
        return;
      }

      setMessage("✅ Voto registrado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Erro inesperado ao votar.");
    }
  }

  async function becomeSinger() {
    const confirmed = confirm(
      "Você será colocado no final da fila. Deseja continuar?"
    );

    if (!confirmed) return;

    const token = crypto.randomUUID();

    await supabase.from("singer_profile").insert({
      singer_token: token,
      singer_name: voterName,
      room_code: roomCode,
      participant_type: "singer",
      next_song: "Escolherá na hora de cantar",
    });

    await supabase.from("queue").insert({
      room_code: roomCode,
      singer_name: voterName,
      song_name: "Escolherá na hora de cantar",
      singer_token: token,
    });

    await supabase.from("voters").delete().eq("voter_token", voterToken);

    window.location.href = `/cantor/${token}`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-xl mx-auto">

        <h1 className="text-5xl font-black mb-2">⭐ Área do Jurado</h1>
        <p className="text-slate-400 mb-8">Bem-vindo {voterName}</p>

        <div className="bg-yellow-400 text-black rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-black mb-2">🎤 Cantando Agora</h2>
          <div className="text-4xl font-black">
            {currentSinger?.singer_name || "Aguardando"}
          </div>
          <div className="text-xl mt-2">
            🎵 {currentSinger?.song_name || "Nenhuma música"}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Dê sua nota</h2>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setScore(value)}
                className={`p-4 rounded text-2xl ${
                  score === value
                    ? "bg-yellow-500 text-black"
                    : "bg-slate-700"
                }`}
              >
                ⭐
              </button>
            ))}
          </div>

          <div className="mb-4">
            Nota Selecionada: <strong>{score}</strong>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={vote}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded"
            >
              Enviar Voto
            </button>

            {eventMode === "interactive" && (
              <button
                onClick={becomeSinger}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded"
              >
                🎤 Quero Cantar
              </button>
            )}
          </div>

          {message && (
            <div className="mt-4 font-bold text-yellow-300">
              {message}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}