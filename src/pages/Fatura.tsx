import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

// Exemplo de dados de fatura
const dadosFatura = {
  numero: "2024-001",
  data: "2024-06-01",
  cliente: {
    nome: "João Silva",
    email: "joao@email.com",
    nif: "123456789",
    morada: "Rua das Flores, 123, 1000-000 Lisboa",
  },
  servicos: [
    { categoria: "1º Ciclo", horas: 2, precoHora: 12 },
    { categoria: "Ensino Básico", horas: 3, precoHora: 15 },
    { categoria: "Ensino Secundário", horas: 1, precoHora: 18 },
    { categoria: "Universidade", horas: 0, precoHora: 25 },
  ],
  taxaServico: { percentagem: 0.015, valorFixo: 0.25, multiplicador: 1.5 },
};

function calcularSubtotal(servicos: typeof dadosFatura.servicos) {
  return servicos.reduce((acc, s) => acc + s.horas * s.precoHora, 0);
}

function calcularTaxa(subtotal: number, taxa: typeof dadosFatura.taxaServico) {
  // (subtotal * percentagem + valorFixo) * multiplicador
  return ((subtotal * taxa.percentagem + taxa.valorFixo) * taxa.multiplicador);
}

const Fatura = () => {
  const subtotal = calcularSubtotal(dadosFatura.servicos);
  const taxa = calcularTaxa(subtotal, dadosFatura.taxaServico);
  const total = subtotal + taxa;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f0f4ff] via-[#e3e9f7] to-[#f9fafb] px-4 py-10">
      <div className="max-w-2xl w-full bg-white/95 rounded-2xl shadow-2xl p-10 animate-fade-in print:shadow-none print:bg-white print:p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-1">Fatura #{dadosFatura.numero}</h1>
            <span className="text-muted-foreground text-sm">Data: {dadosFatura.data}</span>
          </div>
          <CheckCircle2 className="w-10 h-10 text-primary/70 print:hidden" />
        </div>
        <div className="mb-6 flex flex-col md:flex-row md:justify-between gap-2">
          <div>
            <div className="font-semibold mb-1">Cliente:</div>
            <div>{dadosFatura.cliente.nome}</div>
            <div className="text-sm text-muted-foreground">{dadosFatura.cliente.email}</div>
            <div className="text-sm text-muted-foreground">NIF: {dadosFatura.cliente.nif}</div>
            <div className="text-sm text-muted-foreground">{dadosFatura.cliente.morada}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold mb-1">Emitente:</div>
            <div>Árvore do Conhecimento Luz</div>
            <div className="text-sm text-muted-foreground">NIF: 987654321</div>
            <div className="text-sm text-muted-foreground">Av. Principal, 456, 1000-001 Lisboa</div>
          </div>
        </div>
        <div className="mb-6 rounded-xl overflow-hidden border border-border bg-background">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-muted">Serviço</th>
                <th className="py-2 px-4 bg-muted text-center">Horas</th>
                <th className="py-2 px-4 bg-muted text-right">Preço/Hora</th>
                <th className="py-2 px-4 bg-muted text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {dadosFatura.servicos.filter(s => s.horas > 0).map((s, idx) => (
                <tr key={idx}>
                  <td className="px-4">{s.categoria}</td>
                  <td className="px-4 text-center">{s.horas}</td>
                  <td className="px-4 text-right">{s.precoHora.toFixed(2)} €</td>
                  <td className="px-4 text-right">{(s.horas * s.precoHora).toFixed(2)} €</td>
                </tr>
              ))}
              <tr>
                <td className="px-4 text-muted-foreground" colSpan={3}>
                  Taxa de serviço ({(dadosFatura.taxaServico.percentagem * 100).toFixed(1)}% + {dadosFatura.taxaServico.valorFixo.toFixed(2)} €) × {dadosFatura.taxaServico.multiplicador}
                </td>
                <td className="px-4 text-right">{taxa.toFixed(2)} €</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="font-bold pt-4 px-4" colSpan={3}>Total</td>
                <td className="font-bold text-right pt-4 px-4">{total.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex gap-4 mt-8 justify-end print:hidden">
          <Button variant="hero" onClick={() => alert("Pagamento iniciado!")}>
            Pagar agora
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
        <div className="mt-8 text-xs text-muted-foreground text-center">
          Esta fatura serve de recibo após pagamento. Para dúvidas contacte o suporte.
        </div>
      </div>
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
  );
};

export default Fatura;
