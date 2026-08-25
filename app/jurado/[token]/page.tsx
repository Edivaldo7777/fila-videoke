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
  const [score, setScore] =
    useState<number | null>(null);
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
  // Atualização automática da Área do Jurado
useEffect(() => {

  if (!roomCode) {
    return;
  }

  let channel: any = null;

  let refreshTimer:
    ReturnType<typeof setInterval> |
    null = null;

  let active = true;

  async function initializeJuror() {

    await loadCurrentSinger();

    if (!active) {
      return;
    }

    refreshTimer =
      window.setInterval(
        () => {
          loadCurrentSinger();
        },
        2000
      );

    channel = supabase
      .channel(
        `juror_updates_${roomCode}_${voterToken || "waiting"}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "current_singer",
          filter:
            `room_code=eq.${roomCode}`,
        },
        () => {
          loadCurrentSinger();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter:
            `room_code=eq.${roomCode}`,
        },
        () => {
          loadCurrentSinger();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_status",
          filter:
            `room_code=eq.${roomCode}`,
        },
        () => {
          loadCurrentSinger();
        }
      )
      .subscribe(
        (status) => {

          console.log(
            "Status Realtime do Jurado:",
            status
          );

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT"
          ) {
            console.warn(
              "Realtime indisponível. A Área do Jurado continuará atualizando a cada 2 segundos."
            );
          }
        }
      );
  }

  initializeJuror();

  return () => {

    active = false;

    if (refreshTimer) {
      window.clearInterval(
        refreshTimer
      );
    }

    if (channel) {
      supabase.removeChannel(
        channel
      );
    }
  };

}, [roomCode, voterToken]);

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
      setScore(null);
      setMessage("");
      return;
    }

    const eventId = room.current_event_id;

    if (!eventId) {
      setCurrentSinger(null);
      setScore(null);
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
      setScore(null);
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
      if (
  votingMode === "stars" &&
  score === null
) {
  setMessage(
    "Selecione uma nota."
  );
  return;
}

if (
  votingMode === "thumbs" &&
  score !== 100 &&
  score !== 0
) {
  setMessage(
    "Escolha Bom ou Ruim."
  );
  return;
}

      if (!currentSinger.singer_token) {
        setMessage("Não foi possível identificar o cantor atual.");
        return;
      }

      const { data: performance, error: performanceError } = await supabase
        .from("performances")
        .select("*")
        .eq(
  "room_code",
  roomCode
)
.eq(
  "event_id",
  currentSinger.event_id
)
.eq(
  "singer_token",
  currentSinger.singer_token
)
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
      setScore(null);
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
  <main className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-black text-white p-4 md:p-8">
    <div className="max-w-3xl mx-auto">

      {/* Cabeçalho */}
      <header className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-bold mb-3">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              ÁREA DO JURADO
            </div>

            <h1 className="text-3xl md:text-5xl font-black">
              ⭐ Olá, {voterName || "Jurado"}
            </h1>

            <p className="text-slate-400 mt-2">
              Avalie as apresentações e participe da escolha dos destaques da noite.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3">
            <p className="text-xs text-slate-400 uppercase font-bold">
              Sala
            </p>

            <p className="text-xl font-black text-yellow-400">
              {roomCode}
            </p>
          </div>
        </div>
      </header>

      {/* Cantor atual */}
      <section className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 text-black rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-52 h-52 bg-white/30 rounded-full blur-3xl" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-widest opacity-70">
            🎤 Cantando agora
          </p>

          <h2 className="text-4xl md:text-6xl font-black mt-2 break-words">
            {currentSinger?.singer_name || "Aguardando cantor"}
          </h2>

          <p className="text-xl md:text-2xl font-bold mt-2">
            🎵{" "}
            {currentSinger?.song_name ||
              "Nenhuma música em execução"}
          </p>

          {currentSinger ? (
            <div className="mt-5 inline-flex items-center gap-2 bg-black/80 text-white rounded-full px-4 py-2 text-sm font-bold">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              APRESENTAÇÃO EM ANDAMENTO
            </div>
          ) : (
            <div className="mt-5 inline-flex items-center gap-2 bg-white/60 text-black rounded-full px-4 py-2 text-sm font-bold">
              ⏳ Aguardando o operador
            </div>
          )}
        </div>
      </section>

      {/* Informações */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl flex items-center justify-center text-2xl">
              {votingMode === "thumbs" ? "👍" : "⭐"}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Tipo de votação
              </p>

              <p className="font-black text-lg mt-1">
                {votingMode === "thumbs"
                  ? "Aprovação Bom ou Ruim"
                  : "Avaliação por Estrelas"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-2xl">
              {eventMode === "interactive" ? "🔄" : "🔒"}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Modo do evento
              </p>

              <p className="font-black text-lg mt-1">
                {eventMode === "interactive"
                  ? "Interativo"
                  : "Tradicional"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Votação */}
      <section className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">
        <div className="flex items-center gap-4 mb-7">
          <div className="w-14 h-14 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl flex items-center justify-center text-3xl">
            🗳️
          </div>

          <div>
            <h2 className="text-2xl font-black">
              Dê sua avaliação
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              Seu voto será associado somente à apresentação atual.
            </p>
          </div>
        </div>

        {!currentSinger ? (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">
              ⏳
            </div>

            <h3 className="font-black text-xl">
              Aguardando uma apresentação
            </h3>

            <p className="text-slate-400 mt-2">
              Os controles de votação serão liberados quando o operador chamar um cantor.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                Você está avaliando
              </p>

              <p className="text-2xl font-black mt-2">
                🎤 {currentSinger.singer_name}
              </p>

              <p className="text-slate-400 mt-1">
                🎵 {currentSinger.song_name}
              </p>
            </div>

            {votingMode === "thumbs" ? (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => {
                    setScore(100);
                    setMessage("");
                  }}
                  className={`p-5 md:p-7 rounded-2xl text-xl md:text-2xl font-black transition-all ${
                    score === 100
                      ? "bg-emerald-500 text-black ring-4 ring-emerald-300/30 scale-[1.02]"
                      : "bg-slate-800 border border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/10"
                  }`}
                >
                  <div className="text-5xl mb-3">
                    👍
                  </div>
                  Bom
                </button>

                <button
                  onClick={() => {
                    setScore(0);
                    setMessage("");
                  }}
                  className={`p-5 md:p-7 rounded-2xl text-xl md:text-2xl font-black transition-all ${
                    score === 0
                      ? "bg-red-500 text-white ring-4 ring-red-300/30 scale-[1.02]"
                      : "bg-slate-800 border border-slate-700 hover:border-red-500 hover:bg-red-500/10"
                  }`}
                >
                  <div className="text-5xl mb-3">
                    👎
                  </div>
                  Ruim
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-3">
                  Selecione de uma a cinco estrelas:
                </p>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setScore(value);
                        setMessage("");
                      }}
                      className={`p-3 md:p-5 rounded-xl text-xl md:text-2xl transition-all ${
                        score === value
                          ? "bg-yellow-500 text-black ring-4 ring-yellow-300/30 scale-105"
                          : "bg-slate-800 border border-slate-700 hover:border-yellow-500"
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5">
              <p className="text-sm text-slate-400">
                Seleção atual
              </p>

              <p className="font-black text-lg mt-1">
                {score === null
                  ? "Nenhuma avaliação selecionada"
                  : votingMode === "thumbs"
                    ? score === 100
                      ? "👍 Bom"
                      : "👎 Ruim"
                    : `⭐ ${score} estrela${score === 1 ? "" : "s"}`}
              </p>
            </div>

            <button
              onClick={vote}
              disabled={score === null}
              className={`w-full px-5 py-4 rounded-xl font-black text-lg transition-all ${
                score === null
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white hover:-translate-y-0.5 shadow-lg"
              }`}
            >
              ✅ Enviar Voto
            </button>
          </>
        )}

        {message && (
          <div
            className={`mt-5 border rounded-xl p-4 font-bold text-center ${
              message.includes("sucesso")
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-yellow-500/10 border-yellow-500/30 text-yellow-200"
            }`}
          >
            {message}
          </div>
        )}
      </section>

      {/* Troca para cantor */}
      {eventMode === "interactive" && (
        <section className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 border border-blue-500/20 rounded-3xl p-6 mb-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <h2 className="text-xl font-black">
                🎤 Também quer cantar?
              </h2>

              <p className="text-slate-300 mt-2">
                Ao confirmar, você entrará no final da fila e sua tela mudará para a Área do Cantor.
              </p>
            </div>

            <button
              onClick={becomeSinger}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black transition-all shrink-0"
            >
              🎤 Quero Cantar
            </button>
          </div>
        </section>
      )}

      <footer className="text-center text-xs text-slate-500 py-4">
        Fila Videokê • Avalie com responsabilidade e divirta-se
      </footer>

    </div>
  </main>
);
}