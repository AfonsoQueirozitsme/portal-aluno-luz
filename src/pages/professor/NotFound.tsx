// file: src/pages/NotFound.tsx
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Sparkles } from "lucide-react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

export default function NotFound() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const spotlight = useRef<HTMLDivElement>(null);

  const d0 = useRef<HTMLDivElement>(null);
  const d1 = useRef<HTMLDivElement>(null);
  const d2 = useRef<HTMLDivElement>(null);

  const orbRing = useRef<HTMLDivElement>(null);
  const auroraA = useRef<HTMLDivElement>(null);
  const auroraB = useRef<HTMLDivElement>(null);
  const shards = useRef<HTMLDivElement[]>([]);

  // helper para refs de shards
  const setShardRef = (el: HTMLDivElement | null, i: number) => {
    if (el) shards.current[i] = el;
  };

  useEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* ========= Intro ========= */
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from(
          ".nf-veil",
          { autoAlpha: 0, scale: 1.04, duration: 0.6 },
          0
        )
        .from(
          [d0.current, d1.current, d2.current],
          {
            y: 30,
            opacity: 0,
            rotateX: -20,
            transformOrigin: "50% 50% -50px",
            stagger: 0.07,
            duration: 0.9,
          },
          0.1
        )
        .from(
          ".nf-sub,.nf-actions",
          { y: 16, opacity: 0, stagger: 0.08, duration: 0.7 },
          0.35
        );

      if (!prefersReduced) {
        /* ========= Loop: flutuação dos dígitos ========= */
        gsap.to([d0.current, d1.current, d2.current], {
          y: (i) => (i % 2 === 0 ? 6 : -6),
          rotateZ: (i) => (i % 2 === 0 ? 1.2 : -1.2),
          duration: 2.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.12,
        });

        /* ========= Glow a pulsar ========= */
        gsap.to(".nf-glow", {
          opacity: 0.25,
          filter: "blur(30px)",
          duration: 3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        /* ========= Spotlight segue o rato ========= */
        if (spotlight.current) {
          const qx = gsap.quickTo(spotlight.current, "x", { duration: 0.25, ease: "power3.out" });
          const qy = gsap.quickTo(spotlight.current, "y", { duration: 0.25, ease: "power3.out" });
          const move = (e: MouseEvent) => {
            const r = root.current!.getBoundingClientRect();
            qx(e.clientX - r.left);
            qy(e.clientY - r.top);
          };
          window.addEventListener("mousemove", move);
          ctx.add(() => window.removeEventListener("mousemove", move));
        }

        /* ========= Orbes em órbita ========= */
        if (orbRing.current) {
          gsap.to(orbRing.current, {
            rotate: 360,
            transformOrigin: "50% 50%",
            duration: 12,
            ease: "none",
            repeat: -1,
          });
        }

        /* ========= Auroras ========= */
        if (auroraA.current && auroraB.current) {
          gsap.to(auroraA.current, {
            xPercent: -10,
            skewX: 6,
            duration: 5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.to(auroraB.current, {
            xPercent: 14,
            skewX: -8,
            duration: 6.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        /* ========= Shards (fragmentos) ========= */
        shards.current.forEach((el, i) => {
          gsap.to(el, {
            y: gsap.utils.random(-18, 18),
            x: gsap.utils.random(-12, 12),
            rotate: gsap.utils.random(-12, 12),
            duration: gsap.utils.random(2.2, 3.4),
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.08,
          });
        });

        /* ========= Starfield (canvas) ========= */
        if (canvas.current) {
          const c = canvas.current;
          const cx = c.getContext("2d")!;
          let w = (c.width = c.offsetWidth * devicePixelRatio);
          let h = (c.height = c.offsetHeight * devicePixelRatio);
          const stars = Array.from({ length: 140 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            z: Math.random() * 0.6 + 0.4,
            s: Math.random() * 1.6 + 0.2,
          }));

          const onResize = () => {
            w = c.width = c.offsetWidth * devicePixelRatio;
            h = c.height = c.offsetHeight * devicePixelRatio;
          };
          window.addEventListener("resize", onResize);
          ctx.add(() => window.removeEventListener("resize", onResize));

          let raf = 0;
          const loop = () => {
            raf = requestAnimationFrame(loop);
            cx.clearRect(0, 0, w, h);
            cx.globalCompositeOperation = "lighter";
            for (const st of stars) {
              st.x += (0.2 + st.z) * devicePixelRatio;
              if (st.x > w + 20) st.x = -20;
              cx.globalAlpha = 0.5 * st.z + 0.3;
              cx.beginPath();
              cx.arc(st.x, st.y, st.s * devicePixelRatio, 0, Math.PI * 2);
              cx.fillStyle = "rgba(255,255,255,0.9)";
              cx.fill();
            }
          };
          loop();
          ctx.add(() => cancelAnimationFrame(raf));
        }
      }

      /* ========= Glitch toggle (G) ========= */
      const onKey = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === "g") {
          root.current!.classList.toggle("nf-glitch");
        }
      };
      window.addEventListener("keydown", onKey);
      ctx.add(() => window.removeEventListener("keydown", onKey));
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      className="relative min-h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_top_left,theme(colors.indigo.500/.25),transparent_40%),radial-gradient(ellipse_at_bottom_right,theme(colors.fuchsia.500/.22),transparent_40%),hsl(var(--background))]"
    >
      {/* auroras */}
      <div
        ref={auroraA}
        className="pointer-events-none nf-veil absolute -left-32 -top-24 h-[52rem] w-[52rem] rounded-full blur-3xl opacity-50"
        style={{ backgroundImage: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div
        ref={auroraB}
        className="pointer-events-none nf-veil absolute -right-40 -bottom-32 h-[52rem] w-[52rem] rounded-full blur-3xl opacity-40"
        style={{ backgroundImage: "var(--gradient-hero)" }}
        aria-hidden
      />

      {/* starfield */}
      <canvas ref={canvas} className="absolute inset-0 -z-10 h-full w-full" />

      {/* noise overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.06] mix-blend-overlay [background-image:radial-gradient(transparent,transparent),url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%2240%22 height=%2240%22 filter=%22url(%23n)%22 opacity=%220.20%22/></svg>')]" />

      {/* spotlight que segue o rato */}
      <div
        ref={spotlight}
        className="pointer-events-none absolute left-0 top-0 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 [background:radial-gradient(circle_at_center,rgba(255,255,255,.14),transparent_60%)] mix-blend-overlay"
        aria-hidden
      />

      {/* conteúdo */}
      <div className="relative mx-auto grid min-h-dvh max-w-5xl place-items-center px-6">
        <div className="relative w-full text-center">
          {/* brilho por trás do 404 */}
          <div className="nf-glow absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-20" style={{ backgroundImage: "var(--gradient-hero)" }} />

          {/* 404 */}
          <div className="mx-auto flex items-center justify-center gap-4">
            <Digit refEl={d0} text="4" />
            <Digit refEl={d1} text="0" />
            <Digit refEl={d2} text="4" />
          </div>

          {/* anel com orbes */}
          <div ref={orbRing} className="pointer-events-none relative mx-auto mt-6 size-56">
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-white/80 shadow" />
            <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-white/70 shadow" />
            <span className="absolute left-1/2 bottom-0 size-2 -translate-x-1/2 rounded-full bg-white/60 shadow" />
          </div>

          {/* subtítulo */}
          <p className="nf-sub mt-6 text-balance text-sm text-foreground/70">
            Ups! A página que procuras evaporou-se no hiperespaço. <br className="hidden sm:block" />
            Volta ao início ou explora outra constelação do portal ✨
          </p>

          {/* ações */}
          <div className="nf-actions mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Voltar ao início
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/aluno">
                <Sparkles className="h-4 w-4" />
                Ir para a área reservada
              </Link>
            </Button>
          </div>

          {/* shards (fragmentos de vidro) */}
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                ref={(el) => setShardRef(el, i)}
                className="absolute h-6 w-10 opacity-30"
                style={{
                  left: `${gsap.utils.random(8, 92)}%`,
                  top: `${gsap.utils.random(12, 82)}%`,
                  transform: `rotate(${gsap.utils.random(-25, 25)}deg)`,
                  clipPath: "polygon(0% 100%, 25% 0%, 75% 20%, 100% 100%)",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.02))",
                  border: "1px solid rgba(255,255,255,.08)",
                  backdropFilter: "blur(6px)",
                }}
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>

      {/* estilos locais */}
      <style>{`
        :root { --shadow-elegant: 0 10px 24px -12px hsl(0 0% 0% / .25); }
        .nf-digit{
          background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.06));
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: var(--shadow-elegant);
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          text-shadow: 0 6px 18px rgba(0,0,0,.25);
        }

        /* glitch quando carregas 'G' */
        .nf-glitch .nf-digit__inner{
          animation: nf-glitch 1.2s infinite steps(2, end);
        }
        @keyframes nf-glitch {
          0% { transform: translate(0,0); filter: hue-rotate(0deg); }
          20% { transform: translate(-1px,1px) skewX(0.5deg); }
          40% { transform: translate(1px,-1px) skewY(-0.5deg); }
          60% { transform: translate(-0.5px,0.5px); filter: hue-rotate(8deg); }
          80% { transform: translate(0.5px,-0.5px); }
          100% { transform: translate(0,0); filter: hue-rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

/* ========= Dígito “vidro 3D” ========= */
function Digit({ text, refEl }: { text: string; refEl: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={refEl}
      className="nf-digit relative grid h-36 w-28 place-items-center rounded-2xl sm:h-44 sm:w-32"
      style={{ perspective: "900px" }}
      aria-hidden
    >
      {/* camada 3D */}
      <div className="nf-digit__inner relative grid h-full w-full place-items-center rounded-2xl">
        {/* vidro */}
        <div className="absolute inset-0 rounded-2xl bg-white/5" />
        {/* textura/gradiente do tema */}
        <div className="absolute inset-0 rounded-2xl opacity-30" style={{ backgroundImage: "var(--gradient-hero)" }} />
        {/* número */}
        <div className="relative z-10 text-6xl font-black tracking-wider text-white/90 drop-shadow-lg sm:text-7xl">
          {text}
        </div>
        {/* highlight */}
        <div className="pointer-events-none absolute inset-x-2 top-1 h-16 rounded-xl bg-white/25 opacity-25 blur-xl" />
      </div>
    </div>
  );
}
