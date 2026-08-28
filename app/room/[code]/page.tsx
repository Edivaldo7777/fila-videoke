"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";

type QueueItem = {
  id: number;
  singer_name: string;
  song_name: string;
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [song, setSong] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [mode, setMode] = useState<"singer" | "voter" | null>(null);
  const [eventMode, setEventMode] = useState("traditional");
  const [currentEventId, setCurrentEventId] =
  useState<string | null>(null);

  const [roomActive, setRoomActive] =
  useState(false);

  useEffect(() => {
  async function init() {
    const route = await params;

    setRoomCode(
      route.code
    );

    const {
      data: room,
      error: roomError,
    } = await supabase
      .from("rooms")
      .select(
        "room_code, event_mode, current_event_id, status"
      )
      .eq(
        "room_code",
        route.code
      )
      .maybeSingle();

    if (
      roomError ||
      !room
    ) {
      console.error(
        "Erro ao localizar sala:",
        roomError
      );

      setRoomActive(false);
      setCurrentEventId(null);

      alert(
        "Sala não encontrada."
      );
      return;
    }

    setEventMode(
      room.event_mode ||
        "traditional"
    );

    setCurrentEventId(
      room.current_event_id ||
        null
    );

    setRoomActive(
      room.status === "ao_vivo" &&
      Boolean(
        room.current_event_id
      )
    );
  }

  init();
}, [params]);

  // Supabase Realtime para atualizar a fila instantaneamente
useEffect(() => {
  if (!roomCode || !currentEventId) {
    return;
  }

  let channel: any = null;

  async function initializeRoom() {
    await loadQueue();

    channel = supabase
      .channel(
        `room_queue_updates_${roomCode}_${currentEventId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          loadQueue();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        async () => {
          const {
            data: room,
            error: roomError,
          } = await supabase
            .from("rooms")
            .select(
              "current_event_id, status, event_mode"
            )
            .eq("room_code", roomCode)
            .maybeSingle();

          if (roomError || !room) {
            console.error(
              "Erro ao atualizar sala:",
              roomError
            );
            return;
          }

          setEventMode(
            room.event_mode || "traditional"
          );

          setCurrentEventId(
            room.current_event_id || null
          );

          setRoomActive(
            room.status === "ao_vivo" &&
              Boolean(room.current_event_id)
          );
        }
      )
      .subscribe((status) => {
        console.log(
          "Status Realtime da sala:",
          status
        );
      });
  }

  initializeRoom();

  const refreshTimer = window.setInterval(
    () => {
      loadQueue();
    },
    3000
  );

  return () => {
    window.clearInterval(refreshTimer);

    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [roomCode, currentEventId]);

async function loadQueue() {
  if (!roomCode || !currentEventId) {
    setQueue([]);
    return;
  }

  const { data, error } = await supabase
    .from("queue")
    .select("*")
    .eq("room_code", roomCode)
    .eq("event_id", currentEventId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Erro ao carregar fila:",
      error
    );
    return;
  }

  setQueue(data || []);
}

async function addToQueue() {
  if (!roomActive || !currentEventId) {
    alert(
      "Esta sala não possui um evento ativo."
    );
    return;
  }

  const normalizedName = name.trim();
  const normalizedSong = song.trim();

  if (!normalizedName || !normalizedSong) {
    alert("Informe nome e música.");
    return;
  }

  const token = uuidv4();

  const { error: profileError } =
    await supabase
      .from("singer_profile")
      .insert({
        singer_token: token,
        singer_name: normalizedName,
        room_code: roomCode,
        event_id: currentEventId,
        next_song: normalizedSong,
        participant_type: "singer",
      });

  if (profileError) {
    console.error(
      "Erro ao criar perfil do cantor:",
      profileError
    );

    alert(profileError.message);
    return;
  }

  const { error: queueError } =
    await supabase
      .from("queue")
      .insert({
        room_code: roomCode,
        event_id: currentEventId,
        singer_name: normalizedName,
        song_name: normalizedSong,
        singer_token: token,
      });

  if (queueError) {
    console.error(
      "Erro ao entrar na fila:",
      queueError
    );

    const { error: rollbackError } =
      await supabase
        .from("singer_profile")
        .delete()
        .eq("singer_token", token)
        .eq("room_code", roomCode)
        .eq("event_id", currentEventId);

    if (rollbackError) {
      console.error(
        "Erro ao desfazer perfil:",
        rollbackError
      );
    }

    alert(queueError.message);
    return;
  }

  router.push(`/cantor/${token}`);
}

async function registerVoter() {
  if (!roomActive || !currentEventId) {
    alert(
      "Esta sala não possui um evento ativo."
    );
    return;
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    alert("Informe seu nome.");
    return;
  }

  const voterToken = uuidv4();

  const { error } = await supabase
    .from("voters")
    .insert({
      room_code: roomCode,
      event_id: currentEventId,
      voter_token: voterToken,
      voter_name: normalizedName,
    });

  if (error) {
    console.error(
      "Erro ao cadastrar jurado:",
      error
    );

    alert(error.message);
    return;
  }

  router.push(`/jurado/${voterToken}`);
}

if (roomCode && !roomActive) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
        <div className="text-7xl mb-5">
          🔒
        </div>

        <h1 className="text-3xl font-black mb-3">
          Evento indisponível
        </h1>

        <p className="text-slate-400">
          Esta sala não possui um evento ativo no momento.
        </p>

        <p className="text-slate-500 text-sm mt-3">
          Aguarde o responsável iniciar um novo evento.
        </p>
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-5xl font-black mb-2">
          🎤 Sala {roomCode}
        </h1>

        <p className="text-slate-400 mb-8">
          Escolha como deseja participar
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setMode("singer")}
            className={`rounded-xl p-6 text-left border ${
              mode === "singer"
                ? "border-blue-500 bg-blue-900"
                : "border-slate-700 bg-slate-800"
            }`}
          >
            <div className="text-3xl mb-2">🎤</div>
            <h2 className="text-2xl font-bold">Quero Cantar</h2>
            <p className="text-slate-300 mt-2">
              Entrar na fila e cantar músicas.
            </p>
          </button>

          <button
            onClick={() => setMode("voter")}
            className={`rounded-xl p-6 text-left border ${
              mode === "voter"
                ? "border-yellow-500 bg-yellow-900"
                : "border-slate-700 bg-slate-800"
            }`}
          >
            <div className="text-3xl mb-2">⭐</div>
            <h2 className="text-2xl font-bold">Apenas Votar</h2>
            <p className="text-slate-300 mt-2">
              Participar avaliando os cantores.
            </p>
          </button>
        </div>

        {mode === "singer" && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">🎤 Entrar na Fila</h2>

            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded bg-slate-700 mb-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="Nome da música"
              value={song}
              onChange={(e) => setSong(e.target.value)}
              className="w-full p-3 rounded bg-slate-700 mb-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={addToQueue}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded font-bold w-full"
            >
              Entrar na Fila
            </button>
          </div>
        )}

        {mode === "voter" && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">⭐ Entrar como Jurado</h2>

            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded bg-slate-700 mb-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />

            <button
              onClick={registerVoter}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-3 rounded font-bold w-full"
            >
              Entrar como Jurado
            </button>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">🎤 Fila Atual</h2>

          {queue.length === 0 ? (
            <p className="text-slate-400">Ninguém na fila.</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((item, index) => (
                <li
                  key={item.id}
                  className="bg-slate-700 rounded p-4 flex justify-between items-center"
                >
                  <span>
                    #{index + 1} <strong>{item.singer_name}</strong> {" | "} 🎵 {item.song_name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}