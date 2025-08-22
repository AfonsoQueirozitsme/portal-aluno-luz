// file: src/pages/Aluno/Recursos.tsx
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: "in" | "out";
  url: string | null;
  created_at?: string;
};

const canonical = () => `${window.location.origin}/aluno/recursos`;

export default function Recursos() {
  const [all, setAll] = useState<Resource[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Modais
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [outModal, setOutModal] = useState<{ url: string; titulo: string } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);

  // Carrega recursos e recomendações
  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // 1) recursos
        const { data: resources, error } = await supabase
          .from("resources")
          .select("id, title, description, type, url, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const list = (resources ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: (r.type as "in" | "out") ?? "out",
          url: r.url,
          created_at: r.created_at,
        }));

        setAll(list);

        // 2) recomendações por perfil (se existir tabela resource_recommendations)
        const profileId = localStorage.getItem("active_profile_id") || localStorage.getItem("activeProfileId");
        if (profileId) {
          try {
            const { data: recs, error: recErr } = await supabase
              .from("resource_recommendations") // tabela opcional
              .select("resource_id")
              .eq("profile_id", profileId);

            if (!recErr && recs && recs.length) {
              setRecommendedIds(new Set(recs.map((x: any) => String(x.resource_id))));
            } else {
              // fallback → top 3 recentes
              setRecommendedIds(new Set(list.slice(0, 3).map((r) => r.id)));
            }
          } catch {
            // tabela pode não existir → fallback
            setRecommendedIds(new Set(list.slice(0, 3).map((r) => r.id)));
          }
        } else {
          // sem perfil ativo → fallback
          setRecommendedIds(new Set(list.slice(0, 3).map((r) => r.id)));
        }
      } catch (e: any) {
        setErr(e?.message ?? "Não foi possível carregar os recursos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Ordena: recomendados primeiro
  const ordered = useMemo(() => {
    const rec: Resource[] = [];
    const rest: Resource[] = [];
    for (const r of all) {
      if (recommendedIds.has(r.id)) rec.push(r);
      else rest.push(r);
    }
    return [...rec, ...rest];
  }, [all, recommendedIds]);

  // Controla redirecionamento de “out”
  useEffect(() => {
    if (!outModal) return;
    setRedirectCountdown(5);

    const interval = setInterval(() => {
      setRedirectCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    const timer = setTimeout(() => {
      if (outModal?.url) window.open(outModal.url, "_blank", "noopener,noreferrer");
      setOutModal(null);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [outModal]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in p-4 md:p-0">
      <Helmet>
        <title>Área do Aluno | Recursos</title>
        <meta name="description" content="Acede a recursos úteis de estudo, internos e externos." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <h1 className="text-2xl font-bold mb-6 text-primary">Recursos</h1>

      {loading && (
        <div className="grid place-items-center h-40 text-sm text-muted-foreground">
          A carregar recursos…
        </div>
      )}

      {!loading && err && <div className="text-destructive mb-4">{err}</div>}

      {!loading && !err && ordered.length === 0 && (
        <div className="text-muted-foreground">Ainda não existem recursos.</div>
      )}

      {!loading && !err && ordered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {ordered.map((rec) => {
            const isRecommended = recommendedIds.has(rec.id);
            return (
              <div
                key={rec.id}
                className="bg-card rounded-xl shadow p-6 flex flex-col gap-3 border border-border relative"
              >
                {isRecommended && (
                  <div className="absolute -top-2 left-4 bg-primary text-white text-[11px] px-2 py-0.5 rounded shadow">
                    Recomendado
                  </div>
                )}
                <div className="font-semibold text-lg">{rec.title}</div>
                {rec.description && <div className="text-muted-foreground">{rec.description}</div>}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    rec.type === "in" && rec.url
                      ? setIframeUrl(rec.url)
                      : setOutModal(rec.url ? { url: rec.url, titulo: rec.title } : null)
                  }
                  disabled={!rec.url}
                >
                  {rec.type === "in" ? "Abrir recurso" : "Aceder ao site"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal recurso embebido (in) */}
      {iframeUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full p-6 relative flex flex-col">
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-primary text-xl"
              onClick={() => setIframeUrl(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            <iframe
              src={iframeUrl}
              title="Recurso"
              className="w-full h-[70vh] border rounded"
              style={{ background: "#f9fafb" }}
            />
          </div>
        </div>
      )}

      {/* Modal recurso externo (out) */}
      {outModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative flex flex-col items-center">
            <h2 className="text-lg font-bold mb-2">Vai ser redirecionado</h2>
            <div className="mb-6 text-muted-foreground text-center">
              O recurso <span className="font-semibold">{outModal.titulo}</span> será aberto numa nova janela em{" "}
              <span className="font-semibold">{redirectCountdown}s</span>.
            </div>
            <div className="flex gap-3">
              <Button
                variant="hero"
                onClick={() => {
                  window.open(outModal.url, "_blank", "noopener,noreferrer");
                  setOutModal(null);
                }}
              >
                Abrir agora
              </Button>
              <Button variant="outline" onClick={() => setOutModal(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .animate-fade-in {
            animation: fadeIn .5s cubic-bezier(.4,0,.2,1);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}
      </style>
    </div>
  );
}
