import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Euro,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
} from "lucide-react";

const mockInvoices = [
  {
    id: "FAT-2024-001",
    date: "2024-01-15",
    amount: 120.00,
    status: "paid",
    dueDate: "2024-01-30",
    description: "Explicações de Matemática - Janeiro 2024",
    services: [
      { name: "Explicações Matemática (8h)", price: 100.00 },
      { name: "Material didático", price: 20.00 }
    ]
  },
  {
    id: "FAT-2024-002",
    date: "2024-02-15",
    amount: 150.00,
    status: "pending",
    dueDate: "2024-02-28",
    description: "Explicações de Física e Matemática - Fevereiro 2024",
    services: [
      { name: "Explicações Matemática (6h)", price: 75.00 },
      { name: "Explicações Física (6h)", price: 75.00 }
    ]
  },
  {
    id: "FAT-2024-003",
    date: "2024-03-15",
    amount: 200.00,
    status: "overdue",
    dueDate: "2024-03-30",
    description: "Explicações múltiplas disciplinas - Março 2024",
    services: [
      { name: "Explicações Matemática (8h)", price: 100.00 },
      { name: "Explicações Física (6h)", price: 75.00 },
      { name: "Material de apoio", price: 25.00 }
    ]
  }
];

export default function Faturas() {
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paga
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Em atraso
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  return (
    <>
      <Helmet>
        <title>Faturas - Árvore do Conhecimento</title>
        <meta name="description" content="Gerir e visualizar as suas faturas do Árvore do Conhecimento" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Faturas</h1>
          <p className="text-muted-foreground">
            Gerir e visualizar as suas faturas e pagamentos
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total em Dívida</CardTitle>
              <Euro className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">€350,00</div>
              <p className="text-xs text-muted-foreground">2 faturas pendentes</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pago Este Mês</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">€120,00</div>
              <p className="text-xs text-muted-foreground">1 fatura paga</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Vencimento</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">28 Fev</div>
              <p className="text-xs text-muted-foreground">€150,00 a vencer</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Lista de Faturas
            </CardTitle>
            <CardDescription>
              Histórico completo das suas faturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">
                        {invoice.id}
                      </span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {invoice.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Data: {formatDate(invoice.date)}</span>
                      <span>Vencimento: {formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        {formatCurrency(invoice.amount)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/fatura/${invoice.id}`, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      {invoice.status !== 'paid' && (
                        <Button
                          variant="hero"
                          size="sm"
                          onClick={() => window.open(`/pagamento/${invoice.id}`, '_blank')}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Fatura {selectedInvoice.id}</CardTitle>
                    <CardDescription>
                      {formatDate(selectedInvoice.date)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedInvoice(null)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Serviços</h4>
                  {selectedInvoice.services.map((service, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm">{service.name}</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(service.price)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`/fatura/${selectedInvoice.id}`, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descarregar PDF
                  </Button>
                  {selectedInvoice.status !== 'paid' && (
                    <Button
                      variant="hero"
                      className="flex-1"
                      onClick={() => window.open(`/pagamento/${selectedInvoice.id}`, '_blank')}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar Agora
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}