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
  const [currentEventId, setCurrentEventId] =
    useState<string | null>(null);
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

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("singer_profile")
    .select("*")
    .eq("singer_token", token)
    .maybeSingle();

  if (profileError || !profile) {
    if (profileError) {
      console.error(
        "Erro ao carregar cantor:",
        profileError
      );
    }

    return;
  }

  setSingerName(profile.singer_name);
  setRoomCode(profile.room_code);

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select(
      "room_code, current_event_id, event_mode, voting_mode, status"
    )
    .eq("room_code", profile.room_code)
    .maybeSingle();

  if (roomError || !room) {
    console.error(
      "Erro ao carregar sala:",
      roomError
    );

    setCurrentEventId(null);
    setCurrentSinger(null);
    setPosition(null);
    return;
  }

  setEventMode(
    room.event_mode || "traditional"
  );

  setVotingMode(
    room.voting_mode || "stars"
  );

  const ended =
    room.status === "encerrada";

  setEventEnded(ended);

  if (
    ended ||
    !room.current_event_id
  ) {
    setCurrentEventId(null);
    setCurrentSinger(null);
    setPosition(null);
    setVoteScore(0);
    setVoteMessage("");
    return;
  }

  const eventId =
    room.current_event_id;

  setCurrentEventId(eventId);

  if (
    profile.event_id !==
    eventId
  ) {
    console.warn(
      "O perfil do cantor pertence a outro evento."
    );

    setCurrentSinger(null);
    setPosition(null);
    setVoteScore(0);
    setVoteMessage(
      "Sua participação pertence a um evento anterior."
    );
    return;
  }

  setNextSong(
    (currentValue) => {
      if (
        currentValue === "" &&
        profile.next_song
      ) {
        return profile.next_song;
      }

      return currentValue;
    }
  );

  const {
    data: queueData,
    error: queueError,
  } = await supabase
    .from("queue")
    .select("*")
    .eq(
      "room_code",
      profile.room_code
    )
    .eq(
      "event_id",
      eventId
    )
    .order("created_at", {
      ascending: true,
    });

  if (queueError) {
    console.error(
      "Erro ao carregar fila:",
      queueError
    );

    setPosition(null);
  } else {
    const queueItems =
      queueData || [];

    const index =
      queueItems.findIndex(
        (item: any) =>
          item.singer_token ===
          token
      );

    setPosition(
      index >= 0
        ? index + 1
        : null
    );
  }

  const {
    data: current,
    error: currentError,
  } = await supabase
    .from("current_singer")
    .select("*")
    .eq(
      "room_code",
      profile.room_code
    )
    .eq(
      "event_id",
      eventId
    )
    .maybeSingle();

  if (currentError) {
    console.error(
      "Erro ao carregar cantor atual:",
      currentError
    );

    setCurrentSinger(null);
    return;
  }

  setCurrentSinger(
    current || null
  );

  if (!current) {
    setVoteScore(0);
    setVoteMessage("");
  }
}

async function saveNextSong() {
  if (!currentEventId) {
    setMessage(
      "Esta sala não possui um evento ativo."
    );
    return;
  }

  const normalizedSong =
    nextSong.trim();

  if (!normalizedSong) {
    setMessage(
      "Informe o nome da próxima música."
    );
    return;
  }

  const { error } =
    await supabase
      .from("singer_profile")
      .update({
        next_song:
          normalizedSong,
      })
      .eq(
        "singer_token",
        token
      )
      .eq(
        "room_code",
        roomCode
      )
      .eq(
        "event_id",
        currentEventId
      );

  if (error) {
    console.error(
      "Erro ao salvar próxima música:",
      error
    );

    setMessage(error.message);
    return;
  }

  setMessage(
    "✅ Próxima música salva com sucesso!"
  );

  await loadSinger();
}

async function becomeJuror() {
  if (
    eventMode !== "interactive"
  ) {
    alert(
      "A troca de participação está disponível somente no modo interativo."
    );
    return;
  }

  if (!currentEventId) {
    alert(
      "Esta sala não possui um evento ativo."
    );
    return;
  }

  if (
    currentSinger?.singer_token ===
    token
  ) {
    alert(
      "Você está se apresentando neste momento."
    );
    return;
  }

  if (position === 1) {
    alert(
      "Você é o próximo da fila e não pode sair agora."
    );
    return;
  }

  const confirmed = confirm(
    "Você perderá sua posição na fila e passará a atuar como jurado. Deseja continuar?"
  );

  if (!confirmed) {
    return;
  }

  const voterToken =
    crypto.randomUUID();

  const {
    error: voterError,
  } = await supabase
    .from("voters")
    .insert({
      room_code:
        roomCode,

      event_id:
        currentEventId,

      voter_token:
        voterToken,

      voter_name:
        singerName,
    });

  if (voterError) {
    console.error(
      "Erro ao criar jurado:",
      voterError
    );

    alert(voterError.message);
    return;
  }

  const {
    error: queueError,
  } = await supabase
    .from("queue")
    .delete()
    .eq(
      "room_code",
      roomCode
    )
    .eq(
      "event_id",
      currentEventId
    )
    .eq(
      "singer_token",
      token
    );

  if (queueError) {
    console.error(
      "Erro ao remover cantor da fila:",
      queueError
    );

    alert(queueError.message);
    return;
  }

  const {
    error: profileError,
  } = await supabase
    .from("singer_profile")
    .delete()
    .eq(
      "singer_token",
      token
    )
    .eq(
      "room_code",
      roomCode
    )
    .eq(
      "event_id",
      currentEventId
    );

  if (profileError) {
    console.error(
      "Erro ao remover perfil do cantor:",
      profileError
    );

    alert(profileError.message);
    return;
  }

  window.location.href =
    `/jurado/${voterToken}`;
}

async function voteCurrentSinger() {
  setVoteMessage("");

  if (
    eventMode !== "interactive"
  ) {
    setVoteMessage(
      "A votação por cantores está disponível apenas no modo interativo."
    );
    return;
  }

  if (!currentEventId) {
    setVoteMessage(
      "Esta sala não possui um evento ativo."
    );
    return;
  }

  if (!currentSinger) {
    setVoteMessage(
      "Nenhum cantor está se apresentando."
    );
    return;
  }

  if (
    currentSinger.event_id !==
    currentEventId
  ) {
    setVoteMessage(
      "A apresentação não pertence ao evento atual."
    );

    await loadSinger();
    return;
  }

  if (
    currentSinger.singer_token ===
    token
  ) {
    setVoteMessage(
      "Você não pode votar na própria apresentação."
    );
    return;
  }

  if (
    votingMode === "stars" &&
    voteScore === 0
  ) {
    setVoteMessage(
      "Selecione uma nota."
    );
    return;
  }

  if (
    votingMode === "thumbs" &&
    voteScore !== 100 &&
    voteScore !== -1
  ) {
    setVoteMessage(
      "Escolha Bom ou Ruim."
    );
    return;
  }

  const {
    data: performance,
    error: performanceError,
  } = await supabase
    .from("performances")
    .select("*")
    .eq(
      "room_code",
      roomCode
    )
    .eq(
      "event_id",
      currentEventId
    )
    .eq(
      "singer_token",
      currentSinger.singer_token
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (
    performanceError ||
    !performance
  ) {
    console.error(
      "Erro ao localizar apresentação:",
      performanceError
    );

    setVoteMessage(
      "A apresentação atual ainda não foi registrada."
    );
    return;
  }

  const {
    data: existingVote,
    error: existingVoteError,
  } = await supabase
    .from("singer_votes")
    .select("id")
    .eq(
      "room_code",
      roomCode
    )
    .eq(
      "event_id",
      currentEventId
    )
    .eq(
      "performance_id",
      performance.id
    )
    .eq(
      "voter_token",
      token
    )
    .maybeSingle();

  if (existingVoteError) {
    console.error(
      "Erro ao verificar voto:",
      existingVoteError
    );

    setVoteMessage(
      "Não foi possível verificar seu voto."
    );
    return;
  }

  if (existingVote) {
    setVoteMessage(
      "Você já votou nesta apresentação."
    );
    return;
  }

  const finalScore =
    votingMode === "thumbs" &&
    voteScore === -1
      ? 0
      : voteScore;

  const { error } =
    await supabase
      .from("singer_votes")
      .insert({
        room_code:
          roomCode,

        event_id:
          currentEventId,

        performance_id:
          performance.id,

        singer_token:
          currentSinger.singer_token,

        voter_token:
          token,

        voter_type:
          "singer",

        score:
          finalScore,
      });

  if (error) {
    console.error(
      "Erro ao registrar voto:",
      error
    );

    if (error.code === "23505") {
      setVoteMessage(
        "Você já votou nesta apresentação."
      );
      return;
    }

    setVoteMessage(error.message);
    return;
  }

  setVoteMessage(
    "✅ Voto registrado com sucesso."
  );

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
  <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-black text-white p-4 md:p-8">

    <div className="max-w-3xl mx-auto">

      {/* Cabeçalho */}
      <header className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 mb-6 shadow-2xl">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>

            <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-full text-xs font-bold mb-3">

              <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" />

              ÁREA DO CANTOR

            </div>

            <h1 className="text-3xl md:text-5xl font-black">

              🎤 Olá, {singerName || "Cantor"}

            </h1>

            <p className="text-slate-400 mt-2">

              Acompanhe sua posição e participe do evento.

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

      {/* Apresentação atual */}
      <section className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 text-black rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">

        <div className="absolute -right-16 -top-16 w-52 h-52 bg-white/30 rounded-full blur-3xl" />

        <div className="relative">

          <p className="text-xs font-black uppercase tracking-widest opacity-70">

            🎤 Cantando agora

          </p>

          <h2 className="text-4xl md:text-5xl font-black mt-2 break-words">

            {currentSinger?.singer_name ||
              "Aguardando cantor"}

          </h2>

          <p className="text-xl font-bold mt-2">

            🎵{" "}

            {currentSinger?.song_name ||
              "Nenhuma música em execução"}

          </p>

          {currentSinger?.singer_token === token && (

            <div className="mt-5 bg-black/85 text-white rounded-2xl p-4 text-center">

              <p className="text-xl font-black">
                🌟 O palco é seu!
              </p>

              <p className="text-sm text-slate-200 mt-1">
                Faça uma ótima apresentação.
              </p>

            </div>

          )}

        </div>

      </section>

      {/* Posição na fila */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center shadow-xl">

          <div className="text-3xl mb-2">
            📍
          </div>

          <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
            Sua posição
          </p>

          <p className="text-4xl font-black mt-2 text-fuchsia-300">

            {position ?? "-"}

          </p>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center shadow-xl">

          <div className="text-3xl mb-2">
            👥
          </div>

          <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
            Cantores à frente
          </p>

          <p className="text-4xl font-black mt-2 text-blue-300">

            {singersAhead}

          </p>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center shadow-xl">

          <div className="text-3xl mb-2">
            ⏳
          </div>

          <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
            Tempo estimado
          </p>

          <p className="text-4xl font-black mt-2 text-orange-300">

            {estimatedMinutes}

            <span className="text-base ml-1">
              min
            </span>

          </p>

        </div>

      </section>

      {/* Alertas de aproximação */}
      {position === 4 && (

        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-2xl p-5 mb-6">

          <p className="font-black">
            🟡 Sua vez está se aproximando.
          </p>

          <p className="text-sm mt-1">
            Fique atento à fila e prepare sua música.
          </p>

        </div>

      )}

      {position === 3 && (

        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-2xl p-5 mb-6">

          <p className="font-black">
            🟡 Faltam apenas dois cantores.
          </p>

          <p className="text-sm mt-1">
            Comece a se preparar para sua apresentação.
          </p>

        </div>

      )}

      {position === 2 && (

        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-200 rounded-2xl p-5 mb-6">

          <p className="font-black text-lg">
            🟠 Prepare-se! Você é o próximo.
          </p>

          <p className="text-sm mt-1">
            Dirija-se ao local de apresentação.
          </p>

        </div>

      )}

      {position === 1 && (

        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-2xl p-6 mb-6 text-center shadow-xl">

          <div className="text-5xl mb-3">
            🎤
          </div>

          <p className="font-black text-2xl">
            É sua vez de cantar!
          </p>

          <p className="mt-2">
            Prepare-se para subir ao palco.
          </p>

        </div>

      )}

      {/* Próxima música */}
      <section className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-6 mb-6 shadow-xl">

        <div className="flex items-center gap-4 mb-6">

          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-3xl">

            🎵

          </div>

          <div>

            <h2 className="text-2xl font-black">

              Próxima Música

            </h2>

            <p className="text-sm text-slate-400 mt-1">

              Sua próxima participação já está reservada.

            </p>

          </div>

        </div>

        <label className="block text-sm font-bold text-slate-300 mb-2">

          Qual será sua próxima música?

        </label>

        <input
          type="text"
          value={nextSong}
          onChange={(e) =>
            setNextSong(
              e.target.value
            )
          }
          placeholder="Digite o nome da próxima música"
          className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full mb-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        <div className="flex flex-col sm:flex-row gap-3">

          <button
            onClick={saveNextSong}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-black transition-all"
          >

            💾 Salvar Próxima Música

          </button>

          {eventMode === "interactive" && (

            <button
              onClick={becomeJuror}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-3 rounded-xl font-black transition-all"
            >

              ⭐ Virar Jurado

            </button>

          )}

        </div>

        {message && (

          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-4 font-bold">

            {message}

          </div>

        )}

      </section>

      {/* Votação interativa */}
      {eventMode === "interactive" && (

        <section className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-6 mb-6 shadow-xl">

          <div className="flex items-center gap-4 mb-6">

            <div className="w-14 h-14 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl flex items-center justify-center text-3xl">

              ⭐

            </div>

            <div>

              <h2 className="text-2xl font-black">

                Votação Interativa

              </h2>

              <p className="text-sm text-slate-400 mt-1">

                Participe avaliando as outras apresentações.

              </p>

            </div>

          </div>

          {!currentSinger && (

            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">

              <div className="text-4xl mb-3">
                ⏳
              </div>

              <p className="font-black text-lg">

                Aguardando uma apresentação

              </p>

              <p className="text-slate-400 mt-2">

                A votação será liberada quando o operador chamar um cantor.

              </p>

            </div>

          )}

          {currentSinger &&
            currentSinger.singer_token === token && (

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center text-yellow-100">

              <div className="text-4xl mb-3">
                🎤
              </div>

              <p className="font-black text-lg">

                Você está se apresentando agora

              </p>

              <p className="mt-2 text-yellow-200">

                Você não pode avaliar a própria apresentação.

              </p>

            </div>

          )}

          {currentSinger &&
            currentSinger.singer_token !== token && (

            <div>

              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5">

                <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">

                  Avaliando agora

                </p>

                <p className="text-2xl font-black mt-2">

                  🎤 {currentSinger.singer_name}

                </p>

                <p className="text-slate-400 mt-1">

                  🎵 {currentSinger.song_name}

                </p>

              </div>

              {votingMode === "thumbs" ? (

                <div className="grid grid-cols-2 gap-4 mb-5">

                  <button
                    onClick={() => {
                      setVoteScore(100);
                      setVoteMessage("");
                    }}
                    className={`p-5 rounded-2xl text-xl font-black transition-all ${
                      voteScore === 100
                        ? "bg-emerald-500 text-black ring-4 ring-emerald-300/30"
                        : "bg-slate-800 border border-slate-700 hover:border-emerald-500"
                    }`}
                  >

                    👍 Bom

                  </button>

                  <button
                    onClick={() => {
                      setVoteScore(-1);
                      setVoteMessage("");
                    }}
                    className={`p-5 rounded-2xl text-xl font-black transition-all ${
                      voteScore === -1
                        ? "bg-red-500 text-white ring-4 ring-red-300/30"
                        : "bg-slate-800 border border-slate-700 hover:border-red-500"
                    }`}
                  >

                    👎 Ruim

                  </button>

                </div>

              ) : (

                <div className="grid grid-cols-5 gap-2 mb-5">

                  {[1, 2, 3, 4, 5].map(
                    (value) => (

                      <button
                        key={value}
                        onClick={() => {
                          setVoteScore(value);
                          setVoteMessage("");
                        }}
                        className={`p-3 md:p-4 rounded-xl text-xl transition-all ${
                          voteScore === value
                            ? "bg-yellow-500 text-black ring-4 ring-yellow-300/30"
                            : "bg-slate-800 border border-slate-700 hover:border-yellow-500"
                        }`}
                      >

                        ⭐

                      </button>

                    )
                  )}

                </div>

              )}

              <button
                onClick={voteCurrentSinger}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-4 rounded-xl font-black transition-all"
              >

                ✅ Enviar Voto

              </button>

              {voteMessage && (

                <div className="mt-4 bg-slate-900 border border-slate-700 rounded-xl p-4 font-bold text-center">

                  {voteMessage}

                </div>

              )}

            </div>

          )}

        </section>

      )}

      <footer className="text-center text-xs text-slate-500 py-4">

        Fila Videokê • Acompanhe sua posição em tempo real

      </footer>

    </div>

  </main>
);
}