"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HallOfFamePage() {
  const [champions, setChampions] = useState<any[]>([]);

  useEffect(() => {
    loadData();

    // Supabase Realtime para atualizar o Hall da Fama instantaneamente
    const channel = supabase
      .channel("hall_of_fame_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hall_of_fame" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from("hall_of_fame")
      .select("*")
      .order("created_at", { ascending: false });

    setChampions(data || []);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-6xl font-black mb-2">
        🏛️ Hall da Fama
      </h1>

      <p className="text-slate-400 mb-10">
        Campeões históricos do Videokê
      </p>

      {champions.length === 0 ? (
        <div className="bg-slate-800 rounded-3xl p-8 text-center text-slate-400">
          Nenhum campeão registrado.
        </div>
      ) : (
        <div className="space-y-4">
          {champions.map((champion, index) => (
            <div
              key={champion.id}
              className="bg-slate-800 rounded-3xl p-6 flex justify-between items-center shadow-xl"
            >
              <div>
                <div className="text-3xl font-black">
                  🥇 {champion.champion_name}
                </div>
                <div className="text-slate-400 text-sm mt-1">
                  {champion.event_date || "Data não informada"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-black text-yellow-400">
                  ⭐ {champion.champion_average ? Number(champion.champion_average).toFixed(2) : "0.00"}
                </div>
                <div className="text-slate-400 text-sm mt-1">
                  {champion.champion_presentations || champion.total_presentations || 0} apresentação(ões)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}