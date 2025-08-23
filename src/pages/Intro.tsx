// file: src/pages/WelcomeCinematic.tsx
import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";

type Props = { name?: string; nextHref?: string };

export default function WelcomeCinematic({ name, nextHref = "/aluno" }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // roots
  const stage = useRef<HTMLDivElement>(null);
  const nebulaA = useRef<HTMLDivElement>(null);
  const nebulaB = useRef<HTMLDivElement>(null);
  const starfield = useRef<HTMLCanvasElement>(null);

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

  // split por letra (aplicar APENAS no elemento do texto)
  const split = (el?: HTMLElement | null) => {
    if (!el) return;
    const t = el.innerText;
    el.innerHTML = "";
    for (const ch of t) {
      const s = document.createElement("span");
      s.textContent = ch;
      s.style.display = "inline-block";
      s.style.whiteSpace = ch === " " ? "pre" : "normal";
      el.appendChild(s);
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
      /* ===== STARFIELD (galaxy) ===== */
      if (!prefersReduced && starfield.current) {
        const c = starfield.current;
        const cx = c.getContext("2d")!;
        let w = (c.width = c.offsetWidth * devicePixelRatio);
        let h = (c.height = c.offsetHeight * devicePixelRatio);

        type Star = { x: number; y: number; z: number; r: number; t: number; s: number };
        const stars: Star[] = Array.from({ length: 220 }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random() * 0.7 + 0.3, // profundidade
          r: Math.random() * 1.7 + 0.3, // raio
          t: Math.random() * Math.PI * 2, // fase para “twinkle”
          s: Math.random() * 0.6 + 0.2, // velocidade
        }));

        const onResize = () => {
          w = c.width = c.offsetWidth * devicePixelRatio;
          h = c.height = c.offsetHeight * devicePixelRatio;
        };
        window.addEventListener("resize", onResize);
        self.add(() => window.removeEventListener("resize", onResize));

        let raf = 0;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          cx.clearRect(0, 0, w, h);
          cx.globalCompositeOperation = "lighter";
          for (const st of stars) {
            st.x += (0.15 + st.z * 0.25) * devicePixelRatio;
            if (st.x > w + 20) st.x = -20;
            st.t += 0.02 + st.z * 0.01;
            const tw = 0.55 + Math.sin(st.t) * 0.45; // cintilar
            cx.globalAlpha = 0.25 + 0.55 * tw * st.z;
            cx.beginPath();
            cx.arc(st.x, st.y, st.r * devicePixelRatio, 0, Math.PI * 2);
            cx.fillStyle = "rgba(255,255,255,0.95)";
            cx.fill();
          }
        };
        loop();
        self.add(() => cancelAnimationFrame(raf));
      }

      /* ===== Nébulas a “respirar” (parallax suave) ===== */
      if (!prefersReduced && nebulaA.current && nebulaB.current) {
        gsap.to([nebulaA.current, nebulaB.current], {
          xPercent: (i) => (i ? 10 : -8),
          yPercent: (i) => (i ? -6 : 8),
          scale: (i) => (i ? 1.04 : 1.03),
          duration: 8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.3,
        });
      }

      /* ===== Timeline “um de cada vez” ===== */
      gsap.set([l1.current, l2.current, l3.current, ready.current], { autoAlpha: 0 });

      const typeIn = (el: HTMLElement, dur = 1.0, stagger = 0.02) =>
        gsap.from(el.querySelectorAll("span"), {
          y: 28,
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
          { xPercent: 120, opacity: 0.45, duration: 0.9, ease: "power2.inOut" },
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

      // 3) Começa aqui uma jornada…
      tl.to(l3.current, { autoAlpha: 1, duration: 0.01 }, ">0.2")
        .add(() => typeIn(t3.current!, 1.0, 0.018), ">")
        .to({}, { duration: 2.4 })
        .add(() => hideOut(l3.current!), ">");

    // 4) Pronto? (botão único) + auto-avanço
tl.to(ready.current, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out" }, ">0.3")
.fromTo(
  ready.current!.querySelector("button"),
  { scale: 0.9, opacity: 0 },
  { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
  "<"
)
.add(() => {
  const to = setTimeout(() => navigate(nextHref), 3000);
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
    <div ref={stage} className="relative min-h-dvh overflow-hidden bg-black">
      {/* letterbox para look cinema */}
      <div className="fixed inset-x-0 top-0 z-50 h-10 bg-black/85" />
      <div className="fixed inset-x-0 bottom-0 z-50 h-10 bg-black/85" />

      {/* nébulas (galaxy) */}
      <div
        ref={nebulaA}
        className="pointer-events-none absolute -left-64 -top-64 h-[70rem] w-[70rem] rounded-full blur-3xl opacity-50"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      />
      <div
        ref={nebulaB}
        className="pointer-events-none absolute -right-72 -bottom-72 h-[70rem] w-[70rem] rounded-full blur-3xl opacity-40"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      />

      {/* starfield */}
      <canvas ref={starfield} className="absolute inset-0 -z-10 h-full w-full" />

      {/* logo (centro) */}
      <div className="relative z-10 mx-auto flex max-w-6xl justify-center px-6 pt-28">
        <div ref={logoWrap} className="relative">
          <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/[.04] p-4 shadow-[0_10px_24px_-12px_rgba(0,0,0,.55)] backdrop-blur">
            <img
              src="https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/logo_cores.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvbG9nb19jb3Jlcy5wbmciLCJpYXQiOjE3NTU5NjQ3MDMsImV4cCI6MTc4NzUwMDcwM30.YOmDsN6voRH6V6ma42tpsENTCE5b0Bl_rj1DL0V91pc"
              alt="Árvore do Conhecimento"
              className="h-16 w-auto object-contain"
              draggable={false}
            />
          </div>
          <div
            ref={flare}
            className="pointer-events-none absolute -inset-y-6 -left-28 right-[-6rem] z-10 skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
            style={{ filter: "blur(8px)" }}
            aria-hidden
          />
        </div>
      </div>

      {/* PALCO CENTRAL — tudo aparece no MESMO sítio */}
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        {/* reserva de altura para estabilizar layout */}
        <div className="relative mx-auto h-[220px] sm:h-[260px]">
          {/* 1) Bem-vindo */}
          <div ref={l1} className="scene-block absolute inset-0 grid place-items-center">
            <div ref={t1} className="galaxy text-center text-3xl sm:text-4xl text-white/95">
              Bem-vindo, {fullName}.
            </div>
          </div>

          {/* 2) Estamos a reinventar… */}
          <div ref={l2} className="scene-block absolute inset-0 grid place-items-center">
            <div ref={t2} className="galaxy text-center text-3xl sm:text-4xl text-white/95">
              Estamos a reinventar a educação em Portugal.
            </div>
          </div>

          {/* 3) Começa aqui uma jornada… */}
          <div ref={l3} className="scene-block absolute inset-0 grid place-items-center">
            <div ref={t3} className="galaxy text-center max-w-4xl text-3xl sm:text-4xl text-white/90">
              Começa aqui uma jornada clara. Objetivos definidos, feedback direto e progresso visível — sempre contigo ao leme.
            </div>
          </div>

          {/* 4) PRONTO? — botão único centrado */}
          <div ref={ready} className="scene-block absolute inset-0 grid place-items-center">
            <button
              onClick={() => navigate(nextHref)}
              className="galaxy rounded-2xl border border-white/10 bg-white/[.06] px-8 py-4 text-3xl sm:text-4xl text-white/95 backdrop-blur transition
                         hover:bg-white/[.10] active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Pronto?
            </button>
          </div>
        </div>
      </div>

      {/* estilos locais */}
      <style>{`
        .galaxy {
          font-family: 'Rajdhani', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  );
}
