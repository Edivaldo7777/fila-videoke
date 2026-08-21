"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "../../lib/supabase";

export default function AwardsPage({
  params,
}: {
  params: Promise<{
    code: string;
  }>;
}) {

  const router = useRouter();

  const [roomCode, setRoomCode] =
    useState("");

  const [roomName, setRoomName] =
    useState("");

  const [history, setHistory] =
    useState<any[]>([]);

  const [latest, setLatest] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {

    async function init() {

      const route =
        await params;

      setRoomCode(
        route.code
      );

    }

    init();

  }, [params]);

  useEffect(() => {

    if (!roomCode) {
      return;
    }

    loadData();

    const timer =
      setInterval(() => {
        loadData();
      }, 3000);

    return () => {
      clearInterval(timer);
    };

  }, [roomCode]);

  async function loadData() {

    setErrorMessage("");

    const {
      data: roomData,
      error: roomError,
    } = await supabase
      .from("rooms")
      .select("*")
      .eq(
        "room_code",*        roomCode
      )
      .si*gle();

    if (
      roomError |*
      !roomData
    ) {

      co*sole.error(
        "Erro ao carre*ar sala:",
        roomError
     *);

      setErrorMessage(
       *"Sala não encontrada."
      );

      setLoading(false);

      return;
    }

    setRoomName(
      roomData.room_name ||
      roomCode
    );

    if (
      roomData.status ===
      "ao_vivo"
    ) {

      router.push(
        `/tv/${roomCode}`
      );

      return;
    }

    const {
      data: lastFinishedEvent,
      error: eventError,
    } = await supabase
      .from("events")
      .select("*")
      .eq(
        "room_code",
        roomCode
      )
      .eq(
        "status",
        "finished"
      )
      .order(
        "ended_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (eventError) {

      console.error(
        "Erro ao carregar evento:",
        eventError
      );

      setErrorMessage(
        "Não foi possível carregar o evento encerrado."
      );

      setLoading(false);

      return;
    }

    if (!lastFinishedEvent) {

      setLatest(null);
      setHistory([]);

      setErrorMessage(
        "Nenhum evento encerrado foi encontrado para esta sala."
      );

      setLoading(false);

      return;
    }

    const {
      data: latestAward,
      error: latestAwardError,
    } = await supabase
      .from("hall_of_fame")
      .select("*")
      .eq(
        "room_code",*        roomCode
      )
      .eq*
        "event_id",
        lastF*nishedEvent.id
      )
      .orde*(
        "created_at",
        {
*         ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (latestAwardError) {

      console.error(
        "Erro ao carregar premiação:",
        latestAwardError
      );

      setErrorMessage(
        "Não foi possível carregar a premiação."
      );

      setLoading(false);

      return;
    }

    setLatest(
      latestAward || null
    );

    const {
      data: historyData,
      error: historyError,
    } = await supabase
      .from("hall_of_fame")
      .select("*")
      .eq(
        "room_code",
        roomCode
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (historyError) {

      console.error(
        "Erro ao carregar histórico:",
        historyError
      );

      setHistory([]);

    } else {

      setHistory(
        historyData || []
      );

    }

    setLoading(false);
  }

  if (loading) {

    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-800 via-yellow-600 to-yellow-400 text-black flex items-center justify-center p-10">

        <div className="bg-white rounded-2xl p-8 text-2xl font-black shadow-2xl">

          ⏳ Carregando premiação...

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-800 via-yellow-600 to-yellow-400 text-black p-6 md:p-10">

      <div className="text-center mb-10">

        <h1 className="text-4xl md:text-6xl font-black">

          🏆 PREMIAÇÃO DA NOITE

        </h1>

        <p className="text-xl font-bold mt-3">

          🎤 {roomName}

        </p>

        <p className="mt-1">

          Sala {roomCode}

        </p>

      </div>

      {errorMessage && (

        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 mb-8 text-center shadow-2xl">

          <p className="font-bold text-lg">

            {errorMessage}

          </p>

        </div>

      )}

      {latest && (

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-10">

          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">

            <div className="text-7xl mb-4">
              👑
            </div>

            <h2 className="text-3xl md:text-4xl font-black mb-3">

              CAMPEÃO DA NOITE

            </h2>

            <div className="text-4xl md:text-5xl font-black">

              {latest.champion_name ||
                "Sem campeão"}

            </div>

            {latest.champion_name && (

              <>

                <div className="text-3xl mt-4">

                  ⭐{" "}

                  {latest.champion_average
                    ? Number(
                        latest.champion_average
                      ).toFixed(2)
                    : "0.00"}

                </div>

                <div className="mt-3 text-xl">

                  🎤{" "}

                  {latest.champion_presentations ||
                    0}

                  {" "}
                  apresentação(ões)

                </div>

              </>

            )}

            {!latest.champion_name && (

              <p className="mt-4 text-slate-600">

                Nenhum participante atingiu o mínimo de três apresentações.

              </p>

            )}

          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">

            <div className="text-7xl mb-4">
              ⭐
            </div>

            <h2 className="text-3xl md:text-4xl font-black mb-3">

              REVELAÇÃO DA NOITE

            </h2>

            <div className="text-4xl md:text-5xl font-black">

              {latest.revelation_name ||
                "Sem vencedor"}

            </div>

            {latest.revelation_name && (

              <>

                <div className="text-3xl mt-4">

                  ⭐{" "}

                  {latest.revelation_average
                    ? Number(
                        latest.revelation_average
                      ).toFixed(2)
                    : "0.00"}

                </div>

                <div className="mt-3 text-xl">

                  🎤{" "}

                  {latest.revelation_presentations ||
                    0}

                  {" "}
                  apresentação(ões)

                </div>

              </>

            )}

          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">

            <div className="text-7xl mb-4">
              🎵
            </div>

            <h2 className="text-3xl md:text-4xl font-black mb-3">

              MELHOR MÚSICA DA NOITE

            </h2>

            <div className="text-3xl md:text-4xl font-black">

              {latest.best_song_name ||
                "Sem vencedor"}

            </div>

            {latest.best_song_name && (

              <>

                <div className="text-2xl mt-4">

                  🎤{" "}

                  {latest.best_song_singer ||
                    "-"}

                </div>

                <div className="text-3xl mt-4">

                  ⭐{" "}

                  {latest.best_song_average
                    ? Number(
                        latest.best_song_average
                      ).toFixed(2)
                    : "0.00"}

                </div>

              </>

            )}

          </div>

        </div>

      )}

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl">

        <h2 className="text-3xl md:text-4xl font-black mb-6">

          🏛️ HALL DA FAMA DA SALA

        </h2>

        {history.length === 0 ? (

          <div>

            Nenhum evento encerrado para esta sala.

          </div>

        ) : (

          <div className="space-y-4">

            {history.map(
              (item) => (

                <div
                  key={item.id}
                  className="border rounded-xl p-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4"
                >

                  <div>

                    <div className="text-2xl font-black">

                      🥇{" "}

                      {item.champion_name ||
                        "Evento sem campeão"}

                    </div>

                    <div className="text-slate-600">

                      {item.event_date ||
                        "Data não informada"}

                    </div>

                    {item.revelation_name && (

                      <div className="text-slate-700 mt-1">

                        ⭐ Revelação:{" "}

                        {item.revelation_name}

                      </div>

                    )}

                    {item.best_song_name && (

                      <div className="text-slate-700 mt-1">

                        🎵 Melhor música:{" "}

                        {item.best_song_name}

                      </div>

                    )}

                  </div>

                  <div className="md:text-right">

                    {item.champion_name && (

                      <>

                        <div className="text-2xl font-black text-yellow-700">

                          ⭐{" "}

                          {item.champion_average
                            ? Number(
                                item.champion_average
                              ).toFixed(2)
                            : "0.00"}

                        </div>

                        <div className="text-slate-600">

                          🎤{" "}

                          {item.champion_presentations ||
                            0}

                        </div>

                      </>

                    )}

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}