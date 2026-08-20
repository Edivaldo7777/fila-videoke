export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">

          <h1 className="text-2xl font-black">
            🎤 FILA VIDEOKÊ
          </h1>

          <button
            onClick={() => {
              window.location.href = "/auth/login";
            }}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded"
          >
            🔐 Login Membros
          </button>

        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">

        <h2 className="text-5xl font-black mb-6">
          Transforme seu Karaokê em uma Experiência Profissional
        </h2>

        <p className="text-xl text-slate-300 mb-10">
          Controle filas automaticamente, organize cantores,
          utilize QR Code, exiba rankings ao vivo e encante seus clientes.
        </p>

        <div className="flex justify-center gap-4 flex-wrap">

          <button
            onClick={() => {
              document
                .getElementById("planos")
                ?.scrollIntoView({
                  behavior: "smooth",
                });
            }}
            className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded font-bold"
          >
            🚀 Conhecer Planos
          </button>

          <button
            onClick={() => {
              window.location.href = "/auth/register";
            }}
            className="border border-white px-8 py-4 rounded font-bold"
          >
            📝 Criar Conta
          </button>

        </div>

      </section>

      {/* Benefícios */}
      <section className="bg-slate-900 py-16">

        <div className="max-w-6xl mx-auto px-6">

          <h3 className="text-4xl font-black text-center mb-12">
            Tudo o que você precisa
          </h3>

          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-slate-800 p-6 rounded-xl text-center">
              🎤 Fila Inteligente
            </div>

            <div className="bg-slate-800 p-6 rounded-xl text-center">
              📺 TV para o Público
            </div>

            <div className="bg-slate-800 p-6 rounded-xl text-center">
              📱 QR Code para Entrada
            </div>

            <div className="bg-slate-800 p-6 rounded-xl text-center">
              ⭐ Jurados e Notas
            </div>

            <div className="bg-slate-800 p-6 rounded-xl text-center">
              🏆 Ranking Automático
            </div>

            <div className="bg-slate-800 p-6 rounded-xl text-center">
              👑 Hall da Fama
            </div>

          </div>

        </div>

      </section>

      {/* Planos */}
      <section
        id="planos"
        className="py-20"
      >

        <div className="max-w-7xl mx-auto px-6">

          <h3 className="text-5xl font-black text-center mb-12">
            Escolha seu Plano
          </h3>

          <div className="grid md:grid-cols-3 gap-8">

            <div className="bg-slate-800 p-8 rounded-2xl">
              <h4 className="text-3xl font-black mb-4">
                🟢 Básico
              </h4>

              <p className="mb-2">✅ 1 Sala</p>
              <p className="mb-2">✅ QR Code</p>
              <p className="mb-2">✅ Ranking</p>

              <button
                onClick={() => {
                  window.location.href =
                    "/auth/register";
                }}
                className="bg-green-600 w-full mt-6 py-3 rounded"
              >
                Criar Conta
              </button>
            </div>

            <div className="bg-blue-700 p-8 rounded-2xl">
              <h4 className="text-3xl font-black mb-4">
                🟡 Pro
              </h4>

              <p className="mb-2">✅ 3 Salas</p>
              <p className="mb-2">✅ Jurados</p>
              <p className="mb-2">✅ Hall da Fama</p>

              <button
                onClick={() => {
                  window.location.href =
                    "/auth/register";
                }}
                className="bg-white text-blue-700 w-full mt-6 py-3 rounded font-black"
              >
                Criar Conta
              </button>
            </div>

            <div className="bg-slate-800 p-8 rounded-2xl">
              <h4 className="text-3xl font-black mb-4">
                🔵 Premium
              </h4>

              <p className="mb-2">✅ 10 Salas</p>
              <p className="mb-2">✅ Todos os Recursos</p>
              <p className="mb-2">✅ Operação Profissional</p>

              <button
                onClick={() => {
                  window.location.href =
                    "/auth/register";
                }}
                className="bg-blue-600 w-full mt-6 py-3 rounded"
              >
                Criar Conta
              </button>
            </div>

          </div>

        </div>

      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-green-600 to-blue-600 py-20 text-center">

        <h3 className="text-5xl font-black mb-4">
          Organize seu Karaokê como um profissional
        </h3>

        <p className="text-xl mb-8">
          Mais controle, mais organização e uma experiência incrível
          para seus clientes.
        </p>

        <button
          onClick={() => {
            window.location.href =
              "/auth/register";
          }}
          className="bg-white text-black px-8 py-4 rounded-xl font-black"
        >
          🚀 Criar Minha Conta
        </button>

      </section>

    </main>
  );
}