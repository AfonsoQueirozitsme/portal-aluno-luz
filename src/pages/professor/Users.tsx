// file: src/pages/Admin/Users.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import {
  Users, Search, Mail, Phone, UserX, ShieldBan, ShieldCheck, ArrowLeftRight, Trash2, MessageSquare
} from "lucide-react";

type UserStatus = "ativo" | "inativo" | "incompleto" | "bloqueado";

type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null; // de profiles
  created_at: string | null;
  last_sign_in_at: string | null;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  banned?: boolean;
  status?: UserStatus;
};

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [hasMore, setHasMore] = useState(false);

  // Detalhe
  const [openDetail, setOpenDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  // Modal genérico de resultado (sucesso/erro)
  const [resultOpen, setResultOpen] = useState(false);
  const [resultOk, setResultOk] = useState<boolean | null>(null);
  const [resultMsg, setResultMsg] = useState("");

  // Confirm de remoção (controlado)
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function ensureSession() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) navigate("/");
  }

  // calcula status com base em banned + existência de profile + aulas
  function computeStatus(banned: boolean | undefined, hasProfile: boolean, lessonsCount: number): UserStatus {
    if (banned) return "bloqueado";
    if (!hasProfile) return "incompleto";
    return lessonsCount > 0 ? "ativo" : "inativo";
  }

  async function fetchUsers(pg = 1) {
    setLoading(true);
    setErr(null);
    try {
      // 1) users (via Edge Function)
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list", page: pg, perPage },
      });
      if (error) throw error;

      let base: AdminUser[] = (data?.users ?? []).map((u: any) => ({
        id: u.id,
        email: u.email ?? null,
        phone: u.profile_phone ?? null, // pode vir preenchido da função
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        app_metadata: u.app_metadata ?? {},
        user_metadata: u.user_metadata ?? {},
        banned: Boolean(u.banned),
      }));

      const userIds = base.map(u => u.id);
      if (userIds.length > 0) {
        // 2) profiles por auth_user_id (para garantir phone e saber se tem profile)
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("id, auth_user_id, phone")
          .in("auth_user_id", userIds);

        if (pErr) throw pErr;

        const profileByUser = new Map<string, { profile_id: string; phone: string | null }>();
        const profileIds: string[] = [];
        (profiles ?? []).forEach((p: any) => {
          profileByUser.set(p.auth_user_id, { profile_id: p.id, phone: p.phone ?? null });
          profileIds.push(p.id);
        });

        // 3) aulas por profile_id e contar
        let lessonsCountByProfile = new Map<string, number>();
        if (profileIds.length > 0) {
          const { data: lessons, error: lErr } = await supabase
            .from("scheduled_lessons")
            .select("profile_id")
            .in("profile_id", profileIds);

          if (lErr) throw lErr;

          (lessons ?? []).forEach((row: any) => {
            const pid = row.profile_id as string;
            lessonsCountByProfile.set(pid, (lessonsCountByProfile.get(pid) ?? 0) + 1);
          });
        }

        // 4) juntar e calcular status
        base = base.map(u => {
          const prof = profileByUser.get(u.id);
          const hasProfile = Boolean(prof?.profile_id);
          const lessonsCount = prof?.profile_id ? (lessonsCountByProfile.get(prof.profile_id) ?? 0) : 0;

          const status = computeStatus(u.banned, hasProfile, lessonsCount);

          // preferir phone do profiles se vier vazio
          const phone = u.phone ?? prof?.phone ?? null;

          return { ...u, phone, status };
        });
      }

      setUsers(base);
      setHasMore(Boolean(data?.has_more));
      setPage(pg);
    } catch (e: any) {
      console.error("[AdminUsers] list error:", e);
      setErr("Não foi possível obter a lista de utilizadores.");
    } finally {
      setLoading(false);
    }
  }

  function renderStatusBadge(status?: UserStatus, banned?: boolean) {
    // (banned já vem refletido no status, mas garantimos o visual)
    switch (status) {
      case "bloqueado":
        return <Badge variant="destructive">Bloqueado</Badge>;
      case "ativo":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Ativo</Badge>;
      case "inativo":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Inativo</Badge>;
      case "incompleto":
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Incompleto</Badge>;
    }
  }

  async function openUser(u: AdminUser) {
    setOpenDetail(true);
    setDetailLoading(true);
    try {
      // 1) user base
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "get", id: u.id },
      });
      if (error) throw error;
      const d = data?.user;

      let filled: AdminUser = {
        id: d.id,
        email: d.email ?? null,
        phone: d.profile_phone ?? null,
        created_at: d.created_at ?? null,
        last_sign_in_at: d.last_sign_in_at ?? null,
        app_metadata: d.app_metadata ?? {},
        user_metadata: d.user_metadata ?? {},
        banned: Boolean(d.banned),
      };

      // 2) status detalhado (profile + aulas)
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, phone")
        .eq("auth_user_id", filled.id)
        .maybeSingle();

      let hasProfile = Boolean(prof?.id);
      let phone = filled.phone ?? prof?.phone ?? null;
      let lessonsCount = 0;

      if (hasProfile) {
        const { data: lessons } = await supabase
          .from("scheduled_lessons")
          .select("id")
          .eq("profile_id", prof!.id);

        lessonsCount = lessons?.length ?? 0;
      }

      filled = {
        ...filled,
        phone,
        status: computeStatus(filled.banned, hasProfile, lessonsCount),
      };

      setSelected(filled);
    } catch (e: any) {
      console.error("[AdminUsers] get error:", e);
      setResultOk(false);
      setResultMsg("Não foi possível carregar o utilizador.");
      setResultOpen(true);
      setOpenDetail(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function blockUser(id: string, block: boolean) {
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: block ? "block" : "unblock", id },
      });
      if (error) throw error;
      setResultOk(true);
      setResultMsg(block ? "Utilizador bloqueado." : "Utilizador desbloqueado.");
      setResultOpen(true);

      if (selected?.id === id) await openUser(selected);
      await fetchUsers(page);
    } catch (e: any) {
      console.error("[AdminUsers] block error:", e);
      setResultOk(false);
      setResultMsg("Falhou bloquear/desbloquear o utilizador.");
      setResultOpen(true);
    }
  }

  async function deleteUser(id: string) {
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", id },
      });
      if (error) throw error;
      setResultOk(true);
      setResultMsg("Utilizador removido.");
      setResultOpen(true);
      setOpenDetail(false);
      await fetchUsers(page);
    } catch (e: any) {
      console.error("[AdminUsers] delete error:", e);
      setResultOk(false);
      setResultMsg("Falhou remover o utilizador.");
      setResultOpen(true);
    }
  }

  useEffect(() => {
    (async () => {
      await ensureSession();
      await fetchUsers(1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <>
      <Helmet>
        <title>Utilizadores | Admin</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Utilizadores</h1>
            <p className="text-muted-foreground">Lista dos utilizadores do Supabase (auth) com telemóvel do perfil e estado.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchUsers(1)}>
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Recarregar
            </Button>
          </div>
        </div>

        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por email, telefone, ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista
            </CardTitle>
            <CardDescription>
              {loading ? "A carregar…" : `${filtered.length} utilizador(es)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {err && <div className="text-destructive mb-4">{err}</div>}

            <div className="space-y-3">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.email || "sem email"}</span>
                      {renderStatusBadge(u.status, u.banned)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {u.id}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone || "—"}</span>
                      <span>Registo: {u.created_at ? new Date(u.created_at).toLocaleString("pt-PT") : "—"}</span>
                      <span>Último login: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-PT") : "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openUser(u)}>
                      Abrir
                    </Button>
                    <Button
                      variant={u.banned ? "secondary" : "destructive"}
                      size="sm"
                      onClick={() => blockUser(u.id, !u.banned)}
                    >
                      {u.banned ? (<><ShieldCheck className="h-4 w-4 mr-1" /> Desbloquear</>) : (<><ShieldBan className="h-4 w-4 mr-1" /> Bloquear</>)}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setRemoveId(u.id); setRemoveOpen(true); }}
                    >
                      <UserX className="h-4 w-4 mr-1" /> Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {!loading && (
              <div className="flex items-center justify-between mt-6">
                <Button variant="outline" disabled={page <= 1} onClick={() => fetchUsers(page - 1)}>Anterior</Button>
                <div className="text-sm text-muted-foreground">Página {page}</div>
                <Button variant="outline" disabled={!hasMore} onClick={() => fetchUsers(page + 1)}>Seguinte</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhe em Sheet */}
      <Sheet open={openDetail} onOpenChange={setOpenDetail}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalhe do Utilizador</SheetTitle>
            <SheetDescription>Dados do Supabase + telemóvel do perfil.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {detailLoading || !selected ? (
              <div className="text-muted-foreground">A carregar…</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selected.email || "sem email"}
                      {renderStatusBadge(selected.status, selected.banned)}
                    </CardTitle>
                    <CardDescription>ID: {selected.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Telemóvel (profiles):</strong> {selected.phone || "—"}</div>
                    <div><strong>Registo:</strong> {selected.created_at ? new Date(selected.created_at).toLocaleString("pt-PT") : "—"}</div>
                    <div><strong>Último login:</strong> {selected.last_sign_in_at ? new Date(selected.last_sign_in_at).toLocaleString("pt-PT") : "—"}</div>
                    <div><strong>Estado:</strong> {selected.status}</div>
                  </CardContent>
                </Card>

                {/* Contactar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contactar</CardTitle>
                    <CardDescription>Opções rápidas</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selected.email) window.open(`mailto:${selected.email}`, "_blank");
                      }}
                    >
                      <Mail className="h-4 w-4 mr-1" /> Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selected.phone) window.open(`tel:${selected.phone}`, "_blank");
                      }}
                    >
                      <Phone className="h-4 w-4 mr-1" /> Telefonar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selected.phone) {
                          const num = selected.phone.replace(/\D/g, "");
                          window.open(`https://wa.me/${num}`, "_blank");
                        }
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
                    </Button>
                  </CardContent>
                </Card>

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selected.banned ? "secondary" : "destructive"}
                    onClick={() => blockUser(selected.id, !selected.banned)}
                  >
                    {selected.banned ? (<><ShieldCheck className="h-4 w-4 mr-1" /> Desbloquear</>) : (<><ShieldBan className="h-4 w-4 mr-1" /> Bloquear</>)}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => { setRemoveId(selected.id); setRemoveOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Remover
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm de remoção */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar remoção</DialogTitle>
            <DialogDescription>Esta ação é irreversível. Queres mesmo remover?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (removeId) await deleteUser(removeId);
                setRemoveOpen(false);
                setRemoveId(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de resultado */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{resultOk ? "Tudo certo" : "Ocorreu um problema"}</DialogTitle>
            <DialogDescription>{resultMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResultOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
