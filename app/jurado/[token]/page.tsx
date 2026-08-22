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
  const [votingMode, setVotingMode] = useState("stars"); // Novo estado para o tipo de votação
  const [eventEnded, setEventEnded] = useState(false);

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
          setVotingMode(room.voting_mode || "stars"); // Carrega a escolha de voto da sala
        }
      }
    }

    init();
  }, [params]);

  // Supabase Realtime para manter o jurado sincronizado sem sobrecarregar o banco
  useEffect(() => {
    if (!roomCode) return;

    let channel: any;

    async function initializeJuror() {
      await loadCurrentSinger();

      channel = supabase
        .channel("juror_room_updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "current_singer", filter: `room_code=eq.${roomCode}` },
          () => loadCurrentSinger()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `room_code=eq.${roomCode}` },
          () => loadCurrentSinger()
        )
        .subscribe();
    }

    initializeJuror();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomCode]);

  async function loadCurrentSinger() {
    if (!roomCode) {
      setCurrentSinger(null);
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("current_event_id, status, voting_mode")
      .eq("room_code", roomCode)
      .single();

    if (roomError || !room) {
      console.error("Erro ao carregar sala:", roomError);
      setCurrentSinger(null);
      return;
    }

    if (room.voting_mode) {
      setVotingMode(room.voting_mode);
    }

    const ended = room.status === "encerrada";
    setEventEnded(ended);

    if (ended) {
      setCurrentSinger(null);
      setScore(0);
      setMessage("");
      return;
    }

    const eventId = room.current_event_id;

    if (!eventId) {
      setCurrentSinger(null);
      setScore(0);
      setMessage("");
      return;
    }

    const { data: current, error: currentError } = await supabase
      .from("current_singer")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", eventId)
      .maybeSingle();

    if (currentError) {
      console.error("Erro ao carregar cantor atual:", currentError);
      setCurrentSinger(null);
      return;
    }

    setCurrentSinger(current || null);

    if (!current) {
      setScore(0);
      setMessage("");
    }
  }

  async function vote() {
    try {
      setMessage("");

      if (!currentSinger) {
        setMessage("Nenhum cantor está se apresentando.");
        return;
      }

      // No modo thumbs, score 0 é válido (significa Ruim), então validamos se foi nulo ou indefinido se necessário, ou mantemos a regra.
      // Aqui tratamos se o score não foi selecionado (podemos usar uma flag ou garantir que o valor de Ruim envie 0 e Bom envie 100).
      if (votingMode === "stars" && score === 0) {
        setMessage("Selecione uma nota.");
        return;
      }

      if (!currentSinger.singer_token) {
        setMessage("Não foi possível identificar o cantor atual.");
        return;
      }

      const { data: performance, error: performanceError } = await supabase
        .from("performances")
        .select("*")
        .eq("room_code", roomCode)
        .eq("singer_token", currentSinger.singer_token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (performanceError || !performance) {
        console.error("Erro ao localizar apresentação:", performanceError);
        setMessage("A apresentação atual ainda não foi registrada.");
        return;
      }

      const { data: existingVote, error: existingVoteError } = await supabase
        .from("singer_votes")
        .select("id")
        .eq("performance_id", performance.id)
        .eq("voter_token", voterToken)
        .maybeSingle();

      if (existingVoteError) {
        console.error("Erro ao verificar voto:", existingVoteError);
        setMessage("Não foi possível verificar seu voto.");
        return;
      }

      if (existingVote) {
        setMessage("Você já votou nesta apresentação.");
        return;
      }

      const { error: voteError } = await supabase.from("singer_votes").insert({
        room_code: roomCode,
        event_id: performance.event_id,
        performance_id: performance.id,
        singer_token: currentSinger.singer_token,
        voter_token: voterToken,
        voter_type: "juror",
        score,
      });

      if (voteError) {
        console.error("Erro ao registrar voto:", voteError);
        if (voteError.code === "23505") {
          setMessage("Você já votou nesta apresentação.");
          return;
        }
        setMessage(voteError.message);
        return;
      }

      setMessage("✅ Voto registrado com sucesso.");
      setScore(0);
    } catch (error: any) {
      console.error("Erro inesperado ao votar:", error);
      setMessage(error?.message || "Erro inesperado ao votar.");
    }
  }

  async function becomeSinger() {
    if (eventMode !== "interactive") {
      alert("A troca de participação não está disponível no modo tradicional.");
      return;
    }

    const confirmed = confirm("Você será colocado no final da fila. Deseja continuar?");
    if (!confirmed) return;

    const token = crypto.randomUUID();

    const { error: profileError } = await supabase.from("singer_profile").insert({
      singer_token: token,
      singer_name: voterName,
      room_code: roomCode,
      participant_type: "singer",
      next_song: "Escolherá na hora de cantar",
    });

    if (profileError) {
      alert(profileError.message);
      return;
    }

    const { error: queueError } = await supabase.from("queue").insert({
      room_code: roomCode,
      singer_name: voterName,
      song_name: "Escolherá na hora de cantar",
      singer_token: token,
    });

    if (queueError) {
      await supabase.from("singer_profile").delete().eq("singer_token", token);
      alert(queueError.message);
      return;
    }

    const { error: voterError } = await supabase
      .from("voters")
      .delete()
      .eq("voter_token", voterToken);

    if (voterError) {
      alert(voterError.message);
      return;
    }

    window.location.href = `/cantor/${token}`;
  }

  if (eventEnded) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-700 via-purple-950 to-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl p-8 md:p-12 text-center shadow-2xl">
          <div className="text-8xl mb-6">⭐</div>
          <h1 className="text-4xl md:text-5xl font-black mb-5">
            Obrigado pelos seus votos!
          </h1>
          <p className="text-xl text-yellow-100 mb-4">
            Sua participação ajudou a tornar este evento ainda mais especial
            {voterName && (
              <>
                {", "}
                <strong>{voterName}</strong>
              </>
            )}
            .
          </p>
          <div className="bg-yellow-400 text-black rounded-2xl p-5 my-7 shadow-xl">
            <div className="text-5xl mb-3">🏆</div>
            <p className="font-black text-xl">
              A premiação da noite está sendo exibida na TV.
            </p>
          </div>
          <p className="text-2xl font-bold mb-8">Volte sempre! 🎤⭐</p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black px-8 py-4 rounded-xl font-black text-lg"
          >
            🏠 Voltar ao início
          </button>
        </div>
      </main>
    );
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
          <h2 className="text-2xl font-bold mb-4">Dê sua avaliação</h2>

          {/* Renderização condicional baseada na escolha de voto da sala */}
          {votingMode === "thumbs" ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setScore(100)}
                className={`p-6 rounded-2xl text-2xl font-black transition-all ${
                  score === 100 ? "bg-green-500 text-black shadow-lg scale-105" : "bg-slate-700 text-white"
                }`}
              >
                👍 Bom
              </button>
              <button
                onClick={() => setScore(0)}
                className={`p-6 rounded-2xl text-2xl font-black transition-all ${
                  score === 0 && score !== null && score === 0 ? "bg-red-500 text-black shadow-lg scale-105" : "bg-slate-700 text-white"
                }`}
              >
                👎 Ruim
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setScore(value)}
                  className={`p-4 rounded text-2xl transition-all ${
                    score === value
                      ? "bg-yellow-500 text-black"
                      : "bg-slate-700"
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          )}

          <div className="mb-4">
            Seleção Atual: <strong>{score}</strong>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={vote}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded font-bold"
            >
              Enviar Voto
            </button>

            {eventMode === "interactive" && (
              <button
                onClick={becomeSinger}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded font-bold"
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