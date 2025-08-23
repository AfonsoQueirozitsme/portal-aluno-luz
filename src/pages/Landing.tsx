// file: src/pages/Landing.tsx
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Sparkles,
  ChevronDown,
  GraduationCap,
  Calculator,
  BookOpen,
  Users2,
  HeartHandshake,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/* ===================== Config ===================== */
const logoUrl =
  "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/logo_cores.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvbG9nb19jb3Jlcy5wbmciLCJpYXQiOjE3NTU4OTYxNzksImV4cCI6MTc4NzQzMjE3OX0.HEDtP3Fbr-pvtGXQw4ldcFHKNk4U6Btx21sBIZ5XjcU";

const aboutImgUrl =
  "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/sobrenos.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvc29icmVub3MucG5nIiwiaWF0IjoxNzU1OTAwNzIzLCJleHAiOjE3ODc0MzY3MjN9.4_SAUtdyXAKhmb0UDuelUuMJRP4QqVk6wKa89cdY7wk";

/* ====================== Styles ===================== */
const LANDING_CSS = String.raw`
/* ----- auroras gerais (fundo) em roxos/indigos ----- */
@keyframes auroraShift {
  0% { transform: translate3d(0,0,0) rotate(0deg); filter: hue-rotate(0deg) saturate(1.05); }
  50% { transform: translate3d(-6%, -4%, 0) rotate(10deg); filter: hue-rotate(15deg) saturate(1.2); }
  100% { transform: translate3d(0,0,0) rotate(0deg); filter: hue-rotate(0deg) saturate(1.05); }
}
.hero-aurora {
  position: absolute; inset: -30vh -10vw -10vh -10vw; z-index: -2;
  filter: blur(28px) saturate(120%); pointer-events: none;
}
.hero-aurora > div {
  position:absolute; inset:0;
  background:
    radial-gradient(40% 60% at 15% 20%, rgba(124,58,237,.45), transparent 55%),
    radial-gradient(45% 55% at 80% 25%, rgba(59,130,246,.42), transparent 60%),
    radial-gradient(55% 70% at 50% 85%, rgba(217,70,239,.34), transparent 60%);
  animation: auroraShift 22s ease-in-out infinite;
}

/* ----- gradiente “brand” para texto (sem verdes) ----- */
@keyframes brandFlow {
  0% { background-position: 0% 50%, 100% 50%, 50% 0%; }
  50% { background-position: 100% 50%, 0% 50%, 50% 100%; }
  100% { background-position: 0% 50%, 100% 50%, 50% 0%; }
}
.brand-text {
  background-image:
    radial-gradient(120% 150% at 10% 10%, #6366f1 0%, transparent 55%),
    radial-gradient(120% 150% at 90% 20%, #8b5cf6 0%, transparent 55%),
    radial-gradient(160% 140% at 50% 90%, #d946ef 0%, transparent 55%);
  background-size: 200% 200%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: brandFlow 14s ease-in-out infinite;
}

/* mini efeitos */
@keyframes float { 0% { transform: translateY(0)} 50% {transform: translateY(-10px)} 100% {transform: translateY(0)} }
@keyframes pulseRing {
  0% { box-shadow: 0 0 0 0 rgba(99,102,241,.35) }
  70% { box-shadow: 0 0 0 16px rgba(99,102,241,0) }
  100% { box-shadow: 0 0 0 0 rgba(99,102,241,0) }
}

/* hover glow dos cards (primário roxo) */
.card-glow::before{
  content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none;
  background: radial-gradient(160px 140px at var(--mx,50%) var(--my,50%), rgba(139,92,246,.16), transparent 65%);
}

/* marquee parcerias */
@keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
`;

/* ====================== Data ====================== */
const services = [
  { icon: GraduationCap, title: "Explicações Individuais", desc: "Plano 100% personalizado e foco total nos objetivos." },
  { icon: Calculator, title: "Matemática & Ciências", desc: "Preparação intensiva para testes e exames." },
  { icon: BookOpen, title: "Estudo Acompanhado", desc: "Rotina, técnicas de estudo e gestão do tempo." },
  { icon: Users2, title: "Workshops em Grupo", desc: "Sessões práticas com feedback e colaboração." },
];

/* Ordem exigida + restantes genéricos */
const partners = [
  { name: "PsicWell", logo: "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/psicwell.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvcHNpY3dlbGwucG5nIiwiaWF0IjoxNzU1ODk5MTM2LCJleHAiOjE3ODc0MzUxMzZ9.USeZHDR8jNL_JHpZl71P5Ww2kzIagrLvBgJhrmFVZFA" },
  { name: "Sílvia Nogueira", logo: "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/silvianogueira.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvc2lsdmlhbm9ndWVpcmEucG5nIiwiaWF0IjoxNzU1ODk5NDUzLCJleHAiOjE3ODc0MzU0NTN9.BUlT1vzdAGpWf3fUTLq5Kc3tBUdIs-2KsxwCBHujFtk" },
  { name: "Oficina da Agulha", logo: "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/oficina_da_agulha.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvb2ZpY2luYV9kYV9hZ3VsaGEucG5nIiwiaWF0IjoxNzU1ODk5MTIwLCJleHAiOjE3ODc0MzUxMjB9.Yyu_pkZ7XXEurHUbMkNVrLXTSG0GZ-d7wOwtJWZ334M" },
  { name: "Nobre", logo: "https://www.nobre.pt/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fnobre_logo.894baa1a.png&w=256&q=75" },
  { name: "Panificadora C&F", logo: "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/cf.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvY2YucG5nIiwiaWF0IjoxNzU1ODk5NjMzLCJleHAiOjE3ODc0MzU2MzN9.El6RbNLz-4rweCXQgKoGsNmNv3Ti7iXiiokNGPuTYfQ" },
  { name: "Comércio & Notícias", logo: "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/comercioenoticias.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvY29tZXJjaW9lbm90aWNpYXMucG5nIiwiaWF0IjoxNzU1ODk5Mjk5LCJleHAiOjE3ODc0MzUyOTl9.OsjoI_pjYXCbQaa1xdv5P2EGxvq62ZJc9iIT3rFl930" },
];

/* ===================== Helpers ===================== */
const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: (i = 0) => ({
    opacity: 1, y: 0, filter: "blur(0)",
    transition: { delay: 0.08 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =================================================== */
export default function Landing() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollY } = useScroll({ target: heroRef });
  const lift = useTransform(scrollY, [0, 400], [0, -40]);

  return (
    <div className="relative bg-gradient-to-b from-background via-background to-muted/30">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      {/* ===== NAVBAR (logo à esquerda + nome com gradiente brand) ===== */}
      <nav className="fixed top-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-2">
            <div className="flex items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-3">
                <img src={logoUrl} alt="Árvore do Conhecimento" className="h-8 w-auto" />
                <span className="hidden sm:inline-block font-bold tracking-tight text-lg brand-text">
                  Árvore do Conhecimento
                </span>
              </Link>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <a href="#sobre" className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition text-sm">Sobre</a>
              <a href="#fundadoras" className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition text-sm">Fundadoras</a>
              <a href="#servicos" className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition text-sm">Serviços</a>
              <a href="#parcerias" className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition text-sm">Parcerias</a>
              <a href="#contactos" className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition text-sm">Contactos</a>
              <Button asChild size="sm" className="ml-2">
  <a href="https://www.arvoreconhecimento.com/auth" target="_blank" rel="noopener noreferrer">
    Área reservada
  </a>
</Button>

            </div>
          </div>
        </div>
      </nav>

      {/* ===== CONTAINER COM SCROLL SNAP (section a section) ===== */}
      <main className="snap-y snap-mandatory h-[100svh] overflow-y-scroll scroll-smooth">
        {/* ===== HERO full-screen ===== */}
        <section
          ref={heroRef}
          className="relative h-[100svh] snap-start flex items-center justify-center overflow-hidden"
        >
          {/* aurora background */}
          <div className="hero-aurora"><div /></div>

          {/* conteúdo */}
          <motion.div style={{ y: lift }} className="relative z-10 text-center px-6 pt-20">
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-4xl sm:text-6xl font-extrabold tracking-tight brand-text"
            >
              Aprende mais, melhor.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="show"
              className="mt-4 max-w-2xl mx-auto text-muted-foreground"
            >
              Acompanhamento real, planos personalizados e resultados visíveis.
            </motion.p>

            {/* quadrado de scroll — muito pequeno, MESMO no fundo centrado */}
            <button
              onClick={() => scrollToId("sobre")}
              className="group absolute left-1/2 -translate-x-1/2 bottom-1 sm:bottom-2 grid place-items-center"
              aria-label="Scroll para a próxima secção"
              title="Desliza"
            >
              <span
                className="block h-2 w-2 rounded-[4px] border border-primary/60 bg-primary/30 group-hover:bg-primary/50 transition"
                style={{ animation: "pulseRing 2.4s ease-out infinite" }}
              />
              <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground group-hover:text-primary transition" />
            </button>
          </motion.div>
        </section>

        {/* ===== SOBRE ===== */}
        <section id="sobre" className="relative min-h-[100svh] snap-start grid place-items-center py-16">
          <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 gap-10 items-center">
            {/* Coluna esquerda (texto) */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" /> Sobre o Centro
              </div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight brand-text">
                Metodologia prática, acompanhamento real
              </h2>
              <p className="mt-3 text-muted-foreground">
                Espaço onde todos podem aprender e ensinar, através da parttilha de saberes, esperiências e conhecimentos.
              </p>
              <ul className="mt-6 grid gap-3 text-sm">
                {[
                  "Ensino personalizado e centrado no aluno",
                  "Foco na compreensão, não na memorização",
                  "Feedback contínuo a alunos e encarregados",
                  "Preparação de testes e exames (com simulações)",
                ].map((t, i) => (
                  <motion.li
                    key={t}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    className="flex items-start gap-3 rounded-lg border p-3 bg-background/60"
                  >
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                    <span>{t}</span>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3">
                <Button onClick={() => scrollToId("servicos")}>Ver serviços</Button>
                <Button asChild variant="outline">
  <a href="https://www.arvoreconhecimento.com/auth" target="_blank" rel="noopener noreferrer">
    Entrar na área reservada
  </a>
</Button>

              </div>
            </motion.div>

            {/* Coluna direita (imagem deslocada sobre quadrado) */}
            <motion.div
              variants={fadeUp}
              custom={1}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative w-full max-w-[560px] mx-auto">
                {/* QUADRADO colorido por baixo */}
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border bg-gradient-to-br from-indigo-400/15 via-violet-400/15 to-fuchsia-400/15 card-glow" />
                {/* FOTO deslocada para baixo e esquerda */}
                <motion.img
                  src={aboutImgUrl}
                  alt="O nosso centro"
                  whileHover={{ y: -2, rotate: -0.5 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="
                    absolute -left-6 top-8
                    w-[88%] aspect-[4/3] object-cover
                    rounded-xl border shadow-xl bg-background
                  "
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== FUNDADORAS ===== */}
        <section id="fundadoras" className="relative min-h-[100svh] snap-start grid place-items-center py-16 bg-gradient-to-b from-transparent to-muted/30">
          <div className="w-full mx-auto max-w-6xl px-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" /> As Fundadoras
              </div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight brand-text">Experiência + inovação</h2>
              <p className="mt-2 text-muted-foreground">
                Duas educadoras com a mesma missão: desbloquear o potencial de cada aluno.
              </p>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-5 place-items-center">
              {[
                {
                  name: "Ana Martins",
                  role: "Co-fundadora · Matemática",
                  img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop",
                  bio: "15 anos a preparar alunos para exames nacionais.",
                  links: { linkedin: "#", instagram: "#" },
                },
                {
                  name: "Joana Pereira",
                  role: "Co-fundadora · Ciências & Estudo",
                  img: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=800&auto=format&fit=crop",
                  bio: "Técnicas de estudo e organização para resultados sustentáveis.",
                  links: { linkedin: "#", instagram: "#" },
                },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="relative w-full max-w-sm overflow-hidden rounded-xl border bg-card"
                >
                  <div className="aspect-[5/4] overflow-hidden">
                    <img src={f.img} alt={f.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h3 className="font-semibold text-base">{f.name}</h3>
                        <p className="text-xs text-muted-foreground">{f.role}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a href={f.links.linkedin} className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition" aria-label="LinkedIn">
                          <Linkedin className="h-4 w-4" />
                        </a>
                        <a href={f.links.instagram} className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition" aria-label="Instagram">
                          <Instagram className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{f.bio}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SERVIÇOS ===== */}
        <section id="servicos" className="relative min-h-[100svh] snap-start grid place-items-center py-16">
          <div className="w-full mx-auto max-w-6xl px-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" /> Serviços
              </div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight brand-text">Tudo para subir de nível</h2>
              <p className="mt-2 text-muted-foreground">
                Formatos presenciais e online — simples e flexíveis.
              </p>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {services.map((s, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  whileHover={{ y: -4, rotateX: 2, rotateY: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative rounded-2xl border bg-card p-5 card-glow"
                  onMouseMove={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    const r = el.getBoundingClientRect();
                    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
                    el.style.setProperty("--my", `${e.clientY - r.top}px`);
                  }}
                >
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/15 text-indigo-500 grid place-items-center mb-3">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  <div className="mt-4">
                    <Button variant="ghost" size="sm">Saber mais</Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PARCERIAS ===== */}
        <section id="parcerias" className="relative min-h-[100svh] snap-start grid place-items-center py-16 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="w-full mx-auto max-w-6xl px-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <HeartHandshake className="h-4 w-4" /> Parcerias
              </div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight brand-text">Juntos, mais longe</h2>
            </div>

            <div className="relative mt-10 overflow-hidden">
              <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-24 rotate-180 bg-gradient-to-r from-background to-transparent" />
              <div className="whitespace-nowrap [animation:marquee_22s_linear_infinite] will-change-transform">
                {[...partners, ...partners].map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-4 mx-6 my-3 px-6 py-4 rounded-2xl border bg-card shadow-sm align-middle"
                    title={p.name}
                  >
                    <img src={p.logo} alt={p.name} className="h-12 w-auto object-contain" />
                    <span className="text-base font-medium text-foreground">{p.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== CONTACTOS ===== */}
        <section id="contactos" className="relative min-h-[100svh] snap-start grid place-items-center py-16">
          <div className="w-full mx-auto max-w-6xl px-4 grid lg:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="rounded-2xl border bg-card p-5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" /> Contactos
              </div>
              <h2 className="mt-2 text-2xl font-bold brand-text">Fala connosco</h2>
              <div className="mt-4 grid gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium">Rio Maior</div>
                    <div className="text-muted-foreground">Rua Dr. Augusto Pedro Branco, n° 5B</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <a href="tel:+351961941388" className="hover:underline">+351 961 941 388</a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href="mailto:arvoreconhecimento.rm@gmail.com" className="hover:underline">
                    arvoreconhecimento.rm@gmail.com
                  </a>
                </div>
                <div className="pt-2">
                  <Button size="lg" asChild>
                    <a href="mailto:apoio@arvoredoconhecimento.pt">Enviar email</a>
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.form
              variants={fadeUp}
              custom={1}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="rounded-2xl border bg-card p-5 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "mailto:arvoreconhecimento.rm@gmail.com";
              }}
            >
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" required />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Mensagem</label>
                <textarea className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2" required />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">Respondemos no próprio dia útil.</span>
                <Button type="submit">Enviar</Button>
              </div>
            </motion.form>
          </div>
        </section>
      </main>

      {/* ===== FOOTER com logo ===== */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-6 w-auto" />
            <span className="text-sm text-muted-foreground brand-text">
              © {new Date().getFullYear()} Árvore do Conhecimento
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition" href="#servicos">Serviços</a>
            <a className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition" href="#parcerias">Parcerias</a>
            <a className="px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition" href="#contactos">Contactos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
