import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";

type Props = { name?: string; nextHref?: string };

export default function WelcomeCinematic({ name, nextHref = "/aluno" }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // roots
  const stage = useRef<HTMLDivElement>(null);
  const starfield = useRef<HTMLCanvasElement>(null);

  // aurora / blobs
  const aurora1 = useRef<HTMLDivElement>(null);
  const aurora2 = useRef<HTMLDivElement>(null);
  const blob1 = useRef<HTMLDivElement>(null);
  const blob2 = useRef<HTMLDivElement>(null);

  // scene blocks (aparecem no MESMO sítio)
  const l1 = useRef<HTMLDivElement>(null);
  const l2 = useRef<HTMLDivElement>(null);
  const l3 = useRef<HTMLDivElement>(null);
  const ready = useRef<HTMLDivElement>(null);

  // texto interno (para split per-letter)
  const t1 = useRef<HTMLDivElement>(null);
  const t2 = useRef<HTMLDivElement>(null);
  const t3 = useRef<HTMLDivElement>(null);

  // logo
  const logoWrap = useRef<HTMLDivElement>(null);
  const flare = useRef<HTMLDivElement>(null);

  const fullName = useMemo(() => {
    const q = params.get("name");
    return name ?? q ?? "Encarregado de Educação";
  }, [name, params]);

  // split por palavra -> depois letras (para não partir palavras em linhas)
  const split = (el?: HTMLElement | null) => {
    if (!el) return;
    const text = el.innerText;
    el.innerHTML = "";
    const tokens = text.split(/(\s+)/); // preserva espaços como tokens
    for (const tok of tokens) {
      if (/^\s+$/.test(tok)) {
        el.appendChild(document.createTextNode(tok));
      } else if (tok.length) {
        const word = document.createElement("span");
        word.style.display = "inline-block";
        word.style.whiteSpace = "nowrap"; // mantém a palavra inteira
        for (const ch of tok) {
          const s = document.createElement("span");
          s.textContent = ch;
          s.style.display = "inline-block";
          word.appendChild(s);
        }
        el.appendChild(word);
      }
    }
  };

  useEffect(() => {
    if (!stage.current) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // preparar letras nos nós de texto (não nos wrappers)
    split(t1.current!);
    split(t2.current!);
    split(t3.current!);

    const ctx = gsap.context((self) => {
      /* ===== STARFIELD (suave) ===== */
      if (!prefersReduced && starfield.current) {
        const c = starfield.current;
        const cx = c.getContext("2d")!;
        let w = (c.width = c.offsetWidth * devicePixelRatio);
        let h = (c.height = c.offsetHeight * devicePixelRatio);

        type Star = { x: number; y: number; z: number; r: number; t: number; s: number };
        const stars: Star[] = Array.from({ length: 140 }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random() * 0.7 + 0.3,
          r: Math.random() * 1.4 + 0.2,
          t: Math.random() * Math.PI * 2,
          s: Math.random() * 0.5 + 0.15,
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
            st.x += (0.12 + st.z * 0.18) * devicePixelRatio;
            if (st.x > w + 20) st.x = -20;
            st.t += 0.02 + st.z * 0.01;
            const tw = 0.55 + Math.sin(st.t) * 0.45;
            cx.globalAlpha = 0.15 + 0.5 * tw * st.z;
            cx.beginPath();
            cx.arc(st.x, st.y, st.r * devicePixelRatio, 0, Math.PI * 2);
            cx.fillStyle = "rgba(255,255,255,0.9)";
            cx.fill();
          }
        };
        loop();
        self.add(() => cancelAnimationFrame(raf));
      }

      /* ===== Aurora / blobs com GSAP (parallax respirando) ===== */
      if (!prefersReduced && aurora1.current && aurora2.current && blob1.current && blob2.current) {
        gsap.to([aurora1.current, aurora2.current], {
          xPercent: (i) => (i ? 8 : -6),
          yPercent: (i) => (i ? -6 : 8),
          duration: 10,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.3,
        });
        gsap.to([blob1.current, blob2.current], {
          scale: (i) => (i ? 1.06 : 1.04),
          rotate: (i) => (i ? 8 : -6),
          duration: 12,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.25,
        });
      }

      /* ===== Timeline “um de cada vez” ===== */
      gsap.set([l1.current, l2.current, l3.current, ready.current], { autoAlpha: 0 });

      const typeIn = (el: HTMLElement, dur = 1.0, stagger = 0.02) =>
        gsap.from(el.querySelectorAll("span"), {
          y: 26,
          opacity: 0,
          rotateX: -35,
          transformOrigin: "0 100%",
          duration: dur,
          stagger,
          ease: "power3.out",
        });

      const hideOut = (el: HTMLElement, dur = 0.5) =>
        gsap.to(el, { autoAlpha: 0, y: -10, duration: dur, ease: "power2.in" });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Logo + flare (entrada breve)
      if (logoWrap.current)
        tl.from(logoWrap.current, { autoAlpha: 0, y: 10, scale: 0.98, duration: 0.6 }, 0);
      if (flare.current) {
        tl.fromTo(
          flare.current,
          { xPercent: -140, opacity: 0 },
          { xPercent: 120, opacity: 0.55, duration: 0.9, ease: "power2.inOut" },
          0.05
        );
      }

      // 1) Bem-vindo
      tl.to(l1.current, { autoAlpha: 1, duration: 0.01 }, 0.25)
        .add(() => typeIn(t1.current!), ">")
        .to({}, { duration: 2.0 })
        .add(() => hideOut(l1.current!), ">");

      // 2) Estamos a reinventar…
      tl.to(l2.current, { autoAlpha: 1, duration: 0.01 }, ">0.2")
        .add(() => typeIn(t2.current!, 0.95, 0.02), ">")
        .to({}, { duration: 2.1 })
        .add(() => hideOut(l2.current!), ">");

      // 3) Começa aqui uma jornada… (fica mais tempo)
      tl.to(l3.current, { autoAlpha: 1, duration: 0.01 }, ">0.2")
        .add(() => typeIn(t3.current!, 1.0, 0.018), ">")
        .to({}, { duration: 3.6 })
        .add(() => hideOut(l3.current!), ">")

        // 4) PRONTO? (botão) + auto-avanço 2s
        .to(ready.current, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out" }, ">0.3")
        .fromTo(
          ready.current!.querySelector("button"),
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
          "<"
        )
        .add(() => {
          const to = setTimeout(() => navigate(nextHref), 2000); // 2s auto-redirect
          self.add(() => clearTimeout(to));
        });

      // atalhos
      const onKey = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        if (k === " " || k === "enter" || k === "s") {
          e.preventDefault();
          navigate(nextHref);
        }
      };
      window.addEventListener("keydown", onKey);
      self.add(() => window.removeEventListener("keydown", onKey));
    }, stage);

    return () => ctx.revert();
  }, [fullName, navigate, nextHref]);

  return (
    <div
      ref={stage}
      className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-emerald-500/10"
    >
      {/* camada de aurora / blobs animados */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* aurora */}
        <div
          ref={aurora1}
          className="absolute -top-40 -left-32 h-[55rem] w-[55rem] rounded-full blur-3xl opacity-60 mix-blend-screen"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(124,58,237,.45), transparent 70%)" }}
        />
        <div
          ref={aurora2}
          className="absolute -bottom-52 -right-32 h-[60rem] w-[60rem] rounded-full blur-3xl opacity-50 mix-blend-screen"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(16,185,129,.35), transparent 70%)" }}
        />

        {/* blobs de vidro coloridos */}
        <div
          ref={blob1}
          className="absolute left-[8%] top-[35%] h-56 w-56 sm:h-72 sm:w-72 rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/40 backdrop-blur-xl border border-white/30 shadow-2xl"
        />
        <div
          ref={blob2}
          className="absolute right-[6%] bottom-[16%] h-52 w-52 sm:h-64 sm:w-64 rounded-[60%_40%_40%_60%/40%_60%_40%_60%] bg-white/30 backdrop-blur-xl border border-white/30 shadow-2xl"
        />

        {/* grão suave */}
        <div
          className="absolute inset-0 opacity-[.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
                 <filter id="n">
                   <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
                 </filter>
                 <rect width="100%" height="100%" filter="url(#n)" opacity="0.35"/>
               </svg>`
            )}")`,
          }}
        />

        {/* starfield */}
        <canvas ref={starfield} className="absolute inset-0 h-full w-full" />

        {/* vinheta suave */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 10%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,.05) 100%)",
          }}
        />
      </div>

      {/* topo com logo em glass */}
      <div className="relative z-10 mx-auto flex max-w-6xl justify-center px-4 sm:px-6 pt-16 sm:pt-24">
        <div ref={logoWrap} className="relative">
          <div className="grid place-items-center rounded-2xl border border-white/40 bg-white/70 px-3 py-2 sm:p-4 shadow-xl backdrop-blur-xl">
            <img
              src="https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/logo_cores.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvbG9nb19jb3Jlcy5wbmciLCJpYXQiOjE3NTU5NjQ3MDMsImV4cCI6MTc4NzUwMDcwM30.YOmDsN6voRH6V6ma42tpsENTCE5b0Bl_rj1DL0V91pc"
              alt="Árvore do Conhecimento"
              className="h-16 sm:h-20 w-auto object-contain" // ↑ maior no mobile
              draggable={false}
            />
          </div>
          <div
            ref={flare}
            className="pointer-events-none absolute -inset-y-6 -left-28 right-[-6rem] z-10 skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
            style={{ filter: "blur(10px)" }}
            aria-hidden
          />
        </div>
      </div>

      {/* PALCO CENTRAL — tudo aparece no MESMO sítio */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        {/* reserva + centragem vertical em mobile */}
        <div className="relative mx-auto h-[300px] sm:h-[320px] grid sm:block place-items-center">
          {/* 1) Bem-vindo */}
          <div ref={l1} className="scene-block absolute inset-0 grid place-items-center">
            <div
              ref={t1}
              className="galaxy no-hyphen text-center text-2xl sm:text-4xl text-zinc-900 drop-shadow-[0_1px_0_rgba(255,255,255,.6)]"
            >
              Bem-vindo, {fullName}.
            </div>
          </div>

          {/* 2) Estamos a reinventar… */}
          <div ref={l2} className="scene-block absolute inset-0 grid place-items-center">
            <div
              ref={t2}
              className="galaxy no-hyphen text-center text-2xl sm:text-4xl text-zinc-900 drop-shadow-[0_1px_0_rgba(255,255,255,.6)]"
            >
              Estamos a reinventar a educação em Portugal.
            </div>
          </div>

          {/* 3) Começa aqui uma jornada… */}
          <div ref={l3} className="scene-block absolute inset-0 grid place-items-center">
            <div
              ref={t3}
              className="galaxy no-hyphen text-center max-w-3xl sm:max-w-4xl text-2xl sm:text-4xl text-zinc-900/95 drop-shadow-[0_1px_0_rgba(255,255,255,.6)]"
            >
              Começa aqui uma jornada clara. Objetivos definidos, feedback direto e progresso visível — sempre contigo ao leme.
            </div>
          </div>

          {/* 4) PRONTO? — botão único centrado (glass) */}
          <div ref={ready} className="scene-block absolute inset-0 grid place-items-center">
            <button
              onClick={() => navigate(nextHref)}
              className="galaxy btn-pulse rounded-2xl border border-white/50 bg-white/70 px-6 py-3 sm:px-8 sm:py-4 text-2xl sm:text-4xl text-zinc-900 backdrop-blur-xl transition
                         hover:bg-white/80 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xl"
            >
              Pronto?
            </button>
          </div>
        </div>
      </div>

      {/* estilos locais */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap');

        .galaxy { font-family: 'Raleway', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; letter-spacing: .02em; }
        .no-hyphen { hyphens: manual; word-break: normal; overflow-wrap: break-word; }

        /* Pulse do botão “Pronto?” */
        @keyframes pulseReady {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(99,102,241,.45); }
          70%  { transform: scale(1.04); box-shadow: 0 0 0 16px rgba(99,102,241,0); }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        .btn-pulse { animation: pulseReady 1.8s ease-in-out infinite; will-change: transform, box-shadow; }

        /* Segurança: se GSAP não correr, só a primeira cena aparece */
        .scene-block { position: absolute; inset: 0; }
        .scene-block:not(:first-child) { opacity: 0; pointer-events: none; }
      `}</style>
    </div>
  );
}
