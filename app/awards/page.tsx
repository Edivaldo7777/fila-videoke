"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AwardsPage() {
  const router = useRouter();

  const [history, setHistory] =
    useState<any[]>([]);

  const [latest, setLatest] =
    useState<any>(null);

  useEffect(() => {

  loadData();

  const timer =
    setInterval(() => {
      loadData();
    }, 3000);

  return () => {
    clearInterval(timer);
  };

}, []);

  async function loadData() {
    const { data } =
      await supabase
        .from("hall_of_fame")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    setHistory(data || []);

    if (data && data.length > 0) {

  setLatest(data[0]);

  const roomCode =
    data[0].room_code;

  const {
    data: roomData,
  } = await supabase
    .from("rooms")
    .select("*")
    .eq(
      "room_code",
      roomCode
    )
    .single();

  if (
    roomData?.status ===
    "ao_vivo"
  ) {
    router.push(
      `/tv/${roomCode}`
    );
  }
}
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-800 via-yellow-600 to-yellow-400 text-black p-10">

      <h1 className="text-6xl font-black text-center mb-10">
        🏆 PREMIAÇÃO DA NOITE
      </h1>

      {latest && (

        <div className="grid md:grid-cols-3 gap-8 mb-10">

          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">

            <div className="text-7xl mb-4">
              👑
            </div>

            <h2 className="text-4xl font-black mb-3">
              CAMPEÃO DA NOITE
            </h2>

            <div className="text-5xl font-black">
              {latest.champion_name}
            </div>

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
              {latest.champion_presentations || 0}
              {" "}
              apresentações
            </div>

          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">

            <div className="text-7xl mb-4">
              ⭐
            </div>

            <h2 className="text-4xl font-black mb-3">
              REVELAÇÃO DA NOITE
            </h2>

            <div className="text-5xl font-black">
              {latest.revelation_name ||
                "Sem vencedor"}
            </div>

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
              {latest.revelation_presentations || 0}
              {" "}
              apresentações
            </div>

          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">

            <div className="text-7xl mb-4">
              🎵
            </div>

            <h2 className="text-4xl font-black mb-3">
              MELHOR MÚSICA DA NOITE
            </h2>

            <div className="text-4xl font-black">
              {latest.best_song_name ||
                "Sem vencedor"}
            </div>

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

          </div>

        </div>

      )}

      <div className="bg-white rounded-3xl p-8 shadow-2xl">

        <h2 className="text-4xl font-black mb-6">
          🏛️ HALL DA FAMA
        </h2>

        {history.length === 0 ? (
          <div>
            Nenhum evento encerrado.
          </div>
        ) : (
          <div className="space-y-4">

            {history.map((item) => (

              <div
                key={item.id}
                className="border rounded-xl p-5 flex justify-between items-center"
              >

                <div>

                  <div className="text-2xl font-black">
                    🥇{" "}
                    {item.champion_name}
                  </div>

                  <div className="text-slate-600">
                    {item.event_date}
                  </div>

                </div>

                <div className="text-right">

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
                    {item.champion_presentations || 0}
                  </div>

                </div>

              </div>

            ))}

          </div>
        )}

      </div>

    </main>
  );
}