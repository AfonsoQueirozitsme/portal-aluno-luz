import { useState } from "react";
import { Button } from "@/components/ui/button";

const recursos = [
  {
    id: 1,
    titulo: "Khan Academy",
    descricao: "Plataforma gratuita de aprendizagem para todas as idades.",
    tipo: "out",
    url: "https://pt.khanacademy.org/",
  },
  {
    id: 2,
    titulo: "Simulador de Funções",
    descricao: "Ferramenta interativa para explorar funções matemáticas.",
    tipo: "in",
    url: "https://www.geogebra.org/graphing",
  },
  {
    id: 3,
    titulo: "Coursera",
    descricao: "Cursos online de universidades de topo.",
    tipo: "out",
    url: "https://www.coursera.org/",
  },
];

const Recursos = () => {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [outModal, setOutModal] = useState<{ url: string; titulo: string } | null>(null);

  // Redirecionamento automático após 5 segundos
  if (outModal) {
    setTimeout(() => {
      window.open(outModal.url, "_blank");
      setOutModal(null);
    }, 5000);
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-8 text-primary">Recursos Externos</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {recursos.map((rec) => (
          <div key={rec.id} className="bg-card rounded-xl shadow p-6 flex flex-col gap-2 border border-border">
            <div className="font-semibold text-lg">{rec.titulo}</div>
            <div className="text-muted-foreground mb-4">{rec.descricao}</div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                rec.tipo === "in"
                  ? setIframeUrl(rec.url)
                  : setOutModal({ url: rec.url, titulo: rec.titulo })
              }
            >
              {rec.tipo === "in" ? "Abrir recurso" : "Aceder ao site"}
            </Button>
          </div>
        ))}
      </div>
      {/* Modal para recurso "in" */}
      {iframeUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 relative flex flex-col">
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
      {/* Modal para recurso "out" */}
      {outModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative flex flex-col items-center">
            <h2 className="text-lg font-bold mb-4">Vai ser redirecionado</h2>
            <div className="mb-6 text-muted-foreground text-center">
              O recurso <span className="font-semibold">{outModal.titulo}</span> será aberto numa nova janela em 5 segundos.
            </div>
            <Button
              variant="hero"
              onClick={() => {
                window.open(outModal.url, "_blank");
                setOutModal(null);
              }}
            >
              Abrir agora
            </Button>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setOutModal(null)}
            >
              Cancelar
            </Button>
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
};

export default Recursos;
