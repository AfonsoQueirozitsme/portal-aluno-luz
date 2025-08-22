import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const canonical = () => `${window.location.origin}/aluno/aulas`;

const Aulas = () => {
  const aulas = [
    { titulo: "Funções e Gráficos", disciplina: "Matemática", estado: "Agendada" },
    { titulo: "Leitura Crítica", disciplina: "Português", estado: "Concluída" },
    { titulo: "Leis de Newton", disciplina: "Física", estado: "Agendada" },
  ];

  return (
    <div>
      <Helmet>
        <title>Área do Aluno | Aulas  - Árvore do Conhecimento</title>
        <meta name="description" content="Veja as suas aulas passadas e futuras com detalhes." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <h1 className="text-2xl font-semibold mb-4">Aulas</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {aulas.map((aula, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-lg">{aula.titulo}</CardTitle>
              <CardDescription>{aula.disciplina}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">Estado: <span className="font-medium">{aula.estado}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Aulas;
