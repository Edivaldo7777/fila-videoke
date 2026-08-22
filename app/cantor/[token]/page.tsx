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
  const [votingMode, setVotingMode] = useState("stars"); // Novo estado para o modo de voto
  const [nextSong, setNextSong] = useState("");
  
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [currentSinger, setCurrentSinger] = useState<any>(null);
  const [voteScore, setVoteScore] = useState(0);

  const [voteMessage, setVoteMessage] = useState("");
  const [eventEnded, setEventEnded] = useState(false);

  useEffect(() => {
    async function init() {
      const route = await params;
      setToken(route.token);
    }
    init();
  }, [params]);

  // Atualização automática da página do cantor
  useEffect(() => {
    if (!token) {
      return;
    }

    let channel: any = null;

    async function initializeSinger() {
      await loadSinger();

      const { data, error } = await supabase
        .from("singer_profile")
        .select("room_code")
        .eq("singer_token", token)
        .maybeSingle();

      if (error) {
        console.error("Erro ao localizar sala do cantor:", error);
        return;
      }

      if (!data?.room_code) {
        return;
      }

      channel = supabase
        .channel(`singer_updates_${data.room_code}_${token}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "queue",
            filter: `room_code=eq.${data.room_code}`,
          },
          () => {
            loadSinger();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "current_singer",
            filter: `room_code=eq.${data.room_code}`,
          },
          () => {
            loadSinger();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `room_code=eq.${data.room_code}`,
          },
          () => {
            loadSinger();
          }
        )
        .subscribe();
    }

    initializeSinger();

    const timer = window.setInterval(() => {
      loadSinger();
    }, 5000);

    return () => {
      window.clearInterval(timer);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [token]);

  async function loadSinger() {
    if (!token) {
      return;
    }

    const { data, error: profileError } = await supabase
      .from("singer_profile")
      .select("*")
      .eq("singer_token", token)
      .maybeSingle();

    if (profileError || !data) {
      if (profileError) {
        console.error("Erro ao carregar cantor:", profileError);
      }
      return;
    }

    setSingerName(data.singer_name);
    setRoomCode(data.room_code);

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", data.room_code)
      .single();

    if (roomError || !room) {
      console.error("Erro ao carregar sala:", roomError);
      return;
    }

    setEventMode(room.event_mode || "traditional");
    setVotingMode(room.voting_mode || "stars"); // Carrega o modo de votação da sala

    const ended = room.status === "encerrada";
    setEventEnded(ended);

    if (ended) {
      setCurrentSinger(null);
      setPosition(null);
      setVoteScore(0);
      setVoteMessage("");
      return;
    }

    const eventId = room.current_event_id;

    setNextSong((currentValue) => {
      if (currentValue === "" && data.next_song) {
        return data.next_song;
      }
      return currentValue;
    });

    const { data: queueData, error: queueError } = await supabase
      .from("queue")
      .select("*")
      .eq("room_code", data.room_code)
      .order("created_at");

    if (queueError) {
      console.error("Erro ao carregar fila:", queueError);
    }

    if (queueData) {
      const index = queueData.findIndex(
        (item: any) => item.singer_token === token
      );

      if (index >= 0) {
        setPosition(index + 1);
      } else {
        setPosition(null);
      }
    } else {
      setPosition(null);
    }

    if (!eventId) {
      setCurrentSinger(null);
      setVoteScore(0);
      setVoteMessage("");
      return;
    }

    const { data: current, error: currentError } = await supabase
      .from("current_singer")
      .select("*")
      .eq("room_code", data.room_code)
      .eq("event_id", eventId)
      .maybeSingle();

    if (currentError) {
      console.error("Erro ao carregar cantor atual:", currentError);
      setCurrentSinger(null);
      return;
    }

    setCurrentSinger(current || null);

    if (!current) {
      setVoteScore(0);
      setVoteMessage("");
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
    if (currentSinger?.singer_token === token) {
      alert("Você está se apresentando neste momento.");
      return;
    }

    if (position === 1) {
      alert("Você é o próximo da fila e não pode sair agora.");
      return;
    }

    const confirmed = confirm(
      "Você perderá sua posição na fila e passará a atuar como jurado. Deseja continuar?"
    );

    if (!confirmed) return;

    const voterToken = crypto.randomUUID();

    const { error: voterError } = await supabase
      .from("voters")
      .insert({
        room_code: roomCode,
        voter_token: voterToken,
        voter_name: singerName,
      });

    if (voterError) {
      alert(voterError.message);
      return;
    }

    const { error: queueError } = await supabase
      .from("queue")
      .delete()
      .eq("singer_token", token);

    if (queueError) {
      alert(queueError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from("singer_profile")
      .delete()
      .eq("singer_token", token);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    window.location.href = `/jurado/${voterToken}`;
  }
  
  async function voteCurrentSinger() {
    setVoteMessage("");

    if (eventMode !== "interactive") {
      setVoteMessage("A votação por cantores está disponível apenas no modo interativo.");
      return;
    }

    if (!currentSinger) {
      setVoteMessage("Nenhum cantor está se apresentando.");
      return;
    }

    if (currentSinger.singer_token === token) {
      setVoteMessage("Você não pode votar na própria apresentação.");
      return;
    }

    if (votingMode === "stars" && voteScore === 0) {
      setVoteMessage("Selecione uma nota.");
      return;
    }

    const { data: performance, error: performanceError } = await supabase
      .from("performances")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", currentSinger.event_id)
      .eq("singer_token", currentSinger.singer_token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (performanceError || !performance) {
      console.error("Erro ao localizar apresentação:", performanceError);
      setVoteMessage("A apresentação atual ainda não foi registrada.");
      return;
    }

    const { data: existingVote, error: existingVoteError } = await supabase
      .from("singer_votes")
      .select("id")
      .eq("performance_id", performance.id)
      .eq("voter_token", token)
      .maybeSingle();

    if (existingVoteError) {
      console.error("Erro ao verificar voto:", existingVoteError);
      setVoteMessage("Não foi possível verificar seu voto.");
      return;
    }

    if (existingVote) {
      setVoteMessage("Você já votou nesta apresentação.");
      return;
    }

    const { error } = await supabase
      .from("singer_votes")
      .insert({
        room_code: roomCode,
        event_id: performance.event_id,
        performance_id: performance.id,
        singer_token: currentSinger.singer_token,
        voter_token: token,
        voter_type: "singer",
        score: voteScore,
      });

    if (error) {
      console.error("Erro ao registrar voto:", error);

      if (error.code === "23505") {
        setVoteMessage("Você já votou nesta apresentação.");
        return;
      }

      setVoteMessage(error.message);
      return;
    }

    setVoteMessage("✅ Voto registrado com sucesso.");
    setVoteScore(0);
  }

  const singersAhead = position && position > 1 ? position - 1 : 0;
  const estimatedMinutes = singersAhead * 5;

  if (eventEnded) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-950 to-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl p-8 md:p-12 text-center shadow-2xl">
          <div className="text-8xl mb-6">🎤</div>
          <h1 className="text-4xl md:text-5xl font-black mb-5">
            Obrigado pela sua participação!
          </h1>
          <p className="text-xl text-purple-100 mb-4">
            Foi muito bom ter você cantando com a gente,
            {singerName && (
              <>
                {" "}
                <strong>{singerName}</strong>
              </>
            )}
            .
          </p>
          <div className="bg-yellow-400 text-black rounded-2xl p-5 my-7">
            <div className="text-4xl mb-2">🏆</div>
            <p className="font-black text-lg">
              A premiação da noite está sendo exibida na TV.
            </p>
          </div>
          <p className="text-2xl font-bold mb-8">
            Volte sempre! ⭐
          </p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 text-white px-8 py-4 rounded-xl font-black text-lg"
          >
            🏠 Voltar ao início
          </button>
        </div>
      </main>
    );
  }

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
            {currentSinger?.singer_name || "Aguardando cantor"}
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
              className="bg-yellow-500 text-black px-4 py-2 rounded font-bold"
            >
              ⭐ Virar Jurado
            </button>
          )}
        </div>

        {eventMode === "interactive" &&
          currentSinger &&
          currentSinger.singer_token !== token && (

          <div className="mt-8 border-t border-slate-200 pt-6">

            <h3 className="font-bold text-xl mb-2">
              ⭐ Avaliar Apresentação Atual
            </h3>

            <p className="text-slate-600 mb-4">
              Avalie a apresentação de{" "}
              <strong>
                {currentSinger.singer_name}
              </strong>
            </p>

            {/* Renderização condicional do voto para o cantor (estrelas ou thumbs) */}
            {votingMode === "thumbs" ? (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => {
                    setVoteScore(100);
                    setVoteMessage("");
                  }}
                  className={`p-4 rounded-xl text-xl font-bold transition-all ${
                    voteScore === 100 ? "bg-green-500 text-black shadow-lg" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  👍 Bom
                </button>
                <button
                  onClick={() => {
                    setVoteScore(0);
                    setVoteMessage("");
                  }}
                  className={`p-4 rounded-xl text-xl font-bold transition-all ${
                    voteScore === 0 && voteScore !== null ? "bg-red-500 text-black shadow-lg" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  👎 Ruim
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setVoteScore(value);
                      setVoteMessage("");
                    }}
                    className={`p-3 rounded text-xl ${
                      voteScore === value
                        ? "bg-yellow-500 text-black"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            )}

            <div className="mb-4 text-slate-700">
              Seleção atual:{" "}
              <strong>{voteScore}</strong>
            </div>

            <button
              onClick={voteCurrentSinger}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold"
            >
              Enviar Voto
            </button>

            {voteMessage && (
              <p className="mt-3 font-bold text-slate-700">
                {voteMessage}
              </p>
            )}

          </div>

        )}

        {message && (
          <p className="mt-4 text-green-600 font-bold">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}