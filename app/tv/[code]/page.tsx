"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { supabase } from "../../lib/supabase";

type QueueItem = {
  id: number;
  singer_name: string;
  song_name: string;
};

export default function TvPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  
  const router = useRouter();

  const [roomCode, setRoomCode] =
    useState("");

  const [roomName, setRoomName] =
    useState("VIDEOKÊ");

  const [roomUrl, setRoomUrl] =
    useState("");

  const [queue, setQueue] =
    useState<QueueItem[]>([]);

  const [currentSinger, setCurrentSinger] =
    useState<any>(null);

  const [currentScore, setCurrentScore] =
    useState(0);

  const [currentVotes, setCurrentVotes] =
    useState(0);

  const [topRanking, setTopRanking] =
    useState<any[]>([]);

  const [clock, setClock] =
    useState("");
  
  const [eventStatus, setEventStatus] =
  useState("running");

  useEffect(() => {
    async function init() {
      const room = await params;

      setRoomCode(room.code);

      if (typeof window !== "undefined") {
        setRoomUrl(
          `${window.location.origin}/room/${room.code}`
        );
      }
    }

    init();
  }, [params]);

  useEffect(() => {
    if (!roomCode) return;

    loadData();

    const queueTimer = setInterval(() => {
      loadData();
    }, 5000);

    const clockTimer = setInterval(() => {
      const now = new Date();

      setClock(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 1000);

    return () => {
      clearInterval(queueTimer);
      clearInterval(clockTimer);
    };
  }, [roomCode]);

  async function loadVotes(
    singerToken: string
  ) {
    const { data: performances } =
  await supabase
    .from("performances")
    .select("*")
    .eq(
      "room_code",
      roomCode
    );

if (
  !performances ||
  performances.length === 0
) {
  setTopRanking([]);
  return;
}

const singerTokens =
  performances.map(
    (p: any) =>
      p.singer_token
  );

const { data: votes } =
  await supabase
    .from("singer_votes")
    .select("*")
    .in(
      "singer_token",
      singerTokens
    );

    if (!votes || votes.length === 0) {
      setCurrentScore(0);
      setCurrentVotes(0);
      return;
    }

    const total = votes.reduce(
      (sum: number, vote: any) =>
        sum + Number(vote.score),
      0
    );

    setCurrentVotes(votes.length);

    setCurrentScore(
      total / votes.length
    );
  }
    async function loadRanking() {

  const { data: performances } =
    await supabase
      .from("performances")
      .select("*")
      .eq(
        "room_code",
        roomCode
      );

  if (
    !performances ||
    performances.length === 0
  ) {
    setTopRanking([]);
    return;
  }

  const singerTokens =
    [...new Set(
      performances.map(
        (item: any) =>
          item.singer_token
      )
    )];

  const { data: votes } =
    await supabase
      .from("singer_votes")
      .select("*")
      .in(
        "singer_token",
        singerTokens
      );

  if (!votes || votes.length === 0) {
    setTopRanking([]);
    return;
  }

  const rankingMap: any = {};

  votes.forEach((vote: any) => {

    if (!rankingMap[vote.singer_token]) {

      const performance =
        performances.find(
          (p: any) =>
            p.singer_token ===
            vote.singer_token
        );

      rankingMap[vote.singer_token] = {
        singer_name:
          performance?.singer_name ||
          "Desconhecido",

        total: 0,

        count: 0
      };
    }

    rankingMap[
      vote.singer_token
    ].total += Number(vote.score);

    rankingMap[
      vote.singer_token
    ].count += 1;

  });

  const ranking =
    Object.values(
      rankingMap
    ).map((item: any) => ({
      singer_name:
        item.singer_name,

      average:
        item.total /
        item.count,

      votes:
        item.count
    }));

  ranking.sort(
    (a: any, b: any) =>
      b.average -
      a.average
  );

  setTopRanking(
    ranking.slice(0, 3)
  );
}
  async function loadData() {
    const { data: current } =
      await supabase
        .from("current_singer")
        .select("*")
        .eq("room_code", roomCode)
        .single();

    const { data: queueData } =
      await supabase
        .from("queue")
        .select("*")
        .eq("room_code", roomCode)
        .order("created_at");

    const { data: room } =
      await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();
    
    const { data: statusData } =
      await supabase
        .from("event_status")
        .select("*")
        .eq("room_code", roomCode)
        .single();

    if (room?.room_name) {
      setRoomName(room.room_name);
    }

    setCurrentSinger(current);
    setQueue(queueData || []);
    
    if (statusData?.status) {
      setEventStatus(
        statusData.status

    
    );
    }
    if (
       statusData?.status ===
       "awards"
    ) 
    {
     router.push("/awards");
     return;
    }

    if (current?.singer_token) {
      await loadVotes(
        current.singer_token
      );
    } else {
      setCurrentScore(0);
      setCurrentVotes(0);
    }
    await loadRanking();
  }

  const nextSinger =
    queue.length > 0
      ? queue[0]
      : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-10">

      <div className="flex justify-between items-center mb-8">

        <div>
          <h1 className="text-6xl font-black">
            🎤 {roomName}
          </h1>

          <p className="text-slate-400 mt-2">
            Sala {roomCode}
          </p>
        </div>

        <div className="text-5xl font-black text-yellow-400">
          {clock}
        </div>

      </div>

      <div className="bg-yellow-400 text-black rounded-3xl p-8 mb-8 shadow-2xl">

        <h2 className="text-3xl font-black mb-4">
          🎤 AGORA CANTANDO
        </h2>

        <div className="text-7xl font-black mb-3">
          {currentSinger?.singer_name ||
            "AGUARDANDO"}
        </div>

        <div className="text-3xl mb-6">
          🎵{" "}
          {currentSinger?.song_name ||
            "Nenhuma música"}
        </div>

        <div className="grid grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl p-4 text-center">

            <div className="text-lg font-bold">
              ⭐ NOTA MÉDIA
            </div>

            <div className="text-5xl font-black">
              {currentScore.toFixed(1)}
            </div>

          </div>

          <div className="bg-white rounded-2xl p-4 text-center">

            <div className="text-lg font-bold">
              👥 VOTOS
            </div>

            <div className="text-5xl font-black">
              {currentVotes}
            </div>

          </div>

        </div>

      </div>

      <div className="bg-orange-500 rounded-3xl p-8 mb-8 text-white shadow-xl">

        <h2 className="text-3xl font-black mb-4">
          🚨 PREPARE-SE
        </h2>

        {nextSinger ? (
          <>
            <div className="text-5xl font-black">
              {nextSinger.singer_name}
            </div>

            <div className="text-2xl mt-3">
              🎵 {nextSinger.song_name}
            </div>
          </>
        ) : (
          <div className="text-2xl">
            Nenhum cantor aguardando.
          </div>
        )}

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="bg-slate-800 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-2">
            👥
          </div>

          <div className="text-4xl font-black">
            {queue.length}
          </div>

          <div className="text-slate-400">
            Na fila
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-2">
            ⏳
          </div>

          <div className="text-4xl font-black">
            {queue.length * 5}
          </div>

          <div className="text-slate-400">
            Minutos de espera
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-2">
            🎵
          </div>

          <div className="text-4xl font-black">
            {queue.length}
          </div>

          <div className="text-slate-400">
            Próximas músicas
          </div>
        </div>

      </div>
      <div className="bg-slate-800 rounded-3xl p-6 mb-8">

  <h2 className="text-4xl font-black mb-6 text-center">
    🏆 TOP 3 DA NOITE
  </h2>

  {topRanking.length === 0 ? (
    <div className="text-center text-slate-400 text-xl">
      Nenhum voto registrado.
    </div>
  ) : (
    <div className="space-y-4">

      {topRanking.map(
        (item, index) => (
          <div
            key={index}
            className="bg-slate-700 rounded-xl p-4 flex justify-between items-center"
          >

            <div className="text-3xl font-black">

              {index === 0
                ? "🥇"
                : index === 1
                ? "🥈"
                : "🥉"}

              {" "}
              {item.singer_name}

            </div>

            <div className="text-right">

              <div className="text-2xl font-black text-yellow-400">
                ⭐ {item.average.toFixed(1)}
              </div>

              <div className="text-slate-300">
                {item.votes} voto(s)
              </div>

            </div>

          </div>
        )
      )}

    </div>
  )}

</div>
      <div className="grid md:grid-cols-2 gap-8">

        <div className="bg-slate-800 rounded-3xl p-6">

          <h2 className="text-3xl font-bold mb-6">
            🎤 Próximos Cantores
          </h2>

          {queue.length === 0 ? (
            <p className="text-slate-400">
              Nenhum cantor aguardando.
            </p>
          ) : (
            <div className="space-y-4">

              {queue
                .slice(0, 5)
                .map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-slate-700 rounded-xl p-4"
                  >

                    <div className="font-bold text-2xl">
                      #{index + 1}{" "}
                      {item.singer_name}
                    </div>

                    <div className="text-slate-300">
                      🎵 {item.song_name}
                    </div>

                  </div>
                ))}

            </div>
          )}

        </div>

        <div className="bg-slate-800 rounded-3xl p-6 text-center">

          <h2 className="text-3xl font-bold mb-4">
            📱 ENTRE NA FILA
          </h2>

          {roomUrl && (
            <div className="bg-white inline-block p-5 rounded-xl">
              <QRCode
                value={roomUrl}
                size={280}
              />
            </div>
          )}

          <p className="mt-5 text-lg text-slate-300">
            Escaneie o QR Code para participar
          </p>

          <p className="text-slate-500 break-all mt-3">
            {roomUrl}
          </p>

        </div>

      </div>

    </main>
  );
}