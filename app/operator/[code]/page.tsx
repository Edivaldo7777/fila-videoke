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
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const [authorized, setAuthorized] =
    useState(false);

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  const [newSinger, setNewSinger] = useState("");
  const [newSong, setNewSong] = useState("");

  const [currentSinger, setCurrentSinger] =
    useState<any>(null);
  const [currentScore, setCurrentScore] =
    useState(0);

  const [currentVotes, setCurrentVotes] =
    useState(0);
  
  const [eventEnded, setEventEnded] =
    useState(false);

  const [endingEvent, setEndingEvent] =
    useState(false);

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

    const { data: room } =
      await supabase
        .from("rooms")
        .select("*")
        .eq(
          "room_code",
          roomCode
        )
        .single();

    if (!room) {
      setCheckingAccess(false);
      return;
    }

    if (
      user.role === "admin" ||
      room.owner_id === user.id
    ) {

      setAuthorized(true);

      await loadData();

      timer = setInterval(
        loadData,
        5000
      );

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

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select("*")
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
      "Erro ao carregar sala:",
      roomError
    );
    return;
  }

  setRoomName(
    room.room_name
  );

  const eventId =
    room.current_event_id;

  const {
    data: queueData,
    error: queueError,
  } = await supabase
    .from("queue")
    .select("*")
    .eq(
      "room_code",
      roomCode
    )
    .order("created_at");

  if (queueError) {
    console.error(
      "Erro ao carregar fila:",
      queueError
    );
  }

  let current = null;

  if (eventId) {

    const {
      data: currentData,
      error: currentError,
    } = await supabase
      .from("current_singer")
      .select("*")
      .eq(
        "room_code",
        roomCode
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
    }

    current =
      currentData || null;
  }

  setCurrentSinger(
    current
  );

  setQueue(
    queueData || []
  );

  if (
    current?.singer_token
  ) {
    await loadVotes(
      current.singer_token
    );
  } else {
    setCurrentScore(0);
    setCurrentVotes(0);
  }
}
  async function loadVotes(
  singerToken: string
) {

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select(
      "current_event_id"
    )
    .eq(
      "room_code",
      roomCode
    )
    .single();

  if (
    roomError ||
    !room?.current_event_id
  ) {
    setCurrentScore(0);
    setCurrentVotes(0);
    return;
  }

  const {
    data: performance,
    error: performanceError,
  } = await supabase
    .from("performances")
    .select(
      "id"
    )
    .eq(
      "room_code",
      roomCode
    )
    .eq(
      "event_id",
      room.current_event_id
    )
    .eq(
      "singer_token",
      singerToken
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (
    performanceError ||
    !performance
  ) {
    setCurrentScore(0);
    setCurrentVotes(0);
    return;
  }

  const {
    data: votes,
    error: votesError,
  } = await supabase
    .from("singer_votes")
    .select("*")
    .eq(
      "room_code",
      roomCode
    )
    .eq(
      "event_id",
      room.current_event_id
    )
    .eq(
      "performance_id",
      performance.id
    );

  if (
    votesError ||
    !votes ||
    votes.length === 0
  ) {
    setCurrentScore(0);
    setCurrentVotes(0);
    return;
  }

  const total = votes.reduce(
    (sum, vote) =>
      sum + Number(vote.score),
    0
  );

  setCurrentVotes(
    votes.length
  );

  setCurrentScore(
    total / votes.length
  );
}
  async function addSinger() {

  if (!authorized) {
    alert("Acesso negado.");
    return;
  }

  if (
    !newSinger.trim() ||
    !newSong.trim()
  ) {
    alert(
      "Informe o nome do cantor e a música."
    );
    return;
  }

  const token =
    crypto.randomUUID();

  await supabase
    .from("singer_profile")
    .insert({
      singer_token: token,
      singer_name: newSinger,
      room_code: roomCode,
      participant_type: "singer",
      next_song:
        "Escolherá na hora de cantar",
    });

  await supabase
    .from("queue")
    .insert({
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

  await supabase
    .from("queue")
    .delete()
    .eq("id", id);

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
      "room_code, current_event_id"
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
      "Não foi possível localizar a sala."
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
    data: performance,
    error: performanceError,
  } = await supabase
    .from("performances")
    .insert({
      room_code: roomCode,
      event_id:
        room.current_event_id,
      singer_token:
        singer.singer_token,
      singer_name:
        singer.singer_name,
      song_name:
        singer.song_name,
    })
    .select()
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
      performanceError?.message ||
      "Erro ao registrar apresentação."
    );
    return;
  }

  const {
    error: currentSingerError,
  } = await supabase
    .from("current_singer")
    .upsert({
      room_code: roomCode,
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
      "Erro ao atualizar cantor atual:",
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
      currentSingerError.message
    );
    return;
  }

  const {
    data: profile,
  } = await supabase
    .from("singer_profile")
    .select("*")
    .eq(
      "singer_token",
*     singer.singer_token
    )
   *.maybeSingle();

  let nextSong =
*   "Escolherá na hora de cantar";
*  if (
    profile?.next_song &&
 *  profile.next_song.trim() !== ""
* ) {
    nextSong =
      profile.*ext_song;
  }

  const {
    error* newQueueError,
  } = await supaba*e
    .from("queue")
    .insert({*      room_code: roomCode,
      s*nger_name:
        singer.singer_n*me,
      song_name: nextSong,
   *  singer_token:
        singer.sin*er_token,
    });

  if (newQueueE*ror) {
    console.error(
      "E*ro ao recolocar cantor:",
      ne*QueueError
    );

    alert(
    * newQueueError.message
    );
    *eturn;
  }

  await supabase
    .*rom("singer_profile")
    .update(*
      next_song:
        "Escolhe*á na hora de cantar",
    })
    .*q(
      "singer_token",
      sin*er.singer_token
    );

  const {
*   error: removeQueueError,
  } = *wait supabase
    .from("queue")
 *  .delete()
    .eq(
      "id",
 *    singer.id
    );

  if (remove*ueueError) {
    console.error(
  *   "Erro ao remover posição anterior:",
      removeQueueError
    );

    alert(
      removeQueueError.message
    );
    return;
  }

  await loadData();
}

  async function clearQueue() {

    if (!authorized) {
       alert("Acesso negado.");
    return;
    }
    const confirmed = confirm(
      "Tem certeza que deseja limpar toda a fila?"
    );

    if (!confirmed) return;

    await supabase
      .from("queue")
      .delete()
      .eq("room_code", roomCode);

    loadData();
  }

  async function endEvent() {

  if (!authorized) {
    alert("Acesso negado.");
    return;
  }

  const confirmed = confirm(
    "Tem certeza que deseja encerrar o evento?"
  );

  if (!confirmed) return;

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select("*")
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
      "Não foi possível localizar a sala."
    );
    return;
  }

  const currentEventId =
    room.current_event_id;

  if (!currentEventId) {
    alert(
      "Esta sala não possui um evento ativo."
    );
    return;
  }

  const {
    data: performances,
    error: performancesError,
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
    );

  if (performancesError) {
    console.error(
      "Erro nas apresentações:",
      performancesError
    );

    alert(
      performancesError.message
    );
    return;
  }

  const {
    data: votes,
    error: votesError,
  } = await supabase
    .from("singer_votes")
    .select("*")
    .eq(
      "room_code",
      roomCode
    )
    .eq(
      "event_id",
      currentEventId
    );

  if (votesError) {
    console.error(
      "Erro nos votos:",
      votesError
    );

    alert(
      votesError.message
    );
    return;
  }

  const validPerformances =
    performances || [];

  const validVotes =
    votes || [];

  if (
    validPerformances.length === 0
  ) {
    alert(
      "Nenhuma apresentação foi registrada neste evento."
    );
    return;
  }

  if (validVotes.length === 0) {
    alert(
      "Nenhum voto foi registrado neste evento."
    );
    return;
  }

  const singerRankingMap: Record<
    string,
    {
      singer_token: string;
      singer_name: string;
      total: number;
      count: number;
      presentations: number;
    }
  > = {};

  for (
    const performance
    of validPerformances
  ) {

    const singerToken =
      performance.singer_token;

    if (
      !singerRankingMap[
        singerToken
      ]
    ) {
      singerRankingMap[
        singerToken
      ] = {
        singer_token:
          singerToken,
        singer_name:
          performance.singer_name ||
          "Desconhecido",
        total: 0,
        count: 0,
        presentations: 0,
      };
    }

    singerRankingMap[
      singerToken
    ].presentations += 1;
  }

  for (
    const vote
    of validVotes
  ) {

    const singerToken =
      vote.singer_token;

    if (
      !singerRankingMap[
        singerToken
      ]
    ) {
      continue;
    }

    singerRankingMap[
      singerToken
    ].total +=
      Number(vote.score);

    singerRankingMap[
      singerToken
    ].count += 1;
  }

  const ranking =
    Object.values(
      singerRankingMap
    )
      .filter(
        (item) =>
          item.count > 0
      )
      .map(
        (item) => ({
          ...item,

          average:
            item.total /
            item.count,
        })
      );

  const champions =
    ranking
      .filter(
        (item) =>
          item.presentations >= 3
      )
      .sort(
        (a, b) =>
          b.average -
          a.average
      );

  const revelations =
    ranking
      .filter(
        (item) =>
          item.presentations < 3
      )
      .sort(
        (a, b) =>
          b.average -
          a.average
      );

  const champion =
    champions[0] || null;

  const revelation =
    revelations[0] || null;

  const performanceRanking =
    validPerformances
      .map(
        (performance) => {

          const performanceVotes =
            validVotes.filter(
              (vote) =>
                vote.performance_id ===
                performance.id
            );

          if (
            performanceVotes.length === 0
          ) {
            return null;
          }

          const total =
            performanceVotes.reduce(
              (sum, vote) =>
                sum +
                Number(
                  vote.score
                ),
              0
            );

          return {
            performance_id:
              performance.id,

            singer_name:
              performance.singer_name,

            song_name:
              performance.song_name,

            average:
              total /
              performanceVotes.length,

            votes:
              performanceVotes.length,
          };
        }
      )
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > => item !== null
      )
      .sort(
        (a, b) =>
          b.average -
          a.average
      );

  const bestSong =
    performanceRanking[0] ||
    null;

  const {
    error: hallError,
  } = await supabase
    .from("hall_of_fame")
    .insert({
      room_code: roomCode,

      event_id:
        currentEventId,

      champion_name:
        champion?.singer_name ||
        null,

      champion_average:
        champion?.average ||
        null,

      champion_presentations:
        champion?.presentations ||
        0,

      revelation_name:
        revelation?.singer_name ||
        null,

      revelation_average:
        revelation?.average ||
        null,

      revelation_presentations:
        revelation?.presentations ||
        0,

      best_song_name:
        bestSong?.song_name ||
        null,

      best_song_singer:
        bestSong?.singer_name ||
        null,

      best_song_average:
        bestSong?.average ||
        null,

      total_presentations:
        validPerformances.length,
    });

  if (hallError) {
    console.error(
      "Erro no Hall da Fama:",
      hallError
    );

    alert(
      hallError.message
    );
    return;
  }

  const {
    error: eventError,
  } = await supabase
    .from("events")
    .update({
      status: "finished",
      ended_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      currentEventId
    )
    .eq(
      "room_code",
      roomCode
    );

  if (eventError) {
    console.error(
      "Erro ao encerrar evento:",
      eventError
    );

    alert(
      eventError.message
    );
    return;
  }

  await supabase
    .from("event_status")
    .upsert({
      room_code: roomCode,
      status: "awards",
    });

  const {
    error: roomStatusError,
  } = await supabase
    .from("rooms")
    .update({
      status: "encerrada",
    })
    .eq(
      "room_code",
      roomCode
    );

  if (roomStatusError) {
    console.error(
      "Erro ao encerrar sala:",
      roomStatusError
    );

    alert(
      roomStatusError.message
    );
    return;
  }

  await supabase
    .from("queue")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  await supabase
    .from("current_singer")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  setCurrentSinger(null);
  setCurrentScore(0);
  setCurrentVotes(0);

  await loadData();

  let awardMessage =
    "🏆 PREMIAÇÃO DA NOITE\n\n";

  if (champion) {
    awardMessage +=
      `👑 Campeão da Noite\n` +
      `${champion.singer_name}\n` +
      `⭐ ${champion.average.toFixed(2)}\n` +
      `🎤 ${champion.presentations} apresentação(ões)\n\n`;
  }

  if (revelation) {
    awardMessage +=
      `⭐ Revelação da Noite\n` +
      `${revelation.singer_name}\n` +
      `⭐ ${revelation.average.toFixed(2)}\n` +
      `🎤 ${revelation.presentations} apresentação(ões)\n\n`;
  }

  if (bestSong) {
    awardMessage +=
      `🎵 Melhor Música da Noite\n` +
      `${bestSong.song_name}\n` +
      `${bestSong.singer_name}\n` +
      `⭐ ${bestSong.average.toFixed(2)}\n`;
  }

  setEventEnded(true);
setEndingEvent(false);

alert(
  awardMessage
);

alert(
  "Evento encerrado com sucesso. A TV continuará exibindo a premiação."
);

window.setTimeout(() => {

  window.location.href =
    "/dashboard";

}, 1500);
}

  const estimatedMinutes =
    queue.length * 5;
  
  if (checkingAccess) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      Verificando acesso...
    </main>
  );
}

if (!authorized) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          🔒 Acesso Negado
        </h1>

        <p>
          Você não é proprietário desta sala.
        </p>
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">

      <h1 className="text-5xl font-black mb-2">
        🎤 {roomName || "VIDEOKÊ"}
      </h1>

      <p className="text-slate-400 mb-8">
        Código da Sala: {roomCode}
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-6">

        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <div className="text-4xl">👥</div>
          <div className="text-3xl font-bold">
            {queue.length}
          </div>
          <p className="text-slate-400">
            Na fila
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <div className="text-4xl">⏳</div>
          <div className="text-3xl font-bold">
            {estimatedMinutes}
          </div>
          <p className="text-slate-400">
            Minutos
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <div className="text-4xl">🎤</div>
          <div className="font-bold text-lg">
            {currentSinger?.singer_name ||
              "Aguardando"}
          </div>
          <p className="text-slate-400">
            Cantando Agora
          </p>
        </div>

      </div>

      <div className="bg-yellow-400 text-black rounded-xl p-6 mb-6">

  <h2 className="text-2xl font-black mb-2">
    🎤 AGORA CANTANDO
  </h2>

  <div className="text-4xl font-black">
    {currentSinger?.singer_name ||
      "Aguardando"}
  </div>

  <div className="text-xl mt-2">
    🎵{" "}
    {currentSinger?.song_name ||
      "Nenhuma música"}
  </div>

  <div className="grid grid-cols-2 gap-4 mt-5">

    <div className="bg-white rounded p-4 text-center">

      <div className="text-sm">
        Nota Média
      </div>

      <div className="text-3xl font-black">
        ⭐ {currentScore.toFixed(1)}
      </div>

    </div>

    <div className="bg-white rounded p-4 text-center">

      <div className="text-sm">
        Total de Votos
      </div>

      <div className="text-3xl font-black">
        👥 {currentVotes}
      </div>

    </div>

  </div>

</div>

      <div className="bg-slate-800 rounded-xl p-6 mb-6">

        <h2 className="text-2xl font-bold mb-4">
          ➕ Adicionar Cantor
        </h2>

        <input
          type="text"
          value={newSinger}
          onChange={(e) =>
            setNewSinger(e.target.value)
          }
          placeholder="Nome do cantor"
          className="w-full p-3 rounded bg-slate-700 mb-3"
        />

        <input
          type="text"
          value={newSong}
          onChange={(e) =>
            setNewSong(e.target.value)
          }
          placeholder="Nome da música"
          className="w-full p-3 rounded bg-slate-700 mb-3"
        />

        <button
          onClick={addSinger}
          className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded"
        >
          Adicionar à Fila
        </button>

      </div>

      <div className="flex flex-wrap gap-3 mb-6">

        <button
          onClick={nextSinger}
          className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded"
        >
          Próximo Cantor
        </button>

        <button
          onClick={clearQueue}
          className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded"
        >
          Limpar Fila
        </button>

        {!eventEnded && (

  <button
    onClick={endEvent}
    disabled={endingEvent}
    className={`px-5 py-3 rounded ${
      endingEvent
        ? "bg-slate-600 cursor-not-allowed"
        : "bg-purple-700 hover:bg-purple-800"
    }`}
  >
    {endingEvent
      ? "⏳ Encerrando..."
      : "🔚 Encerrar Evento"}
  </button>

)}

      </div>
     {eventEnded && (

  <div className="bg-purple-900 border border-purple-500 rounded-xl p-6 mb-6 text-center">

    <h2 className="text-2xl font-black mb-2">
      🏆 Evento Encerrado
    </h2>

    <p className="text-purple-100">
      A TV está exibindo a premiação da noite.
    </p>

    <button
      onClick={() => {
        window.location.href =
          "/dashboard";
      }}
      className="mt-4 bg-white text-purple-900 px-5 py-3 rounded font-bold"
    >
      Voltar ao Dashboard
    </button>

  </div>

)}
      <div className="space-y-3">

        {queue.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-6">
            Nenhum participante na fila.
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              className="bg-slate-800 rounded-xl p-4 flex justify-between items-center"
            >
              <div>
                <div className="text-lg font-bold">
                  #{index + 1}{" "}
                  {item.singer_name}
                </div>

                <div className="text-slate-400">
                  🎵 {item.song_name}
                </div>
              </div>

              <button
                onClick={() =>
                  removeItem(item.id)
                }
                className="bg-red-500 px-3 py-2 rounded"
              >
                Remover
              </button>

            </div>
          ))
        )}

      </div>

    </main>
  );
}