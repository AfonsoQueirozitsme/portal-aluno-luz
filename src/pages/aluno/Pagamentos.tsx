import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, TrendingUp, Receipt, Info, ArrowRight } from "lucide-react";

const pacotes = [
	{ id: 1, nome: "Pacote 5h", horas: 5, preco: 60 },
	{ id: 2, nome: "Pacote 10h", horas: 10, preco: 110 },
	{ id: 3, nome: "Pacote 20h", horas: 20, preco: 200 },
];

const faturas = [
	{
		id: 1,
		numero: "2024-001",
		periodo: "Maio 2024",
		data: "2024-06-01",
		valor: 90,
		estado: "Por pagar",
		metodo: "MBWay",
		referencia: "MBW123456",
		vencimento: "2024-06-15",
	},
	{
		id: 2,
		numero: "2024-002",
		periodo: "Abril 2024",
		data: "2024-05-01",
		valor: 75,
		estado: "Pago",
		metodo: "Cartão",
		referencia: "CC987654",
		vencimento: "2024-05-15",
	},
];

const saldoAtual = 7; // horas
const horasConsumidas = 12;
const valorDivida = faturas.filter((f) => f.estado !== "Pago").reduce((acc, f) => acc + f.valor, 0);
const faturasPorPagar = faturas.filter((f) => f.estado !== "Pago").length;
const totalGasto = faturas.reduce((acc, f) => acc + f.valor, 0);

const Pagamentos = () => {
	const navigate = useNavigate();
	const location = useLocation();

	let tab: "pre" | "pos";
	if (location.pathname.endsWith("pos-pago")) tab = "pos";
	else tab = "pre";

	const [modalOpen, setModalOpen] = useState(false);
	const [switchModalOpen, setSwitchModalOpen] = useState(false);
	const [pendingTab, setPendingTab] = useState<"pre" | "pos" | null>(null);

	const handleTab = (t: "pre" | "pos") => {
		if (t !== tab) {
			setPendingTab(t);
			setSwitchModalOpen(true);
		}
	};

	const confirmSwitch = () => {
		if (pendingTab) {
			navigate(`/aluno/pagamentos/${pendingTab === "pre" ? "pre-pago" : "pos-pago"}`);
			setSwitchModalOpen(false);
			setPendingTab(null);
		}
	};

	return (
		<div className="max-w-4xl mx-auto">
			<div className="flex mb-8 border-b border-border">
				<button
					className={`px-6 py-3 font-semibold transition-all duration-300 border-b-2 flex items-center gap-2 rounded-t-lg ${
						tab === "pre"
							? "border-primary text-primary bg-primary/5 shadow"
							: "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
					}`}
					onClick={() => handleTab("pre")}
				>
					<CreditCard className="w-5 h-5" /> Pré-pago
				</button>
				<button
					className={`px-6 py-3 font-semibold transition-all duration-300 border-b-2 flex items-center gap-2 rounded-t-lg ${
						tab === "pos"
							? "border-primary text-primary bg-primary/5 shadow"
							: "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
					}`}
					onClick={() => handleTab("pos")}
				>
					<Receipt className="w-5 h-5" /> Pós-pago
				</button>
			</div>

			{/* Modal de confirmação de troca de método */}
			<Dialog open={switchModalOpen} onOpenChange={setSwitchModalOpen}>
				<DialogContent className="max-w-md rounded-2xl shadow-2xl border-0 animate-modal-fade-in">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-xl">
							<ArrowRight className="w-6 h-6 text-primary" />
							Trocar método de pagamento
						</DialogTitle>
					</DialogHeader>
					<div className="mt-4 mb-6 text-base text-muted-foreground text-center">
						Tem a certeza que pretende trocar para o modo <span className="font-semibold text-primary">{pendingTab === "pre" ? "Pré-pago" : "Pós-pago"}</span>?<br />
						Esta ação pode afetar a forma como as suas explicações são faturadas.
					</div>
					<div className="flex gap-4 justify-center mt-4">
						<Button variant="outline" onClick={() => setSwitchModalOpen(false)}>
							Cancelar
						</Button>
						<Button variant="hero" onClick={confirmSwitch}>
							Trocar
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{tab === "pre" && (
				<div className="transition-all duration-500 animate-fade-in-smooth">
					<div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-primary/10 text-primary rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
							<span>Saldo atual</span>
							<span className="font-bold text-2xl">{saldoAtual}h</span>
						</div>
						<div className="bg-muted rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
							<span>Total gasto</span>
							<span className="font-bold text-2xl">{totalGasto.toFixed(2)} €</span>
						</div>
						<div className="bg-background border border-border rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
							<span>Última compra</span>
							<span className="font-bold text-2xl">10h</span>
							<span className="text-xs text-muted-foreground">em 2024-05-10</span>
						</div>
					</div>
					<div className="flex justify-end mb-6">
						<Button variant="hero" onClick={() => setModalOpen(true)}>
							Comprar pacote
						</Button>
					</div>
					<Dialog open={modalOpen} onOpenChange={setModalOpen}>
						<DialogContent className="max-w-2xl rounded-2xl shadow-2xl border-0 animate-modal-fade-in">
							<DialogHeader>
								<DialogTitle className="text-xl">Escolha um pacote</DialogTitle>
							</DialogHeader>
							<div className="grid md:grid-cols-3 gap-6 mt-4">
								{pacotes.map((p) => (
									<div
										key={p.id}
										className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center border border-border transition-all duration-300 hover:shadow-xl hover:border-primary"
									>
										<div className="text-xl font-bold mb-2">{p.nome}</div>
										<div className="text-4xl font-extrabold text-primary mb-2">{p.horas}h</div>
										<div className="text-lg font-semibold mb-4">{p.preco.toFixed(2)} €</div>
										<Button variant="hero" className="w-full" onClick={() => alert("Compra iniciada!")}>
											Comprar
										</Button>
									</div>
								))}
							</div>
						</DialogContent>
					</Dialog>
					<div className="mt-10">
						<div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
							<Info className="w-4 h-4" />
							O saldo pré-pago é descontado à medida que utiliza as explicações.
						</div>
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<TrendingUp className="w-4 h-4" />
							Pode comprar mais horas a qualquer momento.
						</div>
					</div>
				</div>
			)}

			{tab === "pos" && (
				<div className="transition-all duration-500 animate-fade-in-smooth">
					<div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="bg-primary/10 text-primary rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
							<span>Horas consumidas</span>
							<span className="font-bold text-2xl">{horasConsumidas}h</span>
						</div>
						<div className="bg-yellow-100 text-yellow-800 rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
							<span>Valor em dívida</span>
							<span className="font-bold text-2xl">{valorDivida.toFixed(2)} €</span>
						</div>
						<div className="bg-destructive/10 text-destructive rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
							<span>Faturas por pagar</span>
							<span className="font-bold text-2xl">{faturasPorPagar}</span>
						</div>
						<div className="bg-muted rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
							<span>Total faturado</span>
							<span className="font-bold text-2xl">{totalGasto.toFixed(2)} €</span>
						</div>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full mt-2 border-spacing-y-2 border-separate">
							<thead>
								<tr>
									<th className="text-left py-2 px-4">Fatura</th>
									<th className="text-left py-2 px-4">Período</th>
									<th className="text-left py-2 px-4">Data</th>
									<th className="text-right py-2 px-4">Valor</th>
									<th className="text-center py-2 px-4">Estado</th>
									<th className="text-center py-2 px-4">Método</th>
									<th className="text-center py-2 px-4">Vencimento</th>
									<th className="text-center py-2 px-4">Ações</th>
								</tr>
							</thead>
							<tbody>
								{faturas.map((f) => (
									<tr key={f.id} className="bg-card rounded-xl shadow border border-border">
										<td className="py-2 px-4 font-medium">{f.numero}</td>
										<td className="py-2 px-4">{f.periodo}</td>
										<td className="py-2 px-4">{f.data}</td>
										<td className="py-2 px-4 text-right">{f.valor.toFixed(2)} €</td>
										<td className="py-2 px-4 text-center">
											<span
												className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
													f.estado === "Pago"
														? "bg-green-100 text-green-700"
														: "bg-yellow-100 text-yellow-700"
												}`}
											>
												{f.estado}
											</span>
										</td>
										<td className="py-2 px-4 text-center">{f.metodo}</td>
										<td className="py-2 px-4 text-center">{f.vencimento}</td>
										<td className="py-2 px-4 text-center">
											<Button
												variant="outline"
												size="sm"
												className="rounded-lg"
												onClick={() => window.open('/fatura', '_blank')}
											>
												Ver Fatura
											</Button>
											{f.estado !== "Pago" && (
												<Button
													variant="hero"
													size="sm"
													className="ml-2 rounded-lg"
													onClick={() => window.open('/fatura', '_blank')}
												>
													Pagar
												</Button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="mt-10">
						<div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
							<Info className="w-4 h-4" />
							O pós-pago permite consumir explicações e pagar no final do mês.
						</div>
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<TrendingUp className="w-4 h-4" />
							Receberá uma fatura mensal com o resumo dos serviços.
						</div>
					</div>
				</div>
			)}
			<style>
				{`
					.animate-fade-in-smooth {
						animation: fadeInSmooth .6s cubic-bezier(.4,0,.2,1);
					}
					@keyframes fadeInSmooth {
						from { opacity: 0; transform: translateY(24px);}
						to { opacity: 1; transform: translateY(0);}
					}
					.animate-modal-fade-in {
						animation: modalFadeIn .4s cubic-bezier(.4,0,.2,1);
					}
					@keyframes modalFadeIn {
						from { opacity: 0; transform: scale(0.97);}
						to { opacity: 1; transform: scale(1);}
					}
				`}
			</style>
		</div>
	);
};

export default Pagamentos;
