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

  const [newSinger, setNewSinger] = useState("");
  const [newSong, setNewSong] = useState("");

  const [currentSinger, setCurrentSinger] =
    useState<any>(null);
  const [currentScore, setCurrentScore] =
    useState(0);

  const [currentVotes, setCurrentVotes] =
    useState(0);

  useEffect(() => {
    async function init() {
      const room = await params;
      setRoomCode(room.code);
    }

    init();
  }, [params]);

  useEffect(() => {
    if (!roomCode) return;

    loadData();

    const timer = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(timer);
  }, [roomCode]);

  async function loadData() {
    const { data: queueData } =
      await supabase
        .from("queue")
        .select("*")
        .eq("room_code", roomCode)
        .order("created_at");

    const { data: current } =
  await supabase
    .from("current_singer")
    .select("*")
    .eq("room_code", roomCode)
    .single();

    const { data: room } =
      await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

    if (room) {
      setRoomName(room.room_name);
    }

    setCurrentSinger(current);
setQueue(queueData || []);

if (current?.singer_token) {
  await loadVotes(
    current.singer_token
  );
}
  }
  async function loadVotes(
  singerToken: string
) {
  const { data: votes } =
    await supabase
      .from("singer_votes")
      .select("*")
      .eq(
        "singer_token",
        singerToken
      );

  if (!votes || votes.length === 0) {
    setCurrentScore(0);
    setCurrentVotes(0);
    return;
  }

  const total = votes.reduce(
    (sum, vote) =>
      sum + Number(vote.score),
    0
  );

  setCurrentVotes(votes.length);

  setCurrentScore(
    total / votes.length
  );
}
  async function addSinger() {
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
    await supabase
      .from("queue")
      .delete()
      .eq("id", id);

    loadData();
  }

  async function nextSinger() {
    if (queue.length === 0) return;

    const singer = queue[0];

    await supabase
  .from("current_singer")
  .upsert({
    room_code: roomCode,
    singer_name: singer.singer_name,
    song_name: singer.song_name,
    singer_token: singer.singer_token,
  });

    // NOVO:
    // registra uma apresentação
    const { error: performanceError } =
  await supabase
    .from("performances")
    .insert({
      room_code: roomCode,
      singer_token:
        singer.singer_token,
      singer_name:
        singer.singer_name,
      song_name:
        singer.song_name,
    });

if (performanceError) {
  console.error(
    "Erro performances:",
    performanceError
  );

  alert(
    `Erro ao registrar performance: ${performanceError.message}`
  );
}

    const { data: profile } =
      await supabase
        .from("singer_profile")
        .select("*")
        .eq(
          "singer_token",
          singer.singer_token
        )
        .single();

    let nextSong =
      "Escolherá na hora de cantar";

    if (
      profile?.next_song &&
      profile.next_song.trim() !== ""
    ) {
      nextSong = profile.next_song;
    }

    await supabase
      .from("queue")
      .insert({
        room_code: roomCode,
        singer_name:
          singer.singer_name,
        song_name: nextSong,
        singer_token:
          singer.singer_token,
      });

    await supabase
      .from("singer_profile")
      .update({
        next_song:
          "Escolherá na hora de cantar",
      })
      .eq(
        "singer_token",
        singer.singer_token
      );

    await supabase
      .from("queue")
      .delete()
      .eq("id", singer.id);

    loadData();
  }

  async function clearQueue() {
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
  const confirmed = confirm(
    "Tem certeza que deseja encerrar o evento?"
  );

  if (!confirmed) return;

  const { data: votes } =
    await supabase
      .from("singer_votes")
      .select("*");

  const { data: performances } =
    await supabase
      .from("performances")
      .select("*");

  if (votes && votes.length > 0) {
    const rankingMap: any = {};

    votes.forEach((vote: any) => {
      if (!rankingMap[vote.singer_token]) {
        rankingMap[vote.singer_token] = {
          singer_token: vote.singer_token,
          total: 0,
          count: 0,
          presentations: 0,
        };
      }

      rankingMap[vote.singer_token].total +=
        Number(vote.score);

      rankingMap[vote.singer_token].count += 1;
    });

    if (performances) {
      performances.forEach(
        (performance: any) => {
          if (
            rankingMap[
              performance.singer_token
            ]
          ) {
            rankingMap[
              performance.singer_token
            ].presentations += 1;
          }
        }
      );
    }

    const ranking = await Promise.all(
      Object.values(rankingMap).map(
        async (item: any) => {
          const { data: singer } =
            await supabase
              .from("singer_profile")
              .select("*")
              .eq(
                "singer_token",
                item.singer_token
              )
              .single();

          return {
            singer_name:
              singer?.singer_name ||
              "Desconhecido",

            average:
              item.total /
              item.count,

            presentations:
              item.presentations,
          };
        }
      )
    );

    const champions = ranking
      .filter(
        (item) =>
          item.presentations >= 3
      )
      .sort(
        (a, b) =>
          b.average - a.average
      );

    const revelations = ranking
      .filter(
        (item) =>
          item.presentations < 3
      )
      .sort(
        (a, b) =>
          b.average - a.average
      );

    const champion =
      champions.length > 0
        ? champions[0]
        : null;

    const revelation =
      revelations.length > 0
        ? revelations[0]
        : null;

    let bestSongName = null;
let bestSongSinger = null;
let bestSongAverage = null;

const { data: performancesData } =
  await supabase
    .from("performances")
    .select("*");

if (
  performancesData &&
  performancesData.length > 0
) {
  const performanceRanking =
    performancesData.map(
      (performance: any) => {
        const singerData =
          ranking.find(
            (item: any) =>
              item.singer_name ===
              performance.singer_name
          );

        return {
          singer_name:
            performance.singer_name,

          song_name:
            performance.song_name,

          average:
            singerData?.average || 0,
        };
      }
    );

  performanceRanking.sort(
    (a: any, b: any) =>
      b.average - a.average
  );

  if (performanceRanking[0]) {
    bestSongName =
      performanceRanking[0].song_name;

    bestSongSinger =
      performanceRanking[0].singer_name;

    bestSongAverage =
      performanceRanking[0].average;
  }
}

await supabase
  .from("hall_of_fame")
  .insert({
    room_code: roomCode,

    champion_name:
      champion?.singer_name ||
      null,

    champion_average:
      champion?.average || null,

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
      bestSongName,

    best_song_singer:
      bestSongSinger,

    best_song_average:
      bestSongAverage,

    total_presentations:
      champion?.presentations ||
      0,
  });

    let message =
      "🏆 PREMIAÇÃO DA NOITE\n\n";

    if (champion) {
      message +=
        `👑 Campeão da Noite\n` +
        `${champion.singer_name}\n` +
        `⭐ ${champion.average.toFixed(
          2
        )}\n` +
        `🎤 ${champion.presentations} apresentações\n\n`;
    }

    if (revelation) {
  message +=
    `⭐ Revelação da Noite\n` +
    `${revelation.singer_name}\n` +
    `⭐ ${revelation.average.toFixed(
      2
    )}\n` +
    `🎤 ${revelation.presentations} apresentações\n\n`;
}

if (bestSongName) {
  message +=
    `🎵 Melhor Música da Noite\n` +
    `${bestSongName}\n` +
    `${bestSongSinger}\n` +
    `⭐ ${Number(
      bestSongAverage
    ).toFixed(2)}`;
}

    alert(message);

await supabase
  .from("event_status")
  .upsert({
    room_code: roomCode,
    status: "awards",
  });
  const { data: roomBefore } =
  await supabase
    .from("rooms")
    .select("*")
    .eq(
      "room_code",
      roomCode
    )
    .single();

console.log(
  "ANTES:",
  roomBefore
);

const { data: roomUpdated, error: roomError } =
  await supabase
    .from("rooms")
    .update({
      status: "encerrada",
    })
    .eq(
      "room_code",
      roomCode.trim()
    )
    .select();

console.log(
  "ROOM CODE:",
  roomCode
);

console.log(
  "ROOM UPDATED:",
  roomUpdated
);

console.log(
  "ROOM ERROR:",
  roomError
);

console.log(
  "DEPOIS:",
  roomUpdated
);

console.log(
  "ERRO:",
  roomError
);

if (roomError) {
  alert(
    `Erro status sala: ${roomError.message}`
  );
}

const { error: roomStatusError } =
  await supabase
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
    roomStatusError
  );

  alert(
    `Erro ao atualizar status da sala: ${roomStatusError.message}`
  );
  }
  }

  await supabase
    .from("queue")
    .delete()
    .eq("room_code", roomCode);

  await supabase
    .from("current_singer")
    .delete()
    .eq("room_code", roomCode);

  setCurrentSinger(null);

  loadData();

  alert(
    "Evento encerrado com sucesso."
  );
}

  const estimatedMinutes =
    queue.length * 5;

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

        <button
          onClick={endEvent}
          className="bg-purple-700 hover:bg-purple-800 px-5 py-3 rounded"
        >
          🔚 Encerrar Evento
        </button>

      </div>

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