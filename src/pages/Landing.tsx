// file: src/pages/Landing.tsx
import React, { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useMotionValue,
  useTransform,
} from "framer-motion";
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

/* ===================== Vercel ===================== */
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

/* ===================== Supabase ===================== */
import { supabase } from "@/integrations/supabase/client";

/* ===================== Config ===================== */
const logoUrl =
  "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/logo_cores.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvbG9nb19jb3Jlcy5wbmciLCJpYXQiOjE3NTU4OTYxNzksImV4cCI6MTc4NzQzMjE3OX0.HEDtP3Fbr-pvtGXQw4ldcFHKNk4U6Btx21sBIZ5XjcU";

const aboutImgUrl =
  "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/sobrenos.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvc29icmVub3MucG5nIiwiaWF0IjoxNzU1OTAwNzIzLCJleHAiOjE3ODc0MzY3MjN9.4_SAUtdyXAKhmb0UDuelUuMJRP4QqVk6wKa89cdY7wk";

/* ====================== Styles ===================== */
const LANDING_CSS = String.raw`
@keyframes auroraShift {
  0% { transform: translate3d(0,0,0) rotate(0deg); filter: hue-rotate(0deg) saturate(1.05); }
  50% { transform: translate3d(-6%, -4%, 0) rotate(10deg); filter: hue-rotate(15deg) saturate(1.2); }
  100% { transform: translate3d(0,0,0) rotate(0deg); filter: hue-rotate(0deg) saturate(1.05); }
}
.hero-aurora { position: absolute; inset: -30vh -10vw -10vh -10vw; z-index: -3; filter: blur(28px) saturate(120%); pointer-events: none; }
.hero-aurora > div {
  position:absolute; inset:0;
  background:
    radial-gradient(40% 60% at 15% 20%, rgba(124,58,237,.45), transparent 55%),
    radial-gradient(45% 55% at 80% 25%, rgba(59,130,246,.42), transparent 60%),
    radial-gradient(55% 70% at 50% 85%, rgba(217,70,239,.34), transparent 60%);
  animation: auroraShift 22s ease-in-out infinite;
}

/* brand text */
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
  background-clip: text; -webkit-background-clip: text; color: transparent;
  animation: brandFlow 14s ease-in-out infinite;
}

/* pulse */
@keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,.35) } 70% { box-shadow: 0 0 0 16px rgba(99,102,241,0) } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0) } }

/* card glow */
.card-glow::before{
  content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none;
  background: radial-gradient(160px 140px at var(--mx,50%) var(--my,50%), rgba(139,92,246,.16), transparent 65%);
}

/* marquee */
@keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }

/* scroller único */
.app-scroll { scrollbar-gutter: stable both-edges; }
.app-scroll::-webkit-scrollbar { width: 10px; }
.app-scroll::-webkit-scrollbar-track { background: transparent; }
.app-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(139,92,246,.65), rgba(99,102,241,.65));
  border-radius: 999px; border: 2px solid transparent; background-clip: padding-box;
}
.app-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(139,92,246,.85), rgba(99,102,241,.85)); }
.app-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,.75) transparent; }
`;

/* ====================== Data ====================== */
const services = [
  { icon: GraduationCap, title: "Explicações Individuais", desc: "Plano 100% personalizado e foco total nos objetivos." },
  { icon: Calculator, title: "Matemática & Ciências", desc: "Preparação intensiva para testes e exames." },
  { icon: BookOpen, title: "Estudo Acompanhado", desc: "Rotina, técnicas de estudo e gestão do tempo." },
  { icon: Users2, title: "Workshops em Grupo", desc: "Sessões práticas com feedback e colaboração." },
];

/* parceiros */
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
  /* ===== Parallax ===== */
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollY } = useScroll({ target: heroRef });
  const lift = useTransform(scrollY, [0, 400], [0, -40]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sBackY = useTransform(scrollY, [0, 400], [0, 30]);
  const sMidY = useTransform(scrollY, [0, 400], [0, 50]);
  const sFrontY = useTransform(scrollY, [0, 400], [0, 80]);
  const rBackX = useTransform(mx, (v) => v * -20);
  const rBackY = useTransform(my, (v) => v * -14);
  const rMidX = useTransform(mx, (v) => v * -35);
  const rMidY = useTransform(my, (v) => v * -26);
  const rFrontX = useTransform(mx, (v) => v * -55);
  const rFrontY = useTransform(my, (v) => v * -40);
  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) / r.width);
    my.set((e.clientY - (r.top + r.height / 2)) / r.height);
  }

  /* ===== Marquee duration (dinâmico, sem .to()) ===== */
  const marqueeDur = useTransform(scrollY, [0, 1000], [22, 16]); // segundos
  const marqueeDurCss = useTransform(marqueeDur, (v) => `${v}s`);

  /* ===== Formulário Contactos (Supabase) ===== */
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    website: "", // honeypot (deixa vazio)
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (form.website) return;

    if (form.name.trim().length < 2) return setErrorMsg("Nome demasiado curto.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErrorMsg("Email inválido.");
    if (form.message.trim().length < 10) return setErrorMsg("Mensagem demasiado curta.");

    setStatus("sending");
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim(),
      user_agent: navigator.userAgent,
    });

    if (error) {
      setStatus("error");
      setErrorMsg("Ocorreu um erro ao enviar. Tenta novamente.");
      return;
    }

    setStatus("success");
    setForm({ name: "", email: "", phone: "", message: "", website: "" });
  }

  return (
    <div className="relative h-[100svh] overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-3">
                <img src={logoUrl} alt="Árvore do Conhecimento" className="h-9 w-auto" />
                <span className="hidden sm:inline-block font-extrabold tracking-tight text-[1.125rem] brand-text">
                  Árvore do Conhecimento
                </span>
              </Link>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <a href="#sobre" className="px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition text-[0.92rem]">Sobre</a>
              <a href="#fundadoras" className="px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition text-[0.92rem]">Fundadoras</a>
              <a href="#servicos" className="px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition text-[0.92rem]">Serviços</a>
              <a href="#parcerias" className="px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition text-[0.92rem]">Parcerias</a>
              <a href="#contactos" className="px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition text-[0.92rem]">Contactos</a>
              <Button asChild size="sm" className="ml-3 h-9 px-4 text-[0.92rem]">
                <a href="https://www.arvoreconhecimento.com/auth" target="_blank" rel="noopener noreferrer">
                  Área reservada
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== SCROLLER ÚNICO ===== */}
      <main className="app-scroll snap-y snap-mandatory h-[100svh] overflow-y-scroll scroll-smooth">
        {/* ===== HERO ===== */}
        <section
          ref={heroRef}
          onMouseMove={handleMouse}
          className="relative h-[100svh] snap-start flex items-center justify-center overflow-hidden"
        >
          {/* aurora */}
          <div className="hero-aurora"><div /></div>

          {/* parallax camadas */}
          <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ x: rBackX, y: sBackY }}>
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(1px_1px_at_20%_30%,_rgba(255,255,255,.6),transparent_60%),radial-gradient(1px_1px_at_70%_60%,_rgba(255,255,255,.4),transparent_60%),radial-gradient(1px_1px_at_40%_80%,_rgba(255,255,255,.5),transparent_60%)] [background-size:260px_260px]" />
          </motion.div>
          <motion.div aria-hidden className="pointer-events-none absolute -inset-x-[10vw] -inset-y-[8vh] z-0 blur-2xl" style={{ x: rMidX, y: sMidY }}>
            <div className="absolute w-[36vw] h-[36vw] -left-[6vw] top-[10vh] rounded-full opacity-40" style={{ background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,.55), transparent 60%)" }} />
            <div className="absolute w-[32vw] h-[32vw] right-[2vw] top-[20vh] rounded-full opacity-35" style={{ background: "radial-gradient(circle at 60% 40%, rgba(139,92,246,.50), transparent 60%)" }} />
            <div className="absolute w-[40vw] h-[40vw] left-1/2 -translate-x-1/2 bottom-[6vh] rounded-full opacity-30" style={{ background: "radial-gradient(circle at 50% 50%, rgba(217,70,239,.45), transparent 65%)" }} />
          </motion.div>
          <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ x: rFrontX, y: sFrontY }}>
            <div className="absolute left-[10%] top-[22%] w-24 h-24 rounded-full border border-indigo-400/30" />
            <div className="absolute right-[12%] top-[30%] w-16 h-16 rounded-full border border-fuchsia-400/30" />
            <div className="absolute left-[22%] bottom-[18%] w-10 h-10 rotate-6 rounded-[12px] border border-violet-400/30" />
          </motion.div>

          {/* conteúdo hero */}
          <motion.div style={{ y: lift }} className="relative z-10 text-center px-6 pt-24">
            <motion.h1 variants={fadeUp} initial="hidden" animate="show" className="text-[2.65rem] leading-[1.05] sm:text-[3.75rem] sm:leading-[1.05] font-extrabold tracking-tight brand-text">
              Aprende mais, melhor.
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} initial="hidden" animate="show" className="mt-4 max-w-2xl mx-auto text-[1.05rem] sm:text-lg text-muted-foreground">
              Acompanhamos-te de forma real, com planos personalizados e resultados visíveis.
            </motion.p>
          </motion.div>

          {/* botão fundo */}
          <button
            onClick={() => scrollToId("sobre")}
            className="group absolute z-10 left-1/2 -translate-x-1/2 bottom-[6px] sm:bottom-[10px] grid place-items-center"
            aria-label="Scroll para a próxima secção"
            title="Desliza"
          >
            <span className="block h-2 w-2 rounded-[4px] border border-primary/60 bg-primary/30 group-hover:bg-primary/50 transition" style={{ animation: "pulseRing 2.4s ease-out infinite" }} />
            <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground group-hover:text-primary transition" />
          </button>
        </section>

        {/* ===== SOBRE (−10%) ===== */}
        <section id="sobre" className="relative min-h-[100svh] snap-start grid place-items-center py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="scale-[0.9] origin-center">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-4 w-4" /> Sobre o Centro
                  </div>
                  <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight brand-text">
                    Metodologia prática, acompanhamento real
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Espaço onde todos podem aprender e ensinar, através da partilha de saberes, experiências e conhecimentos.
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

                <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative">
                  <div className="relative w-full max-w-[560px] mx-auto">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden border bg-gradient-to-br from-indigo-400/15 via-violet-400/15 to-fuchsia-400/15 card-glow" />
                    <motion.img
                      src={aboutImgUrl}
                      alt="O nosso centro"
                      whileHover={{ y: -2, rotate: -0.5 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="absolute -left-6 top-8 w-[88%] aspect-[4/3] object-cover rounded-xl border shadow-xl bg-background"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FUNDADORAS (sem fotos) ===== */}
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
                { name: "Margarida", role: "Co-fundadora · Matemática", bio: "15 anos a preparar alunos para exames nacionais.", links: { linkedin: "#", instagram: "#" } },
                { name: "Sílvia", role: "Co-fundadora · Línguas & Estudo", bio: "Técnicas de estudo e organização para resultados sustentáveis.", links: { linkedin: "#", instagram: "#" } },
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
              <p className="mt-2 text-muted-foreground">Formatos presenciais e online — simples e flexíveis.</p>
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

              {/* Marquee com duração dinâmica */}
              <motion.div
                className="whitespace-nowrap will-change-transform"
                style={{
                  animationName: "marquee",
                  animationTimingFunction: "linear",
                  animationIterationCount: "infinite",
                  animationDuration: marqueeDurCss,
                }}
              >
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
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===== CONTACTOS (−20%) + Footer integrado ===== */}
        <section
          id="contactos"
          className="relative min-h-[100svh] snap-start grid place-items-center pt-20 pb-12"
        >
          <div className="mx-auto max-w-6xl px-4">
            <div className="scale-[0.9] origin-center">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Card info (menos padding) */}
                <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="rounded-2xl border bg-card p-4">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-4 w-4" /> Contactos
                  </div>
                  <h2 className="mt-4 text-xl font-bold brand-text">Fala connosco</h2>
                  <div className="mt-3 grid gap-3 text-sm">
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
                      <a href="mailto:arvoreconhecimento.rm@gmail.com" className="hover:underline">arvoreconhecimento.rm@gmail.com</a>
                    </div>
                    <div className="pt-1.5">
                      <Button size="sm" asChild>
                        <a href="mailto:apoio@arvoredoconhecimento.pt">Enviar email</a>
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Form (Supabase) - menos padding */}
                <motion.form
                  variants={fadeUp}
                  custom={1}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="rounded-2xl border bg-card p-4 grid gap-3"
                  onSubmit={submitContact}
                >
                  {/* honeypot */}
                  <label className="absolute left-[-9999px] top-auto w-px h-px overflow-hidden">
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    />
                  </label>

                  <div>
                    <label className="text-sm font-medium">Nome</label>
                    <input
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Telefone</label>
                      <input
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mensagem</label>
                    <textarea
                      className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2"
                      required
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-xs text-muted-foreground">
                      Respondemos no próprio dia útil.
                    </span>
                    <Button type="submit" disabled={status === "sending"}>
                      {status === "sending" ? "A enviar..." : "Enviar"}
                    </Button>
                  </div>

                  {status === "success" && (
                    <p className="text-xs text-green-600 mt-1">Obrigado! Mensagem enviada com sucesso.</p>
                  )}
                  {status === "error" && (
                    <p className="text-xs text-red-600 mt-1">{errorMsg ?? "Ocorreu um erro."}</p>
                  )}
                  {errorMsg && status !== "error" && (
                    <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                  )}
                </motion.form>
              </div>

              {/* Footer integrado */}
              <div className="w-full border-t mt-8">
                <div className="mx-auto max-w-6xl px-2 sm:px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Vercel Analytics + Speed Insights ===== */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
