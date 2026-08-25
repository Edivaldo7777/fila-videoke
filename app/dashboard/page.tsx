"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "../lib/supabase";

type Room = {
  room_code: string;
  room_name: string;
  status?: string;
  voting_mode?: string;
};

export default function Dashboard() {
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [eventMode, setEventMode] = useState("traditional");
  const [votingMode, setVotingMode] = useState("stars"); // Novo estado para o tipo de voto
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingLogin, setCheckingLogin] = useState(true);

  useEffect(() => {
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    setCurrentUser(user);
    loadRooms();
    setCheckingLogin(false);
  }, []);

  async function loadRooms() {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    let query = supabase.from("rooms").select("*");

    if (user.role && user.role !== "admin") {
      query = query.eq("owner_id", user.id);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error(error);
      return;
    }

    setRooms(data || []);
  }

  async function startNewEvent(roomCode: string) {
    const confirmed = confirm(
      "Iniciar um novo evento? A fila atual será limpa, mas o histórico do evento anterior será preservado."
    );

    if (!confirmed) {
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (roomError || !room) {
      console.error("Erro ao localizar sala:", roomError);
      alert("Não foi possível localizar a sala.");
      return;
    }

    if (room.status !== "encerrada") {
      alert("O evento atual ainda não foi encerrado.");
      return;
    }

    if (room.current_event_id) {
      const { error: previousEventError } = await supabase
        .from("events")
        .update({
          status: "finished",
          ended_at: new Date().toISOString(),
        })
        .eq("id", room.current_event_id)
        .eq("room_code", roomCode);

      if (previousEventError) {
        console.error("Erro ao finalizar evento anterior:", previousEventError);
        alert(previousEventError.message);
        return;
      }
    }

    const { data: newEvent, error: newEventError } = await supabase
      .from("events")
      .insert({
        room_code: roomCode,
        status: "running",
      })
      .select("id")
      .single();

    if (newEventError || !newEvent) {
      console.error("Erro ao criar novo evento:", newEventError);
      alert(
        `Não foi possível criar o novo evento: ${
          newEventError?.message || "erro desconhecido"
        }`
      );
      return;
    }

    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({
        current_event_id: newEvent.id,
        status: "ao_vivo",
      })
      .eq("room_code", roomCode);

    if (roomUpdateError) {
      console.error("Erro ao atualizar sala:", roomUpdateError);
      await supabase.from("events").delete().eq("id", newEvent.id);
      alert(roomUpdateError.message);
      return;
    }

    await supabase.from("queue").delete().eq("room_code", roomCode);
    await supabase.from("current_singer").delete().eq("room_code", roomCode);
    await supabase.from("event_status").upsert({
      room_code: roomCode,
      status: "running",
    });

    alert("Novo evento iniciado com sucesso. O histórico anterior foi preservado.");
    await loadRooms();
  }

  async function createRoom() {
    if (!roomName.trim()) {
      alert("Informe o nome da sala.");
      return;
    }

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    if (!user?.id) {
      alert("Sua sessão não foi encontrada. Faça login novamente.");
      window.location.href = "/auth/login";
      return;
    }

    const { count, error: countError } = await supabase
      .from("rooms")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("owner_id", user.id);

    if (countError) {
      console.error("Erro ao contar salas:", countError);
      alert(countError.message);
      return;
    }

    if (
      user.role !== "admin" &&
      count !== null &&
      count >= user.max_rooms
    ) {
      alert(`Limite de ${user.max_rooms} sala(s) atingido.`);
      return;
    }

    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const { error: roomError } = await supabase
      .from("rooms")
      .insert({
        room_code: code,
        room_name: roomName.trim(),
        owner_id: user.id,
        event_mode: eventMode,
        voting_mode: votingMode, // Salvando a escolha do tipo de voto
        status: "ao_vivo",
      });

    if (roomError) {
      console.error("Erro ao criar sala:", roomError);
      alert(roomError.message);
      return;
    }

    const { data: newEvent, error: eventError } = await supabase
      .from("events")
      .insert({
        room_code: code,
        status: "running",
      })
      .select("id")
      .single();

    if (eventError || !newEvent) {
      console.error("Erro ao criar evento:", eventError);
      await supabase.from("rooms").delete().eq("room_code", code);
      alert(
        `A sala não pôde ser criada porque o evento inicial falhou: ${
          eventError?.message || "erro desconhecido"
        }`
      );
      return;
    }

    const { error: updateRoomError } = await supabase
      .from("rooms")
      .update({
        current_event_id: newEvent.id,
      })
      .eq("room_code", code);

    if (updateRoomError) {
      console.error("Erro ao associar evento:", updateRoomError);
      await supabase.from("events").delete().eq("id", newEvent.id);
      await supabase.from("rooms").delete().eq("room_code", code);
      alert(updateRoomError.message);
      return;
    }

    setRoomCode(code);
    setRoomName("");
    setEventMode("traditional");
    setVotingMode("stars");

    alert("Sala e evento inicial criados com sucesso.");
    await loadRooms();
  }

  async function deleteRoom(roomCode: string) {
    const confirmed = confirm("Tem certeza que deseja excluir esta sala?");
    if (!confirmed) return;

    await supabase.from("queue").delete().eq("room_code", roomCode);
    await supabase.from("current_singer").delete().eq("room_code", roomCode);
    await supabase.from("performances").delete().eq("room_code", roomCode);
    await supabase.from("event_status").delete().eq("room_code", roomCode);
    await supabase.from("hall_of_fame").delete().eq("room_code", roomCode);
    await supabase.from("rooms").delete().eq("room_code", roomCode);

    alert("Sala excluída com sucesso.");
    loadRooms();
  }

  async function changePassword() {
    const currentPassword = prompt("Digite sua senha atual:");
    if (!currentPassword) return;

    if (currentPassword !== currentUser.password) {
      alert("Senha atual incorreta.");
      return;
    }

    const newPassword = prompt("Digite sua nova senha:");
    if (!newPassword) return;

    const confirmPassword = prompt("Confirme a nova senha:");
    if (newPassword !== confirmPassword) {
      alert("As senhas não conferem.");
      return;
    }

    await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", currentUser.id);

    const updatedUser = { ...currentUser, password: newPassword };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    alert("Senha alterada com sucesso.");
  }

  const roomUrl =
  roomCode !== "" &&
  typeof window !== "undefined"
    ? `${window.location.origin}/room/${roomCode}`
    : "";

  if (checkingLogin) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Verificando login...
      </main>
    );
  }

  return (
  <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">

    <div className="max-w-7xl mx-auto p-4 md:p-8">

      {/* Cabeçalho */}
      <header className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>

            <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-full text-xs font-bold mb-3">

              <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" />

              CENTRAL DE GERENCIAMENTO

            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">

              🎤 Fila Videokê

            </h1>

            <p className="text-slate-400 mt-2">

              Crie salas, controle os eventos e acompanhe suas operações.

            </p>

          </div>

          <div className="flex flex-col sm:flex-row gap-3">

            <button
              onClick={changePassword}
              className="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-200 hover:text-white px-5 py-3 rounded-xl font-bold transition-all"
            >

              🔒 Alterar Senha

            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem("user");
                window.location.href =
                  "/auth/login";
              }}
              className="bg-red-500/10 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white px-5 py-3 rounded-xl font-bold transition-all"
            >

              🚪 Sair

            </button>

          </div>

        </div>

      </header>

      {/* Informações do usuário */}
      {currentUser && (

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-950/20 border border-purple-500/20 rounded-2xl p-5 shadow-xl">

            <p className="text-xs uppercase tracking-widest text-purple-300 font-bold">

              Usuário

            </p>

            <p className="text-2xl font-black mt-2">

              {currentUser.role === "admin"
                ? "👑 Administrador"
                : `👤 ${currentUser.name}`}

            </p>

            <p className="text-slate-400 text-sm mt-2">

              {currentUser.email}

            </p>

          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-950/20 border border-blue-500/20 rounded-2xl p-5 shadow-xl">

            <p className="text-xs uppercase tracking-widest text-blue-300 font-bold">

              Salas utilizadas

            </p>

            <p className="text-4xl font-black mt-2">

              {rooms.length}

              {currentUser.role !== "admin" && (

                <span className="text-lg text-slate-400 ml-2">

                  / {currentUser.max_rooms}

                </span>

              )}

            </p>

            <p className="text-slate-400 text-sm mt-2">

              {currentUser.role === "admin"
                ? "Acesso administrativo"
                : "Limite definido pelo seu plano"}

            </p>

          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 shadow-xl">

            <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold">

              Status da conta

            </p>

            <p className="text-2xl font-black mt-2 text-emerald-300">

              {currentUser.status === "approved"
                ? "✅ Aprovada"
                : currentUser.status}

            </p>

            <p className="text-slate-400 text-sm mt-2">

              Conta habilitada para utilização

            </p>

          </div>

        </section>

      )}

      {/* Criação de sala */}
      <section className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">

        <div className="flex items-center gap-4 mb-7">

          <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-3xl">

            ➕

          </div>

          <div>

            <h2 className="text-2xl md:text-3xl font-black">

              Criar Nova Sala

            </h2>

            <p className="text-slate-400 mt-1">

              Configure o formato do evento e o tipo de votação.

            </p>

          </div>

        </div>

        <div className="mb-6">

          <label className="block text-sm font-bold text-slate-300 mb-2">

            Nome da Sala

          </label>

          <input
            type="text"
            value={roomName}
            onChange={(e) =>
              setRoomName(
                e.target.value
              )
            }
            placeholder="Exemplo: Videokê do Paulinho"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
          />

        </div>

        {/* Modo do evento */}
        <div className="mb-6">

          <label className="block text-sm font-bold text-slate-300 mb-3">

            Modo do Evento

          </label>

          <div className="grid md:grid-cols-2 gap-4">

            <button
              type="button"
              onClick={() =>
                setEventMode(
                  "traditional"
                )
              }
              className={`text-left rounded-2xl border p-5 transition-all ${
                eventMode === "traditional"
                  ? "bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/20"
                  : "bg-slate-900 border-slate-700 hover:border-slate-500"
              }`}
            >

              <div className="text-3xl mb-3">

                🎤

              </div>

              <h3 className="text-xl font-black">

                Tradicional

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Cantores participam da fila e jurados ficam exclusivamente responsáveis pelos votos.

              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                setEventMode(
                  "interactive"
                )
              }
              className={`text-left rounded-2xl border p-5 transition-all ${
                eventMode === "interactive"
                  ? "bg-fuchsia-600/20 border-fuchsia-500 ring-2 ring-fuchsia-500/20"
                  : "bg-slate-900 border-slate-700 hover:border-slate-500"
              }`}
            >

              <div className="text-3xl mb-3">

                ⭐

              </div>

              <h3 className="text-xl font-black">

                Interativo

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Cantores podem votar nos outros e participantes podem alternar entre cantor e jurado.

              </p>

            </button>

          </div>

        </div>

        {/* Tipo de votação */}
        <div className="mb-7">

          <label className="block text-sm font-bold text-slate-300 mb-3">

            Tipo de Votação

          </label>

          <div className="grid md:grid-cols-2 gap-4">

            <button
              type="button"
              onClick={() =>
                setVotingMode(
                  "stars"
                )
              }
              className={`text-left rounded-2xl border p-5 transition-all ${
                votingMode === "stars"
                  ? "bg-yellow-500/15 border-yellow-500 ring-2 ring-yellow-500/20"
                  : "bg-slate-900 border-slate-700 hover:border-slate-500"
              }`}
            >

              <div className="text-3xl mb-3">

                ⭐

              </div>

              <h3 className="text-xl font-black">

                Estrelas

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Avaliação tradicional com notas de uma a cinco estrelas.

              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                setVotingMode(
                  "thumbs"
                )
              }
              className={`text-left rounded-2xl border p-5 transition-all ${
                votingMode === "thumbs"
                  ? "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-slate-900 border-slate-700 hover:border-slate-500"
              }`}
            >

              <div className="text-3xl mb-3">

                👍👎

              </div>

              <h3 className="text-xl font-black">

                Aprovação

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Votação simples entre Bom e Ruim, convertida em percentual de aprovação.

              </p>

            </button>

          </div>

        </div>

        <button
          onClick={createRoom}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-6 py-4 rounded-xl font-black text-lg shadow-lg transition-all hover:-translate-y-0.5"
        >

          🚀 Criar Sala e Iniciar Evento

        </button>

      </section>

      {/* Nova sala criada */}
      {roomCode && (

        <section className="bg-gradient-to-r from-emerald-900/50 to-blue-900/50 border border-emerald-500/30 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">

          <div className="grid md:grid-cols-2 gap-8 items-center">

            <div>

              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold mb-4">

                ✅ SALA CRIADA

              </div>

              <h2 className="text-3xl font-black">

                Sua sala está ao vivo!

              </h2>

              <p className="text-slate-300 mt-3">

                Compartilhe o QR Code ou o endereço abaixo com os participantes.

              </p>

              <div className="bg-black/30 border border-white/10 rounded-2xl p-4 mt-5">

                <p className="text-xs text-slate-400 uppercase font-bold">

                  Código da sala

                </p>

                <p className="text-4xl font-black text-yellow-400 mt-1 tracking-widest">

                  {roomCode}

                </p>

              </div>

              <p className="text-xs text-slate-400 break-all mt-4">

                {roomUrl}

              </p>

              <button
                onClick={() =>
                  window.open(
                    `/room/${roomCode}`,
                    "_blank"
                  )
                }
                className="mt-5 bg-white text-slate-950 hover:bg-slate-200 px-5 py-3 rounded-xl font-black transition-colors"
              >

                🎤 Abrir Sala dos Participantes

              </button>

            </div>

            <div className="flex justify-center">

              <div className="bg-white p-5 rounded-3xl shadow-2xl">

                <QRCode
                  value={roomUrl}
                  size={220}
                />

              </div>

            </div>

          </div>

        </section>

      )}

      {/* Salas existentes */}
      <section className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-6 md:p-8 shadow-2xl">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">

          <div>

            <h2 className="text-2xl md:text-3xl font-black">

              🎵 Salas Existentes

            </h2>

            <p className="text-slate-400 mt-1">

              Gerencie suas salas, operadores e telas de TV.

            </p>

          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-full px-5 py-2 font-black">

            {rooms.length}{" "}

            {rooms.length === 1
              ? "sala"
              : "salas"}

          </div>

        </div>

        {rooms.length === 0 ? (

          <div className="border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center">

            <div className="text-6xl mb-4">

              🎙️

            </div>

            <h3 className="text-xl font-black">

              Nenhuma sala cadastrada

            </h3>

            <p className="text-slate-400 mt-2">

              Utilize o formulário acima para criar seu primeiro evento.

            </p>

          </div>

        ) : (

          <div className="grid xl:grid-cols-2 gap-5">

            {rooms.map((room) => {

              const isEnded =
                room.status ===
                "encerrada";

              const participantUrl =
                typeof window !==
                "undefined"
                  ? `${window.location.origin}/room/${room.room_code}`
                  : "";

              return (

                <article
                  key={room.room_code}
                  className={`rounded-3xl border p-6 shadow-xl transition-all ${
                    isEnded
                      ? "bg-red-950/20 border-red-500/20"
                      : "bg-slate-900/80 border-emerald-500/20 hover:border-emerald-500/40"
                  }`}
                >

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                    <div className="min-w-0">

                      <div
                        className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-xs font-black mb-3 ${
                          isEnded
                            ? "bg-red-500/10 border-red-500/30 text-red-300"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        }`}
                      >

                        {isEnded
                          ? "🔴 ENCERRADA"
                          : "🟢 AO VIVO"}

                      </div>

                      <h3 className="text-2xl font-black truncate">

                        {room.room_name}

                      </h3>

                      <p className="text-slate-400 mt-1">

                        Código:{" "}

                        <strong className="text-yellow-400 tracking-widest">

                          {room.room_code}

                        </strong>

                      </p>

                      <p className="text-sm text-slate-500 mt-2">

                        Votação:{" "}

                        {room.voting_mode ===
                        "thumbs"
                          ? "👍👎 Aprovação"
                          : "⭐ Estrelas"}

                      </p>

                    </div>

                    {!isEnded &&
                      participantUrl && (

                      <div className="bg-white rounded-xl p-2 shrink-0">

                        <QRCode
                          value={
                            participantUrl
                          }
                          size={74}
                        />

                      </div>

                    )}

                  </div>

                  {isEnded && (

                    <button
                      onClick={() =>
                        startNewEvent(
                          room.room_code
                        )
                      }
                      className="w-full mt-5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-5 py-3 rounded-xl font-black transition-all"
                    >

                      🎬 Iniciar Novo Evento

                    </button>

                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">

                    <button
                      onClick={() =>
                        window.open(
                          `/room/${room.room_code}`,
                          "_blank"
                        )
                      }
                      className="bg-emerald-600/15 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-200 hover:text-white px-3 py-3 rounded-xl font-bold text-sm transition-all"
                    >

                      🎤 Participantes

                    </button>

                    <button
                      onClick={() =>
                        window.open(
                          `/operator/${room.room_code}`,
                          "_blank"
                        )
                      }
                      className="bg-orange-600/15 hover:bg-orange-600 border border-orange-500/30 text-orange-200 hover:text-white px-3 py-3 rounded-xl font-bold text-sm transition-all"
                    >

                      🎛️ Operador

                    </button>

                    <button
                      onClick={() =>
                        window.open(
                          `/tv/${room.room_code}`,
                          "_blank"
                        )
                      }
                      className="bg-purple-600/15 hover:bg-purple-600 border border-purple-500/30 text-purple-200 hover:text-white px-3 py-3 rounded-xl font-bold text-sm transition-all"
                    >

                      📺 TV

                    </button>

                    <button
                      onClick={() =>
                        deleteRoom(
                          room.room_code
                        )
                      }
                      className="bg-red-600/10 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white px-3 py-3 rounded-xl font-bold text-sm transition-all"
                    >

                      🗑 Excluir

                    </button>

                  </div>

                </article>

              );

            })}

          </div>

        )}

      </section>

      <footer className="text-center text-xs text-slate-500 py-7">

        Fila Videokê • Gerenciamento profissional de eventos musicais

      </footer>

    </div>

  </main>
);
}