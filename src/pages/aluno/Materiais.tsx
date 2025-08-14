import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, PlayCircle, Presentation, Download, ExternalLink, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const canonical = () => `${window.location.origin}/aluno/materiais`;

export const materiais = [
	{
		id: 1,
		tipo: "video",
		titulo: "Aula de Matemática - Frações",
		descricao: "Vídeo explicativo sobre frações.",
		url: "https://www.youtube.com/embed/8mve0zR2wY4",
		disciplina: "Matemática",
		nivel: "Básico",
		felicidade: "😊",
	},
	{
		id: 2,
		tipo: "documento",
		titulo: "Resumo de Geometria",
		descricao: "Documento PDF para consulta.",
		url: "/materiais/geometria.pdf",
		disciplina: "Matemática",
		nivel: "Básico",
		felicidade: "😐",
	},
	{
		id: 3,
		tipo: "powerpoint",
		titulo: "Apresentação: Funções",
		descricao: "PowerPoint interativo para consulta.",
		url: "/materiais/funcoes-ppt.html",
		disciplina: "Matemática",
		nivel: "Secundário",
		felicidade: "😃",
	},
	{
		id: 4,
		tipo: "outro",
		titulo: "Exercícios Extra",
		descricao: "Ficheiro ZIP com exercícios.",
		url: "/materiais/exercicios.zip",
		disciplina: "Matemática",
		nivel: "Básico",
		felicidade: "😐",
	},
	{
		id: 5,
		tipo: "quiz",
		titulo: "Quiz: Frações Básicas",
		descricao: "Teste os seus conhecimentos sobre frações.",
		disciplina: "Matemática",
		nivel: "Básico",
		felicidade: "😃",
		quiz: [
			{
				pergunta: "Qual é o resultado de 1/2 + 1/4?",
				opcoes: ["2/6", "3/4", "1/4", "1"],
				correta: 1,
			},
			{
				pergunta: "Qual destas frações é equivalente a 2/4?",
				opcoes: ["1/2", "2/2", "1/4", "3/4"],
				correta: 0,
			},
			{
				pergunta: "Quanto é 3/5 de 20?",
				opcoes: ["12", "15", "8", "10"],
				correta: 0,
			},
			{
				pergunta: "Qual é a fração irredutível de 6/8?",
				opcoes: ["3/4", "2/3", "1/2", "6/8"],
				correta: 0,
			},
			{
				pergunta: "Qual destas é uma fração própria?",
				opcoes: ["5/3", "7/7", "2/5", "9/4"],
				correta: 2,
			},
		],
	},
];

// Filtros possíveis
const disciplinas = Array.from(new Set(materiais.map((m) => m.disciplina)));
const niveis = Array.from(new Set(materiais.map((m) => m.nivel)));
const felicidades = Array.from(new Set(materiais.map((m) => m.felicidade)));

const Materiais = () => {
	const [showDoc, setShowDoc] = useState<{ tipo: string; url: string; titulo: string } | null>(null);
	const [showDownload, setShowDownload] = useState<{ url: string; titulo: string } | null>(null);
	const navigate = useNavigate();

	// Filtros
	const [filtroDisciplina, setFiltroDisciplina] = useState("");
	const [filtroNivel, setFiltroNivel] = useState("");
	const [filtroFelicidade, setFiltroFelicidade] = useState("");
	const [filtroTitulo, setFiltroTitulo] = useState("");

	const handleOpen = (mat: typeof materiais[0]) => {
		if (mat.tipo === "documento" || mat.tipo === "powerpoint" || mat.tipo === "quiz") {
			navigate(`/aluno/materiais/${mat.id}`);
		} else if (mat.tipo === "outro") {
			setShowDownload({ url: mat.url, titulo: mat.titulo });
		}
	};

	// Filtragem dos materiais
	const materiaisFiltrados = materiais.filter(
		(mat) =>
			(filtroDisciplina ? mat.disciplina === filtroDisciplina : true) &&
			(filtroNivel ? mat.nivel === filtroNivel : true) &&
			(filtroFelicidade ? mat.felicidade === filtroFelicidade : true) &&
			(filtroTitulo ? mat.titulo.toLowerCase().includes(filtroTitulo.toLowerCase()) : true)
	);

	return (
		<div>
			<Helmet>
				<title>Área do Aluno | Materiais - Árvore do Conhecimento</title>
				<meta name="description" content="Descarregue materiais e exercícios das suas explicações." />
				<link rel="canonical" href={canonical()} />
			</Helmet>

			<div className="max-w-3xl mx-auto animate-fade-in">
				<h1 className="text-2xl font-bold mb-8 text-primary">Materiais de Estudo</h1>

				{/* Filtros */}
				<div className="flex flex-wrap gap-4 mb-8 items-center">
					<select
						className="border rounded px-3 py-2 text-sm"
						value={filtroDisciplina}
						onChange={(e) => setFiltroDisciplina(e.target.value)}
					>
						<option value="">Todas as disciplinas</option>
						{disciplinas.map((d) => (
							<option key={d} value={d}>
								{d}
							</option>
						))}
					</select>
					<select
						className="border rounded px-3 py-2 text-sm"
						value={filtroNivel}
						onChange={(e) => setFiltroNivel(e.target.value)}
					>
						<option value="">Todos os níveis</option>
						{niveis.map((n) => (
							<option key={n} value={n}>
								{n}
							</option>
						))}
					</select>
					<select
						className="border rounded px-3 py-2 text-sm"
						value={filtroFelicidade}
						onChange={(e) => setFiltroFelicidade(e.target.value)}
					>
						<option value="">Todos os estados</option>
						{felicidades.map((f) => (
							<option key={f} value={f}>
								{f}
							</option>
						))}
					</select>
					<input
						type="text"
						className="border rounded px-3 py-2 text-sm"
						placeholder="Pesquisar por título..."
						value={filtroTitulo}
						onChange={(e) => setFiltroTitulo(e.target.value)}
					/>
				</div>

				<div className="grid md:grid-cols-2 gap-6">
					{materiaisFiltrados.map((mat) => (
						<div
							key={mat.id}
							className="bg-card rounded-xl shadow p-6 flex flex-col gap-2 border border-border"
						>
							<div className="flex items-center gap-3 mb-2">
								{mat.tipo === "video" && <PlayCircle className="w-6 h-6 text-primary" />}
								{mat.tipo === "documento" && <FileText className="w-6 h-6 text-primary" />}
								{mat.tipo === "powerpoint" && <Presentation className="w-6 h-6 text-primary" />}
								{mat.tipo === "outro" && <Download className="w-6 h-6 text-primary" />}
								{mat.tipo === "quiz" && <HelpCircle className="w-6 h-6 text-primary" />}
								<span className="font-semibold text-lg">{mat.titulo}</span>
								<span className="ml-auto">{mat.felicidade}</span>
							</div>
							<div className="text-muted-foreground mb-4">{mat.descricao}</div>
							{mat.tipo === "video" && (
								<div className="aspect-video rounded-lg overflow-hidden border border-border mb-2">
									<iframe
										src={mat.url}
										title={mat.titulo}
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowFullScreen
										className="w-full h-full"
									/>
								</div>
							)}
							{(mat.tipo === "documento" || mat.tipo === "powerpoint" || mat.tipo === "quiz") && (
								<Button variant="outline" className="w-full" onClick={() => handleOpen(mat)}>
									{mat.tipo === "documento" && <ExternalLink className="w-4 h-4 mr-2" />}
									{mat.tipo === "powerpoint" && <ExternalLink className="w-4 h-4 mr-2" />}
									{mat.tipo === "quiz" && <HelpCircle className="w-4 h-4 mr-2" />}
									{mat.tipo === "documento" && "Consultar Documento"}
									{mat.tipo === "powerpoint" && "Consultar PowerPoint"}
									{mat.tipo === "quiz" && "Fazer Quiz"}
								</Button>
							)}
							{mat.tipo === "outro" && (
								<Button variant="outline" className="w-full" onClick={() => handleOpen(mat)}>
									<Download className="w-4 h-4 mr-2" />
									Descarregar
								</Button>
							)}
							<div className="flex gap-2 mt-2">
								<span className="text-xs bg-muted px-2 py-1 rounded">{mat.disciplina}</span>
								<span className="text-xs bg-muted px-2 py-1 rounded">{mat.nivel}</span>
							</div>
						</div>
					))}
				</div>

				{/* Modal de aviso de download */}
				{showDownload && (
					<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in">
						<div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative flex flex-col items-center">
							<h2 className="text-lg font-bold mb-4">Vai descarregar o material</h2>
							<div className="mb-6 text-muted-foreground text-center">
								O ficheiro <span className="font-semibold">{showDownload.titulo}</span> será transferido para o seu
								computador.
							</div>
							<div className="flex gap-4">
								<Button variant="outline" onClick={() => setShowDownload(null)}>
									Cancelar
								</Button>
								<Button
									variant="hero"
									onClick={() => {
										window.open(showDownload.url, "_blank");
										setShowDownload(null);
									}}
								>
									Descarregar
								</Button>
							</div>
						</div>
					</div>
				)}
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

export default Materiais;
	