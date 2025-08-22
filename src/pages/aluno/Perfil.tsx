import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const canonical = () => `${window.location.origin}/aluno/perfil`;

const niveis = [
	"1º Ciclo",
	"2º Ciclo",
	"3º Ciclo",
	"Ensino Secundário",
	"Universidade",
	"Outro",
];

const generos = [
	{ value: "masculino", label: "Masculino" },
	{ value: "feminino", label: "Feminino" },
	{ value: "outro", label: "Outro" },
	{ value: "nao-dizer", label: "Prefiro não dizer" },
];

const estadosCivis = [
	"Solteiro(a)",
	"Casado(a)",
	"Divorciado(a)",
	"Viúvo(a)",
	"Outro",
];

const nacionalidades = [
	"Portuguesa",
	"Brasileira",
	"Angolana",
	"Moçambicana",
	"Cabo-verdiana",
	"Guineense",
	"São-tomense",
	"Outra",
];

const religioes = [
	"Católica",
	"Protestante",
	"Muçulmana",
	"Judaica",
	"Agnóstico",
	"Ateu",
	"Outra",
	"Prefiro não dizer",
];

const opcoesPrivacidade = [
	{ key: "partilharEmail", label: "Permitir partilha do meu email com professores" },
	{ key: "partilharTelefone", label: "Permitir partilha do meu telefone com professores" },
	{ key: "newsletter", label: "Receber newsletter e comunicações" },
	{ key: "dadosEstatisticos", label: "Permitir uso dos meus dados para estatísticas anónimas" },
];

const Perfil = () => {
	const [form, setForm] = useState({
		nome: "",
		username: "",
		email: "",
		telefone: "",
		dataNascimento: "",
		genero: "",
		estadoCivil: "",
		nacionalidade: "",
		nif: "",
		morada: "",
		codPostal: "",
		localidade: "",
		instituicao: "",
		curso: "",
		nivel: "",
		ano: "",
		religiao: "",
		alergias: "",
		necessidadesEspeciais: "",
		encarregadoEducacao: "",
		contactoEncarregado: "",
		observacoes: "",
		privacidade: {
			partilharEmail: false,
			partilharTelefone: false,
			newsletter: false,
			dadosEstatisticos: true,
		},
	});

	const handleChange = (field: string, value: any) => {
		setForm((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handlePrivacidade = (key: string, value: boolean) => {
		setForm((prev) => ({
			...prev,
			privacidade: {
				...prev.privacidade,
				[key]: value,
			},
		}));
	};

	return (
		<div>
			<Helmet>
				<title>Área do Aluno | Perfil - Árvore do Conhecimento</title>
				<meta name="description" content="Atualize os seus dados pessoais e preferências." />
				<link rel="canonical" href={canonical()} />
			</Helmet>

			<div className="max-w-2xl mx-auto bg-card rounded-xl shadow-lg p-8 animate-fade-in">
				<h1 className="text-2xl font-bold mb-6 text-primary">Dados Pessoais</h1>
				<form className="space-y-6">
					<div className="grid md:grid-cols-2 gap-6">
						<div>
							<label className="block mb-1 font-medium">Nome completo</label>
							<Input value={form.nome} onChange={e => handleChange("nome", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Nome de utilizador</label>
							<Input value={form.username} onChange={e => handleChange("username", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Email</label>
							<Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Telefone</label>
							<Input type="tel" value={form.telefone} onChange={e => handleChange("telefone", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Data de nascimento</label>
							<Input type="date" value={form.dataNascimento} onChange={e => handleChange("dataNascimento", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Género</label>
							<Select value={form.genero} onValueChange={v => handleChange("genero", v)}>
								<SelectTrigger>
									<SelectValue placeholder="Selecionar género" />
								</SelectTrigger>
								<SelectContent>
									{generos.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="block mb-1 font-medium">Estado civil</label>
							<Select value={form.estadoCivil} onValueChange={v => handleChange("estadoCivil", v)}>
								<SelectTrigger>
									<SelectValue placeholder="Selecionar estado civil" />
								</SelectTrigger>
								<SelectContent>
									{estadosCivis.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="block mb-1 font-medium">Nacionalidade</label>
							<Select value={form.nacionalidade} onValueChange={v => handleChange("nacionalidade", v)}>
								<SelectTrigger>
									<SelectValue placeholder="Selecionar nacionalidade" />
								</SelectTrigger>
								<SelectContent>
									{nacionalidades.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="block mb-1 font-medium">NIF</label>
							<Input value={form.nif} onChange={e => handleChange("nif", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Morada</label>
							<Input value={form.morada} onChange={e => handleChange("morada", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Código Postal</label>
							<Input value={form.codPostal} onChange={e => handleChange("codPostal", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Localidade</label>
							<Input value={form.localidade} onChange={e => handleChange("localidade", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Instituição de ensino</label>
							<Input value={form.instituicao} onChange={e => handleChange("instituicao", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Curso</label>
							<Input value={form.curso} onChange={e => handleChange("curso", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Nível de escolaridade</label>
							<Select value={form.nivel} onValueChange={v => handleChange("nivel", v)}>
								<SelectTrigger>
									<SelectValue placeholder="Selecionar nível" />
								</SelectTrigger>
								<SelectContent>
									{niveis.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="block mb-1 font-medium">Ano</label>
							<Input value={form.ano} onChange={e => handleChange("ano", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Religião</label>
							<Select value={form.religiao} onValueChange={v => handleChange("religiao", v)}>
								<SelectTrigger>
									<SelectValue placeholder="Selecionar religião" />
								</SelectTrigger>
								<SelectContent>
									{religioes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="block mb-1 font-medium">Alergias</label>
							<Input value={form.alergias} onChange={e => handleChange("alergias", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Necessidades especiais</label>
							<Input value={form.necessidadesEspeciais} onChange={e => handleChange("necessidadesEspeciais", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Encarregado de educação</label>
							<Input value={form.encarregadoEducacao} onChange={e => handleChange("encarregadoEducacao", e.target.value)} />
						</div>
						<div>
							<label className="block mb-1 font-medium">Contacto do encarregado</label>
							<Input value={form.contactoEncarregado} onChange={e => handleChange("contactoEncarregado", e.target.value)} />
						</div>
					</div>
					<div>
						<label className="block mb-1 font-medium">Observações</label>
						<Textarea value={form.observacoes} onChange={e => handleChange("observacoes", e.target.value)} />
					</div>
					<div className="mt-8">
						<h2 className="text-lg font-semibold mb-4 text-primary">Privacidade e consentimentos</h2>
						<div className="space-y-4">
							{opcoesPrivacidade.map(opt => (
								<div key={opt.key} className="flex items-center gap-3">
									<Switch
										checked={form.privacidade[opt.key as keyof typeof form.privacidade]}
										onCheckedChange={v => handlePrivacidade(opt.key, v)}
										id={opt.key}
									/>
									<label htmlFor={opt.key} className="text-sm">{opt.label}</label>
								</div>
							))}
						</div>
					</div>
					<div className="flex justify-end mt-8">
						<Button type="submit" variant="hero">
							Guardar alterações
						</Button>
					</div>
				</form>
				<style>
					{`
          .animate-fade-in {
            animation: fadeIn .7s cubic-bezier(.4,0,.2,1);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(24px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}
				</style>
			</div>
		</div>
	);
};

export default Perfil;
