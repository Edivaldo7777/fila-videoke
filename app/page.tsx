"use client";
import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05050a] text-slate-100 font-sans selection:bg-fuchsia-500 selection:text-white overflow-hidden">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/20 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#05050a]/60">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center font-black text-xl">
                K
              </div>
              <h1 className="text-xl font-bold tracking-wider">
                FILA <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-violet-400">VIDEOKÊ</span>
              </h1>
            </div>

            <button
              onClick={() => window.location.href = "/auth/login"}
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
              Acesso Restrito
            </button>
          </div>
        </header>

        {/* Hero Section - O Hook (Gancho) Emocional */}
        <section className="max-w-7xl mx-auto px-6 py-24 md:py-32 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-fuchsia-400 text-sm font-medium mb-8 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
            A revolução do entretenimento chegou
          </div>
          
          <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
            Chega de papelzinho. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400">
              O palco do seu bar merece ser lendário.
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-3xl leading-relaxed">
            Acabe com a confusão, as reclamações e o amadorismo. Uma plataforma premium que transforma o Karaokê do seu estabelecimento em um verdadeiro espetáculo de tecnologia e vendas.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => window.location.href = "/auth/register"}
              className="bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center justify-center gap-3"
            >
              Criar Conta Gratuitamente
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>

            <button
              onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 px-8 py-4 rounded-xl font-bold text-lg transition-all"
            >
              Ver Planos e Preços
            </button>
          </div>
        </section>

        {/* Problema vs Solução (Agitando a dor do cliente) */}
        <section className="py-16 bg-black/40 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-4">Seu cliente veio para cantar, não para passar raiva na fila.</h3>
                <p className="text-slate-400 mb-6 text-lg">
                  Esqueça os papéis perdidos, as acusações de "ele furou a fila" e o DJ sobrecarregado. Com o Fila Videokê, seu cliente foca no que importa: <strong className="text-white">consumir no seu bar enquanto aguarda seu momento de estrela.</strong>
                </p>
                <ul className="space-y-4">
                  {[
                    "Aumento de 30% na retenção de clientes",
                    "Redução total do atrito e estresse da equipe",
                    "Aparência moderna, tecnológica e exclusiva"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
                  {/* Mockup de Interface */}
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <div className="text-lg font-bold">📺 Tela do Bar (Ao Vivo)</div>
                    <div className="text-fuchsia-400 animate-pulse flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> Cantando Agora
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-fuchsia-500/30">
                    <div className="text-sm text-slate-400">Mesa 12</div>
                    <div className="text-2xl font-black text-white">João Silva</div>
                    <div className="text-fuchsia-400">Evidências - Chitãozinho & Xororó</div>
                  </div>
                  <div className="opacity-50">
                    <div className="text-sm font-semibold mb-2">Próximos:</div>
                    <div className="bg-slate-800/50 rounded-lg p-3 mb-2 flex justify-between">
                      <span>Mariana (Mesa 04)</span>
                      <span className="text-slate-400">Tempo: ~4 min</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 flex justify-between">
                      <span>Pedro (Mesa 09)</span>
                      <span className="text-slate-400">Tempo: ~8 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios Mapeados como Experiência */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-black mb-4">Engrenagens de um Show Perfeito</h3>
            <p className="text-xl text-slate-400">Não é apenas uma fila. É um ecossistema de entretenimento.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "📱", title: "Autoatendimento via QR Code", desc: "O cliente escaneia o código na mesa, escolhe a música no próprio celular e entra na fila automaticamente. Menos trabalho para seus garçons." },
              { icon: "📺", title: "TV de Retorno Profissional", desc: "Uma interface linda projetada nas TVs do bar, mostrando quem canta agora e os próximos, gerando expectativa e prendendo a atenção." },
              { icon: "⭐", title: "Sistema de Jurados (Nova febre)", desc: "Gamifique a noite. Permita que o público da casa ou jurados escolhidos dêem notas. O bar todo participa do show." },
              { icon: "🏆", title: "Ranking e Premiações", desc: "Placar ao vivo das melhores apresentações da noite. Perfeito para o bar sortear drinks e criar engajamento." },
              { icon: "👑", title: "Hall da Fama", desc: "Mantenha o histórico dos 'Astros da Casa'. Fidelize os clientes que amam voltar para defender seu primeiro lugar." },
              { icon: "⚡", title: "Controle Total do DJ", desc: "Pause, pule, adicione ou remova cantores com um toque. O poder total na mão do host do seu karaokê." },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all hover:-translate-y-1 group">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform origin-left">{feature.icon}</div>
                <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing / Planos */}
        <section id="planos" className="py-24 bg-black/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-4xl md:text-5xl font-black mb-4">Um investimento que se paga na primeira noite.</h3>
              <p className="text-xl text-slate-400">Escolha o plano ideal para o tamanho do seu palco.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
              
              {/* Básico */}
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl">
                <div className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-2">Iniciante</div>
                <h4 className="text-3xl font-black mb-2">Básico</h4>
                <p className="text-slate-400 mb-8 pb-8 border-b border-white/10">Para bares pequenos que querem começar a se organizar.</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">✅ 1 Ambiente/Sala</li>
                  <li className="flex items-center gap-3">✅ Fila via QR Code</li>
                  <li className="flex items-center gap-3">✅ Tela de Apresentação</li>
                </ul>
                <button
                  onClick={() => window.location.href = "/auth/register"}
                  className="w-full py-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Começar Básico
                </button>
              </div>

              {/* Pro (Destaque) */}
              <div className="relative bg-gradient-to-b from-fuchsia-900/40 to-violet-900/40 border border-fuchsia-500/50 p-8 rounded-3xl transform md:-translate-y-4 shadow-[0_0_30px_rgba(217,70,239,0.15)]">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  MAIS ESCOLHIDO
                </div>
                <div className="text-fuchsia-400 font-bold tracking-widest uppercase text-sm mb-2">A Experiência Completa</div>
                <h4 className="text-4xl font-black mb-2 text-white">Pro</h4>
                <p className="text-slate-300 mb-8 pb-8 border-b border-white/10">O sistema que transforma seu bar na referência da cidade.</p>
                <ul className="space-y-4 mb-8 font-medium">
                  <li className="flex items-center gap-3 text-white">⭐ Até 3 Salas/Ambientes</li>
                  <li className="flex items-center gap-3 text-white">⭐ Módulo de Jurados e Notas</li>
                  <li className="flex items-center gap-3 text-white">⭐ Hall da Fama e Ranking</li>
                  <li className="flex items-center gap-3 text-white">⭐ Personalização com sua Logo</li>
                </ul>
                <button
                  onClick={() => window.location.href = "/auth/register"}
                  className="w-full py-4 rounded-xl font-black bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 shadow-lg transition-transform hover:scale-105 text-white text-lg"
                >
                  Assinar o Plano Pro
                </button>
              </div>

              {/* Premium */}
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl">
                <div className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-2">Redes & Franquias</div>
                <h4 className="text-3xl font-black mb-2">Premium</h4>
                <p className="text-slate-400 mb-8 pb-8 border-b border-white/10">Para mega operações, redes de bares ou estúdios profissionais.</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">👑 Até 10 Salas Simultâneas</li>
                  <li className="flex items-center gap-3">👑 Suporte Prioritário VIP</li>
                  <li className="flex items-center gap-3">👑 Relatórios de Consumo/Fila</li>
                </ul>
                <button
                  onClick={() => window.location.href = "/auth/register"}
                  className="w-full py-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Falar com Consultor
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* Final CTA (Chamada para Ação Urgente) */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900/80 to-fuchsia-900/80 z-0" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 z-0" />
          
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h3 className="text-5xl md:text-6xl font-black mb-6 text-white drop-shadow-lg">
              Pronto para ser a atração principal da noite?
            </h3>
            <p className="text-2xl mb-10 text-slate-200 font-light">
              Leva menos de 3 minutos para configurar seu bar e imprimir seu primeiro QR Code. 
            </p>
            <button
              onClick={() => window.location.href = "/auth/register"}
              className="bg-white text-black hover:bg-slate-100 px-10 py-5 rounded-full font-black text-xl transition-transform transform hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 mx-auto"
            >
              Criar Minha Conta Agora
              <span className="text-2xl">🔥</span>
            </button>
            <p className="mt-6 text-sm text-slate-300">Não precisa de cartão de crédito para testar.</p>
          </div>
        </section>

        {/* Footer Simples */}
        <footer className="bg-black py-8 border-t border-white/10 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Fila Videokê. Elevando o padrão do entretenimento.</p>
        </footer>

      </div>
    </main>
  );
}