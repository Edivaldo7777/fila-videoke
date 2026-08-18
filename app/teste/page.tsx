"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function TestePage() {
  const [mensagem, setMensagem] = useState("");

  async function gravar() {
    const { error } = await supabase
      .from("queue")
      .insert({
        room_code: "TESTE",
        singer_name: "JOAO",
        song_name: "EVIDENCIAS",
      });

    if (error) {
      setMensagem(`Erro: ${error.message}`);
      return;
    }

    setMensagem("Registro gravado com sucesso!");
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Teste Supabase</h1>

      <button onClick={gravar}>
        Gravar Registro
      </button>

      <p>{mensagem}</p>
    </main>
  );
}