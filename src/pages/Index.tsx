import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import GlowCursor from "@/components/GlowCursor";
import studentHero from "@/assets/student-hero.jpg";
import { GraduationCap, User, BookOpen } from "lucide-react";

const mockAccounts = [
  { id: "1", name: "João Silva", email: "joao.silva@email.com", role: "student", avatar: "👨‍🎓" },
  { id: "2", name: "Maria Costa", email: "maria.costa@email.com", role: "student", avatar: "👩‍🎓" },
  { id: "3", name: "Prof. Ana Santos", email: "ana.santos@professor.com", role: "teacher", avatar: "👩‍🏫" },
];

export default function Index() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showAccounts, setShowAccounts] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEmail = (val: string) => /\S+@\S+\.\S+/.test(val);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isEmail(identifier)) {
      setTimeout(() => {
        setLoading(false);
        setShowAccounts(true);
      }, 900);
    } else {
      setTimeout(() => {
        setLoading(false);
        navigate("/aluno");
      }, 900);
    }
  };

  const handleAccountSelect = (account: typeof mockAccounts[0]) => {
    setLoading(true);
    setTimeout(() => {
      if (account.role === "student") {
        navigate("/aluno");
      } else if (account.role === "teacher") {
        navigate("/professor");
      }
    }, 500);
  };

  return (
    <>
      <Helmet>
        <title>Centro de Explicações - Login</title>
        <meta name="description" content="Aceda à sua conta no centro de explicações. Área reservada para alunos e professores." />
        <meta name="keywords" content="login, centro explicações, alunos, professores, educação" />
        <link rel="canonical" href={window.location.origin} />
      </Helmet>

      <GlowCursor />
      
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <section className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          <div className="relative overflow-hidden rounded-2xl border border-border/40 glass-panel">
            <img
              src={studentHero}
              alt="Estudantes a estudar juntos"
              className="w-full h-[500px] lg:h-[600px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Bem-vindo ao seu Centro de Explicações</h2>
              <p className="text-white/90">
                Aceda à sua área reservada e continue a sua jornada de aprendizagem
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Iniciar Sessão</h1>
              <p className="text-muted-foreground">
                Entre na sua conta para aceder aos seus recursos
              </p>
            </div>

            {!showAccounts ? (
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Aceder à Conta</CardTitle>
                  <CardDescription>
                    Introduza o seu email ou nome de utilizador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Email ou nome de utilizador"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Palavra-passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11"
                      variant="hero"
                      disabled={loading}
                    >
                      {loading ? "A entrar..." : "Entrar"}
                    </Button>
                  </form>
                  
                  <div className="mt-6 text-center">
                    <Link
                      to="/recuperar-password"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Esqueceu-se da palavra-passe?
                    </Link>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border/40">
                    <p className="text-xs text-muted-foreground text-center mb-4">
                      Demo - Acesso rápido:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/aluno")}
                        className="w-full"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Aluno
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/professor")}
                        className="w-full"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Professor
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Escolha a sua conta</CardTitle>
                  <CardDescription>
                    Selecione a conta que pretende utilizar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockAccounts
                      .filter(account => account.email === identifier)
                      .map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleAccountSelect(account)}
                        disabled={loading}
                        className="w-full p-4 rounded-lg border border-border/40 hover:bg-accent/60 transition-colors text-left flex items-center gap-3"
                      >
                        <div className="text-2xl">{account.avatar}</div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {account.role === "student" ? "Aluno" : "Professor"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setShowAccounts(false)}
                    className="w-full mt-4"
                  >
                    ← Voltar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </>
  );
}