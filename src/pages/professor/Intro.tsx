// file: src/pages/WelcomeCinematic.tsx
import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { gsap } from "gsap";

type Props = { name?: string; nextHref?: string };

export default function WelcomeCinematic({ name, nextHref = "/aluno" }: Props) {
  const [params] = useSearchParams();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const spotlight = useRef<HTMLDivElement>(null);

  const line1 = useRef<HTMLDivElement>(null); // “Bem-vindo, …”
  const line2 = useRef<HTMLDivElement>(null); // “Estamos a reinventar…”
  const line3 = useRef<HTMLDivElement>(null); // capítulo 3
  const chips = useRef<HTMLDivElement>(null); // feature chips
  const cta = useRef<HTMLDivElement>(null); // botões
  const badge = useRef<HTMLDivElement>(null); // selo/anos

  const navigate = useNavigate();

  const fullName = useMemo(() => {
    const qname = params.get("name");
    return name ?? qname ?? "Encarregado de Educação";
  }, [name, params]);

  /* util: split text em spans para animação por letra */
  const splitIntoSpans = (el?: HTMLElement | null) => {
    if (!el) return;
    const text = el.innerText;
    el.innerHTML = "";
    const frag = document.createDocumentFragment();
    [...text].forEach((ch) => {
      const s = document.createElement("span");
      s.textContent = ch;
      s.style.display = "inline-block";
      s.style.whiteSpace = ch === " " ? "pre" : "normal";
      frag.appendChild(s);
    });
    el.appendChild(frag);
  };

  useEffect(() => {
    if (!root.current) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // preparar splits
    splitIntoSpans(line1.current!);
    splitIntoSpans(line2.current!);

    const ctx = gsap.context((self) => {
      /* ===== Starfield ===== */
      if (!prefersReduced && canvas.current) {
        const c = canvas.current;
        const cx = c.getContext("2d")!;
        let w = (c.width = c.offsetWidth * devicePixelRatio);
        let h = (c.height = c.offsetHeight * devicePixelRatio);
        const stars = Array.from({ length: 180 }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random() * 0.7 + 0.3,
          s: Math.random() * 1.7 + 0.4,
        }));
        const onResize = () => {
          w = (c.width = c.offsetWidth * devicePixelRatio);
          h = (c.height = c.offsetHeight * devicePixelRatio);
        };
        window.addEventListener("resize", onResize);
        self.add(() => window.removeEventListener("resize", onResize));

        let raf = 0;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          cx.clearRect(0, 0, w, h);
          cx.globalCompositeOperation = "lighter";
          for (const st of stars) {
            st.x += (0.15 + st.z) * devicePixelRatio;
            if (st.x > w + 20) st.x = -20;
            cx.globalAlpha = 0.5 * st.z + 0.25;
            cx.beginPath();
            cx.arc(st.x, st.y, st.s * devicePixelRatio, 0, Math.PI * 2);
            cx.fillStyle = "rgba(255,255,255,0.9)";
            cx.fill();
          }
        };
        loop();
        self.add(() => cancelAnimationFrame(raf));
      }

      /* ===== Spotlight segue o rato (dentro do root) ===== */
      if (!prefersReduced && spotlight.current) {
        const qx = gsap.quickTo(spotlight.current, "x", { duration: 0.25, ease: "power3.out" });
        const qy = gsap.quickTo(spotlight.current, "y", { duration: 0.25, ease: "power3.out" });
        const move = (e: MouseEvent) => {
          const r = root.current!.getBoundingClientRect();
          qx(e.clientX - r.left);
          qy(e.clientY - r.top);
        };
        root.current?.addEventListener("mousemove", move);
        self.add(() => root.current?.removeEventListener("mousemove", move));
      }

      /* ===== Lines/Chapters Timeline ===== */
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // fade geral
      tl.from(".wc-veil", { autoAlpha: 0, scale: 1.02, duration: 0.6 }, 0);

      // Capítulo 1: Bem-vindo
      const l1Spans = line1.current?.querySelectorAll("span") ?? [];
      tl.from(l1Spans, {
        y: 28,
        opacity: 0,
        rotateX: -40,
        transformOrigin: "0 100%",
        stagger: 0.028,
        duration: 0.9,
      }, 0.05);

      // selo/badge
      if (badge.current) {
        tl.from(badge.current, { y: -14, opacity: 0, scale: 0.98, duration: 0.6 }, 0.35);
      }

      // Capítulo 2: Reinventar a educação
      const l2Spans = line2.current?.querySelectorAll("span") ?? [];
      tl.from(l2Spans, {
        y: 28,
        opacity: 0,
        rotateX: -40,
        transformOrigin: "0 100%",
        stagger: 0.022,
        duration: 0.9,
      }, 0.55);

      // Chips / Features
      if (chips.current) {
        tl.from(chips.current.querySelectorAll(".chip"), {
          y: 18,
          opacity: 0,
          scale: 0.98,
          filter: "blur(6px)",
          stagger: 0.06,
          duration: 0.6,
        }, 0.8);
      }

      // Capítulo 3: “Continua tu” — frase de ponte
      if (line3.current) {
        tl.from(line3.current, {
          y: 16,
          opacity: 0,
          duration: 0.7,
        }, 1.0);
      }

      // CTA
      if (cta.current) {
        tl.from(cta.current, { y: 18, opacity: 0, duration: 0.7 }, 1.15);
      }

      // looper subtle nos auroras
      if (!prefersReduced) {
        gsap.to(".aurora", {
          xPercent: (i) => (i % 2 ? 10 : -8),
          skewX: (i) => (i % 2 ? -8 : 6),
          duration: 6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.2,
        });

        gsap.to(".wc-glow", {
          opacity: 0.22,
          filter: "blur(28px)",
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      /* ===== teclas ===== */
      const onKey = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === "s") {
          navigate(nextHref);
        } else if (e.key.toLowerCase() === "g") {
          root.current?.classList.toggle("wc-glitch");
        }
      };
      window.addEventListener("keydown", onKey);
      self.add(() => window.removeEventListener("keydown", onKey));
    }, root);

    return () => ctx.revert();
  }, [fullName, navigate, nextHref]);

  return (
    <div
      ref={root}
      className="relative min-h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_top_left,theme(colors.indigo.500/.22),transparent_38%),radial-gradient(ellipse_at_bottom_right,theme(colors.fuchsia.500/.20),transparent_38%),hsl(var(--background))]"
    >
      {/* auroras */}
      <div className="wc-veil aurora pointer-events-none absolute -left-40 -top-32 h-[56rem] w-[56rem] rounded-full blur-3xl opacity-50" style={{ backgroundImage: "var(--gradient-hero)" }} />
      <div className="wc-veil aurora pointer-events-none absolute -right-40 -bottom-40 h-[56rem] w-[56rem] rounded-full blur-3xl opacity-40" style={{ backgroundImage: "var(--gradient-hero)" }} />

      {/* starfield */}
      <canvas ref={canvas} className="absolute inset-0 -z-10 h-full w-full" />

      {/* noise overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.05] mix-blend-overlay [background-image:radial-gradient(transparent,transparent),url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%2240%22 height=%2240%22 filter=%22url(%23n)%22 opacity=%220.20%22/></svg>')]" />

      {/* spotlight */}
      <div
        ref={spotlight}
        className="pointer-events-none absolute left-0 top-0 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 [background:radial-gradient(circle_at_center,rgba(255,255,255,.14),transparent_60%)] mix-blend-overlay"
        aria-hidden
      />

      {/* conteúdo */}
      <div className="relative z-10 mx-auto grid min-h-dvh max-w-6xl place-items-center px-6">
        <div className="w-full text-center">
          {/* glow central */}
          <div className="wc-glow absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-20" style={{ backgroundImage: "var(--gradient-hero)" }} />

          {/* capítulo 1 */}
          <h1
            ref={line1}
            className="wc-veil text-balance text-4xl font-black tracking-tight text-white/95 sm:text-5xl"
          >
            Bem-vindo, {fullName}.
          </h1>

          {/* selo */}
          <div
            ref={badge}
            className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur"
          >
            <span className="inline-block size-2 rounded-full bg-emerald-400/90 shadow" />
            Feito em Portugal • Tecnologia + Pedagogia
          </div>

          {/* capítulo 2 */}
          <h2
            ref={line2}
            className="wc-veil mt-6 text-balance text-lg font-medium text-white/85 sm:text-xl"
          >
            Estamos a reinventar a educação em Portugal.
          </h2>

          {/* chips de “promessa” */}
          <div ref={chips} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              "Aulas personalizadas por objetivos",
              "Feedback claro e prazos definidos",
              "Comunicação ágil com professores",
              "Indicadores de progresso em tempo real",
              "Gestão de pagamentos simples e segura",
            ].map((t) => (
              <div
                key={t}
                className="chip group rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur transition hover:bg-white/8"
              >
                {t}
              </div>
            ))}
          </div>

          {/* capítulo 3 — continua a história */}
          <p ref={line3} className="mt-8 text-pretty text-sm text-white/70 sm:text-base">
            Hoje é o primeiro passo. Vamos ajudar o teu educando a desenvolver hábitos,
            autonomia e confiança — com dados, método e um plano que tu acompanhas.
          </p>

          {/* CTA */}
          <div ref={cta} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to={nextHref}>Entrar no portal</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/aluno/materiais">Ver como funciona</Link>
            </Button>
            <Button size="icon" variant="ghost" className="ml-1" onClick={() => navigate(nextHref)} title="Premir S para skip">
              S
            </Button>
          </div>
        </div>
      </div>

      {/* estilos locais (glitch opcional) */}
      <style>{`
        .wc-glitch h1 span, .wc-glitch h2 span {
          animation: wc-glitch 1.2s infinite steps(2,end);
        }
        @keyframes wc-glitch {
          0% { transform: translate(0,0); filter: hue-rotate(0deg); }
          25% { transform: translate(-1px,1px) skewX(0.5deg); }
          50% { transform: translate(1px,-1px) skewY(-0.5deg); filter: hue-rotate(10deg); }
          75% { transform: translate(-0.5px,0.5px); }
          100% { transform: translate(0,0); filter: hue-rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
