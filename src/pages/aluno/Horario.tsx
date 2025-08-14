import { Helmet } from "react-helmet-async";
import Timetable, { Lesson } from "@/components/Timetable";

const canonical = () => `${window.location.origin}/aluno/horario`;

const Horario = () => {
  const lessons: Lesson[] = [
    { day: "Seg", start: "15:00", end: "16:00", subject: "Matemática", teacher: "João Silva", room: "2" },
    { day: "Ter", start: "17:30", end: "18:30", subject: "Química", teacher: "Ana Costa" },
    { day: "Qua", start: "17:30", end: "18:30", subject: "Matemática", teacher: "João Silva", room: "1" },
    { day: "Sex", start: "16:00", end: "17:00", subject: "Português", teacher: "Rita Lopes" },
  ];

  return (
    <div>
      <Helmet>
        <title>Área do Aluno | Horário - Árvore do Conhecimento</title>
        <meta name="description" content="Consulte o seu horário semanal de explicações." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <h1 className="text-2xl font-semibold mb-4">Horário</h1>
      <Timetable lessons={lessons} />
    </div>
  );
};

export default Horario;
