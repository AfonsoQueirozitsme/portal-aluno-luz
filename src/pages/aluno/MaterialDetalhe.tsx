import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { materiais } from "./Materiais";
import { Button } from "@/components/ui/button";
import { ExternalLink, Presentation, FileText, HelpCircle } from "lucide-react";

const MaterialDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const mat = materiais.find(m => m.id === Number(id));

  if (!mat) return <div className="p-8 text-center">Material não encontrado.</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-card rounded-xl shadow-lg p-8 animate-fade-in">
      <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
        &larr; Voltar
      </Button>
      <h1 className="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
        {mat.tipo === "documento" && <FileText className="w-6 h-6" />}
        {mat.tipo === "powerpoint" && <Presentation className="w-6 h-6" />}
        {mat.tipo === "quiz" && <HelpCircle className="w-6 h-6" />}
        {mat.titulo}
      </h1>
      <div className="text-muted-foreground mb-6">{mat.descricao}</div>
      {mat.tipo === "documento" && (
        <iframe
          src={mat.url}
          title={mat.titulo}
          className="w-full h-[70vh] border rounded"
          style={{ background: "#f9fafb" }}
        />
      )}
      {mat.tipo === "powerpoint" && (
        <iframe
          src={mat.url}
          title={mat.titulo}
          className="w-full h-[70vh] border rounded"
          style={{ background: "#f9fafb" }}
        />
      )}
      {mat.tipo === "quiz" && (
        <QuizComponent quiz={mat.quiz} titulo={mat.titulo} />
      )}
    </div>
  );
};

// Componente de Quiz reutilizável
const QuizComponent = ({ quiz, titulo }: { quiz: any[]; titulo: string }) => {
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">{titulo}</h2>
      {!quizDone ? (
        <>
          <div className="mb-4 font-semibold">
            Pergunta {quizStep + 1} de {quiz.length}
          </div>
          <div className="mb-6">{quiz[quizStep].pergunta}</div>
          <div className="flex flex-col gap-3">
            {quiz[quizStep].opcoes.map((op: string, idx: number) => (
              <Button
                key={idx}
                variant={
                  quizAnswers[quizStep] === idx
                    ? "hero"
                    : "outline"
                }
                className="w-full text-left"
                onClick={() => {
                  const next = [...quizAnswers];
                  next[quizStep] = idx;
                  setQuizAnswers(next);
                }}
                disabled={quizAnswers[quizStep] !== undefined}
              >
                {op}
              </Button>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => {
                if (quizStep > 0) setQuizStep(quizStep - 1);
              }}
              disabled={quizStep === 0}
            >
              Anterior
            </Button>
            {quizAnswers[quizStep] !== undefined && (
              <Button
                variant="hero"
                onClick={() => {
                  if (quizStep < quiz.length - 1) {
                    setQuizStep(quizStep + 1);
                  } else {
                    setQuizDone(true);
                  }
                }}
              >
                {quizStep < quiz.length - 1 ? "Próxima" : "Ver resultado"}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <div className="text-2xl font-bold mb-2 text-primary">
            Pontuação:{" "}
            {
              quizAnswers.filter(
                (ans, idx) => ans === quiz[idx].correta
              ).length
            }
            /{quiz.length}
          </div>
          <div className="mb-4 text-muted-foreground">
            {quizAnswers.filter(
              (ans, idx) => ans === quiz[idx].correta
            ).length === quiz.length
              ? "Parabéns, acertou todas as perguntas!"
              : "Continue a praticar para melhorar ainda mais."}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialDetalhe;
