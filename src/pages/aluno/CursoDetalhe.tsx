import { useParams, useNavigate } from "react-router-dom";
import { cursos } from "./Cursos";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const CursoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const curso = cursos.find(c => c.id === Number(id));
  const [inscrito, setInscrito] = useState(false);
  const [respostas, setRespostas] = useState<{ [k: string]: string }>({});

  if (!curso) return <div className="p-8 text-center">Curso não encontrado.</div>;

  const handleChange = (label: string, value: string) => {
    setRespostas(r => ({ ...r, [label]: value }));
  };

  const handleInscrever = (e: React.FormEvent) => {
    e.preventDefault();
    setInscrito(true);
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-card rounded-xl shadow-lg p-8 animate-fade-in">
      <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
        &larr; Voltar
      </Button>
      <h1 className="text-2xl font-bold mb-4 text-primary">{curso.titulo}</h1>
      <div className="mb-4 text-muted-foreground">{curso.descricao}</div>
      <div className="mb-4 text-sm">Duração: {curso.duracao} | Preço: {curso.preco}</div>
      <div className="mb-6">
        <div className="font-semibold mb-2">Conteúdos:</div>
        <ul className="list-disc ml-6">
          {curso.conteudos.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
      {!inscrito ? (
        <form className="space-y-4" onSubmit={handleInscrever}>
          <div className="font-semibold mb-2">Para se inscrever, responda:</div>
          {curso.perguntas.map((p, idx) => (
            <div key={idx}>
              <label className="block mb-1 text-sm">{p.label}</label>
              {p.type === "text" ? (
                <input
                  className="w-full border rounded px-3 py-2"
                  value={respostas[p.label] || ""}
                  onChange={e => handleChange(p.label, e.target.value)}
                  required
                />
              ) : (
                <select
                  className="w-full border rounded px-3 py-2"
                  value={respostas[p.label] || ""}
                  onChange={e => handleChange(p.label, e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {p.opcoes.map((op: string) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <Button variant="hero" type="submit" className="w-full mt-4">
            Inscrever-me
          </Button>
        </form>
      ) : (
        <div className="text-green-700 font-semibold text-center mt-6">
          Inscrição efetuada com sucesso!
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

export default CursoDetalhe;
