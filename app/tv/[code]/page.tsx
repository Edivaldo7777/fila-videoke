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

  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("VIDEOKÊ");
  const [roomUrl, setRoomUrl] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSinger, setCurrentSinger] = useState<any>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentVotes, setCurrentVotes] = useState(0);
  const [topRanking, setTopRanking] = useState<any[]>([]);
  const [clock, setClock] = useState("");
  const [eventStatus, setEventStatus] = useState("running");
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    async function init() {
      const room = await params;
      setRoomCode(room.code);

      if (typeof window !== "undefined") {
        setRoomUrl(`${window.location.origin}/room/${room.code}`);
      }
    }

    init();
  }, [params]);

  useEffect(() => {
    if (!roomCode) return;

    let channel: any;
    let clockTimer: NodeJS.Timeout;

    async function validateAccess() {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

      if (!room) {
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(false);

      if (user.role === "admin" || room.owner_id === user.id) {
        setAuthorized(true);
        setCheckingAccess(false);

        await loadData();

        clockTimer = setInterval(() => {
          const now = new Date();
          setClock(
            now.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }, 1000);

        channel = supabase
          .channel("tv_room_updates")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "queue", filter: `room_code=eq.${roomCode}` },
            () => loadData()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "current_singer", filter: `room_code=eq.${roomCode}` },
            () => loadData()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "singer_votes", filter: `room_code=eq.${roomCode}` },
            () => loadData()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "event_status", filter: `room_code=eq.${roomCode}` },
            () => loadData()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "rooms", filter: `room_code=eq.${roomCode}` },
            () => loadData()
          )
          .subscribe();
      }

      setCheckingAccess(false);
    }

    validateAccess();

    return () => {
      if (clockTimer) clearInterval(clockTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode]);

  async function loadVotes(singerToken: string, eventId: string) {
    const { data: performance, error: performanceError } = await supabase
      .from("performances")
      .select("id")
      .eq("room_code", roomCode)
      .eq("event_id", eventId)
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
      .select("score")
      .eq("room_code", roomCode)
      .eq("event_id", eventId)
      .eq("performance_id", performance.id);

    if (votesError || !votes || votes.length === 0) {
      setCurrentScore(0);
      setCurrentVotes(0);
      return;
    }

    const total = votes.reduce((sum: number, vote: any) => sum + Number(vote.score), 0);
    setCurrentVotes(votes.length);
    setCurrentScore(total / votes.length);
  }

  async function loadRanking(eventId: string) {
    const { data: performances } = await supabase
      .from("performances")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", eventId);

    if (!performances || performances.length === 0) {
      setTopRanking([]);
      return;
    }

    const { data: votes } = await supabase
      .from("singer_votes")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", eventId);

    if (!votes || votes.length === 0) {
      setTopRanking([]);
      return;
    }

    const rankingMap: Record<
      string,
      {
        singer_name: string;
        total: number;
        count: number;
        presentations: number;
      }
    > = {};

    for (const performance of performances) {
      const singerToken = performance.singer_token;
      if (!rankingMap[singerToken]) {
        rankingMap[singerToken] = {
          singer_name: performance.singer_name || "Desconhecido",
          total: 0,
          count: 0,
          presentations: 0,
        };
      }
      rankingMap[singerToken].presentations += 1;
    }

    for (const vote of votes) {
      const singerToken = vote.singer_token;
      if (!rankingMap[singerToken]) continue;

      rankingMap[singerToken].total += Number(vote.score);
      rankingMap[singerToken].count += 1;
    }

    const ranking = Object.values(rankingMap)
      .filter((item) => item.count > 0)
      .map((item) => ({
        singer_name: item.singer_name,
        average: item.total / item.count,
        votes: item.count,
        presentations: item.presentations,
      }))
      .sort((a, b) => b.average - a.average);

    setTopRanking(ranking.slice(0, 3));
  }

  async function loadData() {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (roomError || !room) return;

    if (room.room_name) {
      setRoomName(room.room_name);
    }

    const eventId = room.current_event_id;
    setCurrentEventId(eventId || null);

    const { data: statusData } = await supabase
      .from("event_status")
      .select("*")
      .eq("room_code", roomCode)
      .maybeSingle();

    if (statusData?.status) {
      setEventStatus(statusData.status);
    }

    if (room.status === "encerrada" || statusData?.status === "awards") {
      router.push(`/awards/${roomCode}`);
      return;
    }

    const { data: queueData } = await supabase
      .from("queue")
      .select("*")
      .eq("room_code", roomCode)
      .order("created_at");

    setQueue(queueData || []);

    if (!eventId) {
      setCurrentSinger(null);
      setCurrentScore(0);
      setCurrentVotes(0);
      setTopRanking([]);
      return;
    }

    const { data: current } = await supabase
      .from("current_singer")
      .select("*")
      .eq("room_code", roomCode)
      .eq("event_id", eventId)
      .maybeSingle();

    setCurrentSinger(current || null);

    if (current?.singer_token) {
      await loadVotes(current.singer_token, eventId);
    } else {
      setCurrentScore(0);
      setCurrentVotes(0);
    }

    await loadRanking(eventId);
  }

  const nextSinger = queue.length > 0 ? queue[0] : null;

  if (checkingAccess) {
    return (
      <main className="h-screen flex items-center justify-center bg-slate-950 text-white">
        Verificando acesso...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2">🔒 ACESSO NEGADO</h1>
          <p>Você não é proprietário desta sala.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-4 overflow-hidden flex flex-col justify-between">
      
      {/* Topo Compacto */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 px-6 py-3 rounded-2xl">
        <div>
          <h1 className="text-2xl font-black tracking-wide">🎤 {roomName}</h1>
          <p className="text-xs text-slate-400">Sala: {roomCode}</p>
        </div>
        <div className="text-3xl font-black text-yellow-400">{clock}</div>
      </div>

      {/* Conteúdo Principal em Grid Otimizado para Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-2 flex-1">
        
        {/* Coluna Esquerda: Cantor Atual + Preparando */}
        <div className="md:col-span-7 flex flex-col gap-4 justify-between">
          
          {/* Card: Cantando Agora */}
          <div className="bg-yellow-400 text-black rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-center">
            <h2 className="text-xs font-black tracking-widest uppercase opacity-80 mb-1">🎤 Cantando Agora</h2>
            <div className="text-4xl md:text-5xl font-black truncate mb-1">
              {currentSinger?.singer_name || "AGUARDANDO"}
            </div>
            <div className="text-xl font-bold opacity-90 truncate mb-4">
              🎵 {currentSinger?.song_name || "Nenhuma música informada"}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
                <div className="text-xs font-bold text-slate-600">NOTA MÉDIA</div>
                <div className="text-3xl font-black">{currentScore.toFixed(1)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
                <div className="text-xs font-bold text-slate-600">VOTOS</div>
                <div className="text-3xl font-black">{currentVotes}</div>
              </div>
            </div>
          </div>

          {/* Card: Próximo / Prepare-se */}
          <div className="bg-orange-600 rounded-2xl px-6 py-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-black tracking-wider uppercase opacity-90">🚨 Próximo da Fila</span>
              <div className="text-2xl font-black truncate">
                {nextSinger ? nextSinger.singer_name : "Nenhum na fila"}
              </div>
              <div className="text-sm opacity-90 truncate">
                {nextSinger ? `🎵 ${nextSinger.song_name}` : "Aguardando inscrições"}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs opacity-80 block">Fila Total</span>
              <span className="text-3xl font-black">{queue.length}</span>
            </div>
          </div>

        </div>

        {/* Coluna Direita: Top Ranking e QR Code */}
        <div className="md:col-span-5 flex flex-col gap-4 justify-between">
          
          {/* Card: Top 3 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex-1">
            <h2 className="text-lg font-black mb-3 text-center text-yellow-400">🏆 TOP 3 DA NOITE</h2>
            {topRanking.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-6">
                Nenhum voto registrado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {topRanking.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-800/80 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm"
                  >
                    <div className="font-bold truncate pr-2">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} {item.singer_name}
                    </div>
                    <div className="text-yellow-400 font-black shrink-0">
                      ⭐ {item.average.toFixed(1)} <span className="text-xs text-slate-400 font-normal">({item.votes})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: QR Code Compacto */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex items-center gap-4 justify-center">
            {roomUrl && (
              <div className="bg-white p-2 rounded-xl shrink-0">
                <QRCode value={roomUrl} size={90} />
              </div>
            )}
            <div className="text-left">
              <h3 className="font-bold text-sm text-yellow-400">📱 ENTRE NA FILA</h3>
              <p className="text-xs text-slate-400 mt-0.5">Escaneie com a câmera do celular para participar</p>
            </div>
          </div>

        </div>

      </div>

      {/* Rodapé Compacto */}
      <footer className="text-center text-xs text-slate-500 pb-1">
        Fila Videokê — Sistema de Gerenciamento Profissional em Tempo Real
      </footer>

    </main>
  );
}