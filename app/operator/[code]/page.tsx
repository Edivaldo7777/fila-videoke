"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type QueueItem = {
  id: number;
  singer_name: string;
  song_name: string;
  singer_token: string;
};

export default function OperatorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [votingMode, setVotingMode] = useState("stars"); // Novo estado para o modo de voto
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [newSinger, setNewSinger] = useState("");
  const [newSong, setNewSong] = useState("");

  const [currentSinger, setCurrentSinger] = useState<any>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentVotes, setCurrentVotes] = useState(0);
  
  const [eventEnded, setEventEnded] = useState(false);
  const [endingEvent, setEndingEvent] = useState(false);

  useEffect(() => {
    async function init() {
      const room = await params;
      setRoomCode(room.code);
    }

    init();
  }, [params]);

  useEffect(() => {
    if (!roomCode) return;

    let timer: NodeJS.Timeout;

    async function validateAccess() {
      const user = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

      if (!room) {
        setCheckingAccess(false);
        return;
      }

      setVotingMode(room.voting_mode || "stars");

      if (
        user.role === "admin" ||
        room.owner_id === user.id
      ) {
        setAuthorized(true);
        await loadData();
        timer = setInterval(loadData, 5000);
      }

      setCheckingAccess(false);
    }

    validateAccess();

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [roomCode]);

  async function loadData() {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (roomError || !room) {
      console.error("Erro ao carregar sala:", roomError);
      return;
    }

    setRoomName(room.room_name);
    setVotingMode(room.voting_mode || "stars");

    const eventId = room.current_event_id;

    const { data: queueData, error: queueError } = await supabase
      .from("queue")
      .select("*")
      .eq("room_code", roomCode)
      .order("created_at");

    if (queueError) {
      console.error("Erro ao carregar fila:", queueError);
    }

    let current = null;

    if (eventId) {
      const { data: currentData, error: currentError } = await supabase
        .from("current_singer")
        .select("*")
        .eq("room_code", roomCode)
        .eq("event_id", eventId)
        .maybeSingle();

      if (currentError) {
        console.error("Erro ao carregar cantor atual:", currentError);
      }

      current = currentData || null;
    }

    setCurrentSinger(current);
    setQueue(queueData || []);

    if (current?.singer_token) {
      await loadVotes(current.singer_token);
    } else {
      setCurrentScore(0);
      setCurrentVotes(0);
    }
  }

  async function loadVotes(singerToken: string) {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("current_event_id")
      .eq("room_code", roomCode)
      .single();

    if (roomError || !room?.current_event_id) {
      setCurrentScore(0);
      setCurrentVotes(0);
      return;
    }

    const { data: performance, error: performanceError } = await supabase
      .from("performances")
      .select("id")
      .eq("room_code", roomCode)
      .eq("event_id", room.current_event_id)
      .eq("singer_token", singerToken)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (performanceError || !performance) {
      setCurrentScore(0);
      setCurrentVotes(0);
      return;
    }

    const { data: votes, error: votesError } = await supabase
      .from("singer_votes")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", room.current_event_id)
      .eq("performance_id", performance.id);

    if (votesError || !votes || votes.length === 0) {
      setCurrentScore(0);
      setCurrentVotes(0);
      return;
    }

    const total = votes.reduce(
      (sum, vote) => sum + Number(vote.score),
      0
    );

    setCurrentVotes(votes.length);
    setCurrentScore(total / votes.length);
  }

  // Função para retornar a mensagem personalizada baseada na nota do modo thumbs
  function getPerformanceMessage(score: number) {
    if (score >= 95) return "🎉 Sua nota foi 100! Parabéns, você é um grande cantor!";
    if (score >= 75) return `⭐ Sua nota foi ${Math.round(score)}! Está quase um profissional.`;
    if (score >= 50) return `🎤 Sua nota foi ${Math.round(score)}! Tem que melhorar um pouco mais.`;
    return `💪 Sua nota foi ${Math.round(score)}! Continue tentando até ficar um bom cantor.`;
  }

  async function addSinger() {
    if (!authorized) {
      alert("Acesso negado.");
      return;
    }

    if (!newSinger.trim() || !newSong.trim()) {
      alert("Informe o nome do cantor e a música.");
      return;
    }

    const token = crypto.randomUUID();

    await supabase.from("singer_profile").insert({
      singer_token: token,
      singer_name: newSinger,
      room_code: roomCode,
      participant_type: "singer",
      next_song: "Escolherá na hora de cantar",
    });

    await supabase.from("queue").insert({
      room_code: roomCode,
      singer_name: newSinger,
      song_name: newSong,
      singer_token: token,
    });

    setNewSinger("");
    setNewSong("");
    loadData();
  }

  async function removeItem(id: number) {
    if (!authorized) {
      alert("Acesso negado.");
      return;
    }

    await supabase.from("queue").delete().eq("id", id);
    loadData();
  }

  async function nextSinger() {

  if (!authorized) {
    alert("Acesso negado.");
    return;
  }

  if (queue.length === 0) {
    alert(
      "Não há participantes na fila."
    );
    return;
  }

  const singer = queue[0];

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select(
      "room_code, current_event_id, status"
    )
    .eq(
      "room_code",
      roomCode
    )
    .single();

  if (
    roomError ||
    !room
  ) {
    console.error(
      "Erro ao localizar sala:",
      roomError
    );

    alert(
      `Erro ao localizar sala: ${
        roomError?.message ||
        "sala não encontrada"
      }`
    );
    return;
  }

  if (
    room.status === "encerrada"
  ) {
    alert(
      "Esta sala está encerrada. Inicie um novo evento pelo Dashboard."
    );
    return;
  }

  if (!room.current_event_id) {
    alert(
      "Esta sala não possui um evento ativo."
    );
    return;
  }

  const {
    data: eventData,
    error: eventError,
  } = await supabase
    .from("events")
    .select(
      "id, status"
    )
    .eq(
      "id",
      room.current_event_id
    )
    .eq(
      "room_code",
      roomCode
    )
    .maybeSingle();

  if (
    eventError ||
    !eventData
  ) {
    console.error(
      "Erro ao localizar evento:",
      eventError
    );

    alert(
      `Erro ao localizar evento: ${
        eventError?.message ||
        "evento não encontrado"
      }`
    );
    return;
  }

  if (
    eventData.status !== "running"
  ) {
    alert(
      "O evento desta sala não está ativo."
    );
    return;
  }

  const {
    data: performance,
    error: performanceError,
  } = await supabase
    .from("performances")
    .insert({
      room_code:
        roomCode,

      event_id:
        room.current_event_id,

      singer_token:
        singer.singer_token,

      singer_name:
        singer.singer_name,

      song_name:
        singer.song_name,
    })
    .select(
      "id, event_id"
    )
    .single();

  if (
    performanceError ||
    !performance
  ) {
    console.error(
      "Erro ao registrar apresentação:",
      performanceError
    );

    alert(
      `Erro ao registrar apresentação: ${
        performanceError?.message ||
        "erro desconhecido"
      }`
    );
    return;
  }

  /*
   * Primeiro removemos qualquer registro residual
   * da mesma sala. Depois inserimos o cantor atual
   * já associado ao evento correto.
   */
  const {
    error: clearCurrentError,
  } = await supabase
    .from("current_singer")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  if (clearCurrentError) {
    console.error(
      "Erro ao limpar cantor anterior:",
      clearCurrentError
    );

    await supabase
      .from("performances")
      .delete()
      .eq(
        "id",
        performance.id
      );

    alert(
      `Erro ao limpar cantor anterior: ${clearCurrentError.message}`
    );
    return;
  }

  const {
    error: currentSingerError,
  } = await supabase
    .from("current_singer")
    .insert({
      room_code:
        roomCode,

      event_id:
        room.current_event_id,

      singer_name:
        singer.singer_name,

      song_name:
        singer.song_name,

      singer_token:
        singer.singer_token,
    });

  if (currentSingerError) {
    console.error(
      "Erro ao definir cantor atual:",
      currentSingerError
    );

    await supabase
      .from("performances")
      .delete()
      .eq(
        "id",
        performance.id
      );

    alert(
      `Erro ao definir cantor atual: ${currentSingerError.message}`
    );
    return;
  }

  const {
    data: profile,
    error: profileLoadError,
  } = await supabase
    .from("singer_profile")
    .select(
      "next_song"
    )
    .eq(
      "singer_token",
      singer.singer_token
    )
    .maybeSingle();

  if (profileLoadError) {
    console.error(
      "Erro ao carregar perfil do cantor:",
      profileLoadError
    );
  }

  let nextSong =
    "Escolherá na hora de cantar";

  if (
    profile?.next_song &&
    profile.next_song.trim() !== ""
  ) {
    nextSong =
      profile.next_song.trim();
  }

  const {
    error: queueInsertError,
  } = await supabase
    .from("queue")
    .insert({
      room_code:
        roomCode,

      singer_name:
        singer.singer_name,

      song_name:
        nextSong,

      singer_token:
        singer.singer_token,
    });

  if (queueInsertError) {
    console.error(
      "Erro ao recolocar cantor no fim da fila:",
      queueInsertError
    );

    await supabase
      .from("current_singer")
      .delete()
      .eq(
        "room_code",
        roomCode
      )
      .eq(
        "event_id",
        room.current_event_id
      );

    await supabase
      .from("performances")
      .delete()
      .eq(
        "id",
        performance.id
      );

    alert(
      `Erro ao recolocar cantor na fila: ${queueInsertError.message}`
    );
    return;
  }

  const {
    error: profileUpdateError,
  } = await supabase
    .from("singer_profile")
    .update({
      next_song:
        "Escolherá na hora de cantar",
    })
    .eq(
      "singer_token",
      singer.singer_token
    );

  if (profileUpdateError) {
    console.error(
      "Erro ao limpar próxima música:",
      profileUpdateError
    );
  }

  const {
    error: queueDeleteError,
  } = await supabase
    .from("queue")
    .delete()
    .eq(
      "id",
      singer.id
    );

  if (queueDeleteError) {
    console.error(
      "Erro ao remover posição anterior:",
      queueDeleteError
    );

    /*
     * Remove a nova cópia inserida no final,
     * evitando duplicidade caso a posição antiga
     * não possa ser removida.
     */
    await supabase
      .from("queue")
      .delete()
      .eq(
        "room_code",
        roomCode
      )
      .eq(
        "singer_token",
        singer.singer_token
      )
      .eq(
        "song_name",
        nextSong
      )
      .neq(
        "id",
        singer.id
      );

    alert(
      `Erro ao avançar a fila: ${queueDeleteError.message}`
    );
    return;
  }

  setCurrentScore(0);
  setCurrentVotes(0);

  await loadData();
}

  async function clearQueue() {
    if (!authorized) {
      alert("Acesso negado.");
      return;
    }

    const confirmed = confirm("Tem certeza que deseja limpar toda a fila?");
    if (!confirmed) return;

    await supabase.from("queue").delete().eq("room_code", roomCode);
    loadData();
  }

  async function endEvent() {
    if (!authorized) {
      alert("Acesso negado.");
      return;
    }

    const confirmed = confirm("Tem certeza que deseja encerrar o evento?");
    if (!confirmed) return;

    setEndingEvent(true);

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (roomError || !room) {
      setEndingEvent(false);
      alert("Não foi possível localizar a sala.");
      return;
    }

    const currentEventId = room.current_event_id;

    if (!currentEventId) {
      setEndingEvent(false);
      alert("Esta sala não possui um evento ativo.");
      return;
    }

    const { data: performances } = await supabase
      .from("performances")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", currentEventId);

    const { data: votes } = await supabase
      .from("singer_votes")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", currentEventId);

    const validPerformances = performances || [];
    const validVotes = votes || [];

    if (validPerformances.length === 0 || validVotes.length === 0) {
      setEndingEvent(false);
      alert("Não há apresentações ou votos suficientes para encerrar o evento.");
      return;
    }

    const singerRankingMap: Record<string, any> = {};

    for (const performance of validPerformances) {
      const singerToken = performance.singer_token;
      if (!singerRankingMap[singerToken]) {
        singerRankingMap[singerToken] = {
          singer_token: singerToken,
          singer_name: performance.singer_name || "Desconhecido",
          total: 0,
          count: 0,
          presentations: 0,
        };
      }
      singerRankingMap[singerToken].presentations += 1;
    }

    for (const vote of validVotes) {
      const singerToken = vote.singer_token;
      if (!singerRankingMap[singerToken]) continue;
      singerRankingMap[singerToken].total += Number(vote.score);
      singerRankingMap[singerToken].count += 1;
    }

    const ranking = Object.values(singerRankingMap)
      .filter((item) => item.count > 0)
      .map((item) => ({
        ...item,
        average: item.total / item.count,
      }));

    const champions = ranking.filter((item) => item.presentations >= 3).sort((a, b) => b.average - a.average);
    const revelations = ranking.filter((item) => item.presentations < 3).sort((a, b) => b.average - a.average);

    const champion = champions[0] || null;
    const revelation = revelations[0] || null;

    const performanceRanking = validPerformances
      .map((performance) => {
        const performanceVotes = validVotes.filter((v) => v.performance_id === performance.id);
        if (performanceVotes.length === 0) return null;
        const total = performanceVotes.reduce((sum, v) => sum + Number(v.score), 0);
        return {
          performance_id: performance.id,
          singer_name: performance.singer_name,
          song_name: performance.song_name,
          average: total / performanceVotes.length,
          votes: performanceVotes.length,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.average - a.average);

    const bestSong = performanceRanking[0] || null;

    await supabase.from("hall_of_fame").insert({
      room_code: roomCode,
      event_id: currentEventId,
      champion_name: champion?.singer_name || null,
      champion_average: champion?.average || null,
      champion_presentations: champion?.presentations || 0,
      revelation_name: revelation?.singer_name || null,
      revelation_average: revelation?.average || null,
      revelation_presentations: revelation?.presentations || 0,
      best_song_name: bestSong?.song_name || null,
      best_song_singer: bestSong?.singer_name || null,
      best_song_average: bestSong?.average || null,
      total_presentations: validPerformances.length,
    });

    await supabase
      .from("events")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("id", currentEventId);

    await supabase.from("event_status").upsert({ room_code: roomCode, status: "awards" });
    await supabase.from("rooms").update({ status: "encerrada" }).eq("room_code", roomCode);
    await supabase.from("queue").delete().eq("room_code", roomCode);
    await supabase.from("current_singer").delete().eq("room_code", roomCode);

    setCurrentSinger(null);
    setCurrentScore(0);
    setCurrentVotes(0);
    setEventEnded(true);
    setEndingEvent(false);

    alert("Evento encerrado com sucesso!");
  }

  const estimatedMinutes = queue.length * 5;

  if (checkingAccess) {
    return <main className="min-h-screen flex items-center justify-center">Verificando acesso...</main>;
  }

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">🔒 Acesso Negado</h1>
          <p>Você não é proprietário desta sala.</p>
        </div>
      </main>
    );
  }

  return (
  <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">

    <div className="max-w-7xl mx-auto p-4 md:p-8">

      {/* Cabeçalho */}
      <header className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-7 mb-6 shadow-2xl backdrop-blur-xl">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

          <div>

            <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-full text-xs font-bold mb-3">

              <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" />

              PAINEL DO OPERADOR

            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">

              🎤 {roomName || "VIDEOKÊ"}

            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">

              <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300">

                Sala:{" "}
                <strong className="text-white">
                  {roomCode}
                </strong>

              </span>

              <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300">

                Votação:{" "}

                <strong className="text-white">

                  {votingMode === "thumbs"
                    ? "👍 Aprovação"
                    : "⭐ Estrelas"}

                </strong>

              </span>

              <span
                className={`border px-3 py-1 rounded-full font-bold ${
                  eventEnded
                    ? "bg-red-500/10 border-red-500/30 text-red-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >

                {eventEnded
                  ? "🔴 Evento encerrado"
                  : "🟢 Evento em andamento"}

              </span>

            </div>

          </div>

          <button
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
            className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 rounded-xl font-bold transition-all"
          >

            ← Voltar ao Dashboard

          </button>

        </div>

      </header>

      {/* Indicadores */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex justify-between items-start">

            <div>

              <p className="text-xs uppercase tracking-widest text-blue-300 font-bold">
                Na fila
              </p>

              <div className="text-4xl font-black mt-2">
                {queue.length}
              </div>

            </div>

            <div className="text-4xl">
              👥
            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3">

            Participantes aguardando

          </p>

        </div>

        <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 border border-orange-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex justify-between items-start">

            <div>

              <p className="text-xs uppercase tracking-widest text-orange-300 font-bold">
                Tempo estimado
              </p>

              <div className="text-4xl font-black mt-2">

                {estimatedMinutes}

                <span className="text-lg ml-1 text-slate-300">
                  min
                </span>

              </div>

            </div>

            <div className="text-4xl">
              ⏳
            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3">

            Aproximadamente 5 minutos por música

          </p>

        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-800/20 border border-yellow-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex justify-between items-start">

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-widest text-yellow-300 font-bold">
                Cantando agora
              </p>

              <div className="text-xl font-black mt-2 truncate">

                {currentSinger?.singer_name ||
                  "Aguardando"}

              </div>

            </div>

            <div className="text-4xl ml-3">
              🎤
            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3 truncate">

            {currentSinger?.song_name ||
              "Nenhuma música em execução"}

          </p>

        </div>

        <div className="bg-gradient-to-br from-fuchsia-600/20 to-purple-900/20 border border-fuchsia-500/20 rounded-2xl p-5 shadow-xl">

          <div className="flex justify-between items-start">

            <div>

              <p className="text-xs uppercase tracking-widest text-fuchsia-300 font-bold">
                Total de votos
              </p>

              <div className="text-4xl font-black mt-2">
                {currentVotes}
              </div>

            </div>

            <div className="text-4xl">
              ⭐
            </div>

          </div>

          <p className="text-sm text-slate-400 mt-3">

            Votos da apresentação atual

          </p>

        </div>

      </section>

      {/* Apresentação atual */}
      <section className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 text-black rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">

        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/20 rounded-full blur-3xl" />

        <div className="relative">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div className="min-w-0">

              <p className="text-sm font-black tracking-widest uppercase opacity-70 mb-2">

                🎤 Agora cantando

              </p>

              <h2 className="text-4xl md:text-6xl font-black truncate">

                {currentSinger?.singer_name ||
                  "Aguardando cantor"}

              </h2>

              <p className="text-xl md:text-2xl font-bold mt-2 truncate">

                🎵{" "}

                {currentSinger?.song_name ||
                  "Nenhuma música"}

              </p>

            </div>

            <div className="grid grid-cols-2 gap-3 min-w-full lg:min-w-[380px]">

              <div className="bg-white/85 backdrop-blur rounded-2xl p-5 text-center shadow-lg">

                <p className="text-xs font-black uppercase text-slate-600 mb-2">

                  {votingMode === "thumbs"
                    ? "Aprovação média"
                    : "Nota média"}

                </p>

                <div className="text-3xl md:text-4xl font-black">

                  {votingMode === "thumbs"
                    ? `👍 ${currentScore.toFixed(0)}%`
                    : `⭐ ${currentScore.toFixed(1)}`}

                </div>

              </div>

              <div className="bg-white/85 backdrop-blur rounded-2xl p-5 text-center shadow-lg">

                <p className="text-xs font-black uppercase text-slate-600 mb-2">
                  Votos
                </p>

                <div className="text-3xl md:text-4xl font-black">

                  👥 {currentVotes}

                </div>

              </div>

            </div>

          </div>

          {votingMode === "thumbs" &&
            currentVotes > 0 && (

            <div className="mt-5 bg-black/85 text-white p-4 rounded-2xl text-center text-lg font-bold">

              {getPerformanceMessage(
                currentScore
              )}

            </div>

          )}

        </div>

      </section>

      {/* Ações principais */}
      <section className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 mb-6 shadow-xl backdrop-blur">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>

            <h2 className="text-xl font-black">
              🎛️ Controle do Evento
            </h2>

            <p className="text-sm text-slate-400 mt-1">

              Gerencie o cantor atual, a fila e o encerramento da noite.

            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={nextSinger}
              disabled={
                queue.length === 0 ||
                eventEnded
              }
              className={`px-6 py-3 rounded-xl font-black transition-all shadow-lg ${
                queue.length === 0 ||
                eventEnded
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white hover:-translate-y-0.5"
              }`}
            >

              ▶️ Próximo Cantor

            </button>

            <button
              onClick={clearQueue}
              disabled={
                queue.length === 0 ||
                eventEnded
              }
              className={`px-6 py-3 rounded-xl font-black transition-all ${
                queue.length === 0 ||
                eventEnded
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
            >

              🧹 Limpar Fila

            </button>

            {!eventEnded && (

              <button
                onClick={endEvent}
                disabled={endingEvent}
                className={`px-6 py-3 rounded-xl font-black transition-all ${
                  endingEvent
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-purple-700 hover:bg-purple-600 text-white"
                }`}
              >

                {endingEvent
                  ? "⏳ Encerrando..."
                  : "🏆 Encerrar Evento"}

              </button>

            )}

          </div>

        </div>

      </section>

      {eventEnded && (

        <section className="bg-gradient-to-r from-purple-900 to-fuchsia-900 border border-purple-400/30 rounded-3xl p-8 mb-6 text-center shadow-2xl">

          <div className="text-6xl mb-4">
            🏆
          </div>

          <h2 className="text-3xl font-black mb-2">

            Evento Encerrado

          </h2>

          <p className="text-purple-100">

            A TV está exibindo a premiação da noite.

          </p>

          <button
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
            className="mt-5 bg-white text-purple-900 hover:bg-purple-100 px-6 py-3 rounded-xl font-black transition-colors"
          >

            Voltar ao Dashboard

          </button>

        </section>

      )}

      <div className="grid lg:grid-cols-5 gap-6">

        {/* Adicionar cantor */}
        <section className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">

          <div className="flex items-center gap-3 mb-6">

            <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-2xl">
              ➕
            </div>

            <div>

              <h2 className="text-xl font-black">
                Adicionar Cantor
              </h2>

              <p className="text-xs text-slate-400">
                Inclusão manual pelo operador
              </p>

            </div>

          </div>

          <label className="block text-sm font-bold text-slate-300 mb-2">

            Nome do cantor

          </label>

          <input
            type="text"
            value={newSinger}
            onChange={(e) =>
              setNewSinger(
                e.target.value
              )
            }
            disabled={eventEnded}
            placeholder="Digite o nome"
            className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 mb-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />

          <label className="block text-sm font-bold text-slate-300 mb-2">

            Música

          </label>

          <input
            type="text"
            value={newSong}
            onChange={(e) =>
              setNewSong(
                e.target.value
              )
            }
            disabled={eventEnded}
            placeholder="Digite o nome da música"
            className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 mb-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />

          <button
            onClick={addSinger}
            disabled={eventEnded}
            className={`w-full px-5 py-3.5 rounded-xl font-black transition-all ${
              eventEnded
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >

            Adicionar à Fila

          </button>

        </section>

        {/* Fila */}
        <section className="lg:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="text-2xl font-black">
                🎵 Fila de Cantores
              </h2>

              <p className="text-sm text-slate-400 mt-1">

                Ordem atual das apresentações

              </p>

            </div>

            <span className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-full font-black">

              {queue.length}

            </span>

          </div>

          {queue.length === 0 ? (

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center">

              <div className="text-5xl mb-4">
                🎙️
              </div>

              <h3 className="font-black text-lg">

                Fila vazia

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Os participantes adicionados aparecerão aqui.

              </p>

            </div>

          ) : (

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">

              {queue.map(
                (item, index) => (

                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border transition-colors ${
                      index === 0
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >

                    <div className="flex items-center gap-4 min-w-0">

                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black shrink-0 ${
                          index === 0
                            ? "bg-emerald-500 text-black"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >

                        {index + 1}

                      </div>

                      <div className="min-w-0">

                        <div className="font-black text-lg truncate">

                          {item.singer_name}

                        </div>

                        <div className="text-slate-400 truncate">

                          🎵 {item.song_name}

                        </div>

                        {index === 0 && (

                          <div className="text-xs font-bold text-emerald-300 mt-1">

                            PRÓXIMO A CANTAR

                          </div>

                        )}

                      </div>

                    </div>

                    <button
                      onClick={() =>
                        removeItem(
                          item.id
                        )
                      }
                      disabled={eventEnded}
                      className="bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                    >

                      Remover

                    </button>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </div>

    </div>

  </main>
);
}