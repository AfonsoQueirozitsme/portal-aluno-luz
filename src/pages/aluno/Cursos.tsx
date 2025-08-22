import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const cursos = [
  {
    id: 1,
    titulo: "Curso de Matemática Básica",
    descricao: "Aprenda os fundamentos da matemática de forma prática.",
    duracao: "4 semanas",
    preco: "Gratuito",
    conteudos: [
      "Números e operações",
      "Frações e decimais",
      "Geometria básica",
      "Resolução de problemas"
    ],
    perguntas: [
      { label: "Porque quer frequentar este curso?", type: "text" },
      { label: "Tem experiência prévia em matemática?", type: "select", opcoes: ["Sim", "Não"] }
    ]
  },
  {
    id: 2,
    titulo: "Curso de Física para Secundário",
    descricao: "Domine os conceitos essenciais de física para o ensino secundário.",
    duracao: "6 semanas",
    preco: "49,00 €",
    conteudos: [
      "Mecânica",
      "Óptica",
      "Termodinâmica",
      "Eletromagnetismo"
    ],
    perguntas: [
      { label: "Já teve aulas de física?", type: "select", opcoes: ["Sim", "Não"] }
    ]
  }
];

const Cursos = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-8 text-primary">Cursos Disponíveis</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {cursos.map((curso) => (
          <div key={curso.id} className="bg-card rounded-xl shadow p-6 flex flex-col gap-2 border border-border">
            <div className="font-semibold text-lg">{curso.titulo}</div>
            <div className="text-muted-foreground mb-2">{curso.descricao}</div>
            <div className="text-xs mb-2">Duração: {curso.duracao} | Preço: {curso.preco}</div>
            <Button
              variant="hero"
              className="w-full mt-2"
              onClick={() => navigate(`/aluno/cursos/${curso.id}`)}
            >
              Ver mais / Inscrever
            </Button>
          </div>
        ))}
      </div>
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

export default Cursos;
