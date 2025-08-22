// --- helpers seguros para a key do Storage ---
function slugifyFilename(name: string) {
    const parts = name.split(".");
    const ext = parts.length > 1 ? "." + parts.pop()!.toLowerCase() : "";
    let base = parts.join(".");
  
    // remover acentos/diacríticos
    base = base.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    // minúsculas
    base = base.toLowerCase();
    // espaços → "-"
    base = base.replace(/\s+/g, "-");
    // apenas [a-z0-9._-]
    base = base.replace(/[^a-z0-9._-]/g, "");
    // trims e repetidos
    base = base.replace(/-+/g, "-").replace(/^[-_.]+|[-_.]+$/g, "");
    if (!base) base = "ficheiro";
    // limitar tamanho
    if (base.length > 80) base = base.slice(0, 80);
    return base + ext;
  }
  
  function safeStorageKey(folder: string, originalName: string) {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    const slug = slugifyFilename(originalName);
    const ts = Date.now();
    return `${cleanFolder}/${ts}_${slug}`;
  }
  
  // --- constantes locais ---
  const BUCKET = "materials"; // garante que este bucket existe no Storage
  
  // Tipagem opcional (ajusta ao teu projeto)
  type MaterialRow = {
    id: string;
    title: string;
    description: string | null;
    subject: "Matemática" | "Física" | "Química" | "Outros";
    school_year: "10º ano" | "11º ano" | "12º ano";
    file_path: string;
    mime_type: string;
    file_size_bytes: number;
    file_ext: string | null;
    visibility: "private" | "students" | "public";
    created_by: string;
    upload_date: string;
    downloads: number;
  };
  
  // --- função corrigida ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Escolhe um ficheiro.");
  
    try {
      setPending(true);
  
      // 0) auth obrigatória (created_by precisa de existir para RLS)
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        throw new Error("Sessão inválida. Faz login novamente.");
      }
  
      // 1) metadados do ficheiro
      const safeTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const mime = file.type || "application/octet-stream";
      const size = file.size;
  
      // 2) gerar key segura no Storage
      const filePath = safeStorageKey(userId, file.name);
  
      // 3) upload para bucket 'materials'
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: mime,
          cacheControl: "3600",
        });
  
      if (upErr) throw upErr;
  
      // 4) inserir na tabela 'materials' (respeitando o schema real)
      const payload = {
        title: safeTitle,
        description: description.trim() || null,
        subject,                // subject_enum
        school_year: schoolYear,
        file_path: filePath,    // chave relativa no bucket
        mime_type: mime,
        file_size_bytes: size,
        file_ext: ext || null,
        visibility,             // visibility_enum
        created_by: userId,     // auth.users.id (requer policy RLS)
        tags: [],               // opcional
      };
  
      const { data: inserted, error: insErr } = await supabase
        .from("materials")
        .insert(payload as any)
        .select("*")
        .single();
  
      if (insErr) throw insErr;
  
      onCreated(inserted as MaterialRow);
      toast.success("Material criado com sucesso.");
      setOpen(false);
  
      // 5) reset do formulário
      setFile(null);
      setTitle("");
      setDescription("");
      setSubject("Outros");
      setSchoolYear("10º ano");
      setVisibility("students");
    } catch (err: any) {
      // mensagens de erro mais claras
      const msg = String(err?.message || err);
      if (msg.includes("row-level security"))
        toast.error("Sem permissão para criar material (RLS). Confirma as policies.");
      else if (msg.toLowerCase().includes("invalid key"))
        toast.error("Nome de ficheiro inválido. Tenta novamente.");
      else toast.error(msg || "Falha ao criar material.");
    } finally {
      setPending(false);
    }
  }
  