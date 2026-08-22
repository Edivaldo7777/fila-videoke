"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "../lib/supabase";

type Room = {
  room_code: string;
  room_name: string;
  status?: string;
};

export default function Dashboard() {
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [eventMode, setEventMode] =
    useState("traditional");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentUser, setCurrentUser] =
    useState<any>(null);
  const [checkingLogin, setCheckingLogin] =
    useState(true);

  useEffect(() => {

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  if (!user) {

    window.location.href =
      "/auth/login";

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

  let query = supabase
    .from("rooms")
    .select("*");

  if (
    user.role &&
    user.role !== "admin"
  ) {
    query = query.eq(
      "owner_id",
      user.id
    );
  }

  const { data, error } =
    await query.order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(error);
    return;
  }

  setRooms(data || []);
}

  async function startNewEvent(
  roomCode: string
) {

  const confirmed = confirm(
    "Iniciar um novo evento? A fila atual será limpa, mas o histórico do evento anterior será preservado."
  );

  if (!confirmed) {
    return;
  }

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

  if (
    room.status !== "encerrada"
  ) {
    alert(
      "O evento atual ainda não foi encerrado."
    );
    return;
  }

  if (room.current_event_id) {

    const {
      error: previousEventError,
    } = await supabase
      .from("events")
      .update({
        status: "finished",
        ended_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        room.current_event_id
      )
      .eq(
        "room_code",
        roomCode
      );

    if (previousEventError) {
      console.error(
        "Erro ao finalizar evento anterior:",
        previousEventError
      );

      alert(
        previousEventError.message
      );
      return;
    }
  }

  const {
    data: newEvent,
    error: newEventError,
  } = await supabase
    .from("events")
    .insert({
      room_code: roomCode,
      status: "running",
    })
    .select("id")
    .single();

  if (
    newEventError ||
    !newEvent
  ) {
    console.error(
      "Erro ao criar novo evento:",
      newEventError
    );

    alert(
      `Não foi possível criar o novo evento: ${
        newEventError?.message ||
        "erro desconhecido"
      }`
    );

    return;
  }

  const {
    error: roomUpdateError,
  } = await supabase
    .from("rooms")
    .update({
      current_event_id:
        newEvent.id,
      status: "ao_vivo",
    })
    .eq(
      "room_code",
      roomCode
    );

  if (roomUpdateError) {
    console.error(
      "Erro ao atualizar sala:",
      roomUpdateError
    );

    await supabase
      .from("events")
      .delete()
      .eq(
        "id",
        newEvent.id
      );

    alert(
      roomUpdateError.message
    );
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
    );

  if (queueError) {
    console.error(
      "Erro ao limpar fila:",
      queueError
    );
  }

  const {
    error: currentSingerError,
  } = await supabase
    .from("current_singer")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  if (currentSingerError) {
    console.error(
      "Erro ao limpar cantor atual:",
      currentSingerError
    );
  }

  const {
    error: statusError,
  } = await supabase
    .from("event_status")
    .upsert({
      room_code: roomCode,
      status: "running",
    });

  if (statusError) {
    console.error(
      "Erro ao atualizar status do evento:",
      statusError
    );

    alert(
      statusError.message
    );
    return;
  }

  alert(
    "Novo evento iniciado com sucesso. O histórico anterior foi preservado."
  );

  await loadRooms();
}

  async function createRoom() {

  if (!roomName.trim()) {
    alert(
      "Informe o nome da sala."
    );
    return;
  }

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  if (!user?.id) {
    alert(
      "Sua sessão não foi encontrada. Faça login novamente."
    );

    window.location.href =
      "/auth/login";

    return;
  }

  const { count, error: countError } =
    await supabase
      .from("rooms")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "owner_id",
        user.id
      );

  if (countError) {
    console.error(
      "Erro ao contar salas:",
      countError
    );

    alert(
      countError.message
    );
    return;
  }

  if (
    user.role !== "admin" &&
    count !== null &&
    count >= user.max_rooms
  ) {
    alert(
      `Limite de ${user.max_rooms} sala(s) atingido.`
    );
    return;
  }

  const code = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  const {
    error: roomError,
  } = await supabase
    .from("rooms")
    .insert({
      room_code: code,
      room_name:
        roomName.trim(),
      owner_id: user.id,
      event_mode: eventMode,
      status: "ao_vivo",
    });

  if (roomError) {
    console.error(
      "Erro ao criar sala:",
      roomError
    );

    alert(
      roomError.message
    );
    return;
  }

  const {
    data: newEvent,
    error: eventError,
  } = await supabase
    .from("events")
    .insert({
      room_code: code,
      status: "running",
    })
    .select("id")
    .single();

  if (
    eventError ||
    !newEvent
  ) {
    console.error(
      "Erro ao criar evento:",
      eventError
    );

    await supabase
      .from("rooms")
      .delete()
      .eq(
        "room_code",
        code
      );

    alert(
      `A sala não pôde ser criada porque o evento inicial falhou: ${
        eventError?.message ||
        "erro desconhecido"
      }`
    );

    return;
  }

  const {
    error: updateRoomError,
  } = await supabase
    .from("rooms")
    .update({
      current_event_id:
        newEvent.id,
    })
    .eq(
      "room_code",
      code
    );

  if (updateRoomError) {
    console.error(
      "Erro ao associar evento:",
      updateRoomError
    );

    await supabase
      .from("events")
      .delete()
      .eq(
        "id",
        newEvent.id
      );

    await supabase
      .from("rooms")
      .delete()
      .eq(
        "room_code",
        code
      );

    alert(
      updateRoomError.message
    );
    return;
  }

  setRoomCode(code);
  setRoomName("");
  setEventMode("traditional");

  alert(
    "Sala e evento inicial criados com sucesso."
  );

  await loadRooms();
}
  
async function deleteRoom(
  roomCode: string
) {

  const confirmed = confirm(
    "Tem certeza que deseja excluir esta sala?"
  );

  if (!confirmed) return;

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

  await supabase
    .from("performances")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  await supabase
    .from("event_status")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  await supabase
    .from("hall_of_fame")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  await supabase
    .from("rooms")
    .delete()
    .eq(
      "room_code",
      roomCode
    );

  alert(
    "Sala excluída com sucesso."
  );

  loadRooms();
}

async function changePassword() {

  const currentPassword =
    prompt(
      "Digite sua senha atual:"
    );

  if (!currentPassword) {
    return;
  }

  if (
    currentPassword !==
    currentUser.password
  ) {
    alert(
      "Senha atual incorreta."
    );
    return;
  }

  const newPassword =
    prompt(
      "Digite sua nova senha:"
    );

  if (!newPassword) {
    return;
  }

  const confirmPassword =
    prompt(
      "Confirme a nova senha:"
    );

  if (
    newPassword !==
    confirmPassword
  ) {
    alert(
      "As senhas não conferem."
    );
    return;
  }

  await supabase
    .from("users")
    .update({
      password: newPassword,
    })
    .eq(
      "id",
      currentUser.id
    );

  const updatedUser = {
    ...currentUser,
    password: newPassword,
  };

  localStorage.setItem(
    "user",
    JSON.stringify(updatedUser)
  );

  setCurrentUser(
    updatedUser
  );

  alert(
    "Senha alterada com sucesso."
  );
}
  
  const roomUrl =
    roomCode !== ""
      ? `http://localhost:3000/room/${roomCode}`
      : "";

  if (checkingLogin) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      Verificando login...
    </main>
  );
}
  
  return (
  <main className="min-h-screen bg-slate-100 p-8">

    <div className="flex justify-between items-center mb-6">

      <div>

        <h1 className="text-4xl font-bold">
          🎤 Painel do Operador
        </h1>

        {currentUser && (

          <div className="mt-2 text-sm text-slate-600">

            <div>

              {currentUser.role === "admin"
                ? "👑 Administrador"
                : `👤 ${currentUser.name}`}

            </div>

            {currentUser.role !== "admin" && (

              <div>

                Salas utilizadas:
                {" "}
                {rooms.length}
                {" / "}
                {currentUser.max_rooms}

              </div>

            )}

            <div>
              Status: {currentUser.status}
            </div>

          </div>

        )}

      </div>

      <div className="flex gap-2">

  <button
    onClick={changePassword}
    className="bg-blue-600 text-white px-4 py-2 rounded" 
    >
    🔒 Alterar Senha
  </button>

  <button
    onClick={() => {

      localStorage.removeItem(
        "user"
      );

      window.location.href =
        "/auth/login";

    }}
    className="bg-red-600 text-white px-4 py-2 rounded"
  >
    🚪 Sair
  </button>

</div>

    </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block font-bold mb-2">
          Nome da Sala
        </label>
      <div className="mb-4">

  <label className="block font-bold mb-2">
    Modo do Evento
  </label>

  <select
    value={eventMode}
    onChange={(e) =>
      setEventMode(
        e.target.value
      )
    }
    className="border rounded p-2 w-full"
  >

    <option value="traditional">
      🎤 Tradicional
    </option>

    <option value="interactive">
      ⭐ Interativo
    </option>

  </select>

</div>
        <input
          type="text"
          value={roomName}
          onChange={(e) =>
            setRoomName(e.target.value)
          }
          placeholder="Ex: Videokê do Paulinho"
          className="border rounded p-2 w-full mb-4"
        />

        <button
          onClick={createRoom}
          className="bg-green-600 text-white px-5 py-3 rounded"
        >
          Criar Sala
        </button>
      </div>

      {roomCode && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">
            ✅ Sala Criada
          </h2>

          <p className="mb-2">
            Código: <strong>{roomCode}</strong>
          </p>

          <div className="mt-4 inline-block border p-4 rounded">
            <QRCode
              value={roomUrl}
              size={220}
            />
          </div>

          <p className="mt-4 text-sm break-all">
            {roomUrl}
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">
          🎵 Salas Existentes
        </h2>

        {rooms.length === 0 ? (
          <p>Nenhuma sala cadastrada.</p>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.room_code}
                className="border rounded p-4"
              >
                <h3 className="text-xl font-bold">
                  {room.room_name}
                </h3>

                <p className="mb-3">
                  Código: {room.room_code}
                </p>
                <p className="mb-3 font-bold">

                 {room.status === "encerrada" ? (
                  <span className="text-red-600">
                      🔴 ENCERRADA
                  </span>
                ) : (
                  <span className="text-green-600">
                      🟢 AO VIVO
                  </span>
                   )}
                
                </p>
                {room.status ===
                    "encerrada" && (

               <button
                     onClick={() =>
                     startNewEvent(
                     room.room_code
                    )
                    }
                    className="bg-green-700 text-white px-4 py-2 rounded mb-3"
  >
                    🎬 INICIAR NOVO EVENTO
               </button>

                 )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      window.open(
                        `/room/${room.room_code}`,
                        "_blank"
                      )
                    }
                    className="bg-green-600 text-white px-3 py-2 rounded"
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
                    className="bg-orange-600 text-white px-3 py-2 rounded"
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
                    className="bg-purple-600 text-white px-3 py-2 rounded"
                  >
                    📺 TV
                  </button>
                  <button
                  onClick={() =>
                      deleteRoom(
                        room.room_code
                      )
                  }
                  className="bg-red-700 text-white px-3 py-2 rounded"
                  >
                🗑 Excluir Sala
                </button>  
                    
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}