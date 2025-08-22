// file: src/pages/Aluno/MaterialDetalhe.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ExternalLink,
  Presentation,
  FileText,
  Download,
  Image as ImageIcon,
  PlayCircle,
} from "lucide-react";
import { motion } from "framer-motion";

/* ──────────────────────────────────────────────────────────────
   PDF viewer (react-pdf-viewer)
---------------------------------------------------------------- */
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { fullScreenPlugin } from "@react-pdf-viewer/full-screen";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import "@react-pdf-viewer/full-screen/lib/styles/index.css";

/* ──────────────────────────────────────────────────────────────
   Vídeo player (Vidstack)
---------------------------------------------------------------- */
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { MediaPlayer, MediaProvider, Poster, Track } from '@vidstack/react';
// 👉 se o teu bundle aceitar este path:
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
// 👉 se o Vite acusar erro, usa este em alternativa:
// import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts';


type DbMaterial = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  school_year: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_ext: string | null;
};

const BUCKET = "materials";
const canonical = (id?: string) => `${window.location.origin}/aluno/materiais/${id ?? ""}`;

function isAbsUrl(s?: string | null) {
  return !!s && /^https?:\/\//i.test(s);
}
function toYouTubeEmbed(u: string) {
  try {
    const url = new URL(u);
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : u;
    }
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : u;
    }
  } catch {}
  return u;
}

export default function MaterialDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mat, setMat] = useState<DbMaterial | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [autoCompleted, setAutoCompleted] = useState(false);

  // Carregar material + signed URL
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!id) {
          setErr("Material inválido.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("materials")
          .select("id, title, description, subject, school_year, file_path, mime_type, file_ext")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setErr("Material não encontrado.");
          setLoading(false);
          return;
        }

        setMat(data as DbMaterial);

        if (data.file_path && !isAbsUrl(data.file_path)) {
          const { data: s, error: sErr } = await supabase
            .storage
            .from(BUCKET)
            .createSignedUrl(data.file_path, 60 * 60); // 1h
          if (!sErr && s?.signedUrl) setSignedUrl(s.signedUrl);
          else setSignedUrl(null);
        } else {
          setSignedUrl(null);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Não foi possível carregar o material.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Auto-completar homework (100% + completed) quando abrir
  useEffect(() => {
    (async () => {
      if (!mat || autoCompleted) return;
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;

        const { data: row } = await supabase
          .from("homework_assignments")
          .select(`id, assigned_at, homeworks!inner(material_id)`)
          .eq("student_id", uid)
          .eq("homeworks.material_id", mat.id)
          .order("assigned_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!row?.id) {
          setAutoCompleted(true);
          return;
        }

        const assignmentId = row.id as string;

        const { data: existing } = await supabase
          .from("homework_submissions")
          .select("id")
          .eq("assignment_id", assignmentId)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from("homework_submissions")
            .update({ grade: 100, details: { auto_completed_on_open: true, material_id: mat.id } })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("homework_submissions")
            .insert({ assignment_id: assignmentId, grade: 100, details: { auto_completed_on_open: true, material_id: mat.id } } as any);
        }

        await supabase
          .from("homework_assignments")
          .update({ status: "completed" })
          .eq("id", assignmentId);

        setAutoCompleted(true);
      } catch {
        // silencioso
      }
    })();
  }, [mat, autoCompleted]);

  // Derivados de UI
  const ext = useMemo(() => (mat?.file_ext || "").toLowerCase(), [mat]);
  const mime = useMemo(() => (mat?.mime_type || "").toLowerCase(), [mat]);

  const isPdf = ext === "pdf" || mime === "application/pdf";
  const isPpt = ext === "ppt" || ext === "pptx" || mime.includes("powerpoint");
  const isHtml = ext === "html" || mime === "text/html";
  const isHls = ext === "m3u8" || mime.includes("application/vnd.apple.mpegurl");
  const isVideo = mime.startsWith("video/") || ["mp4", "webm", "mkv"].includes(ext) || isHls;
  const isAudio = mime.startsWith("audio/");
  const isImage = mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext);
  const isArchive = ["zip", "rar", "7z", "tar", "gz"].includes(ext);

  const absoluteUrl = useMemo(() => (isAbsUrl(mat?.file_path) ? (mat?.file_path as string) : null), [mat]);
  const storageOrAbs = signedUrl || absoluteUrl || mat?.file_path || null;

  const isYouTube = !!absoluteUrl && /youtu\.?be/.test(absoluteUrl);
  const embedYouTube = isYouTube ? toYouTubeEmbed(absoluteUrl!) : null;

  const Icon =
    isVideo ? PlayCircle :
    isImage ? ImageIcon :
    isPdf ? FileText :
    isPpt ? Presentation :
    FileText;

  // Plugins do PDF
  const zoomPluginInstance = zoomPlugin();
  const pageNavPluginInstance = pageNavigationPlugin();
  const fullScreenPluginInstance = fullScreenPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;
  const { GoToPreviousPage, GoToNextPage, CurrentPageInput, NumberOfPages } = pageNavPluginInstance;
  const { EnterFullScreen } = fullScreenPluginInstance;

  // Fonte para o MediaPlayer (define type p/ MP4 ou HLS)
  const videoSrc = useMemo(() => {
    if (!storageOrAbs) return null;
    if (isHls) return { src: storageOrAbs, type: "application/x-mpegURL" }; // HLS
    const type = mime || (ext ? `video/${ext}` : "video/mp4");
    return { src: storageOrAbs, type };
  }, [storageOrAbs, isHls, mime, ext]);
// Tenta adivinhar poster e thumbnails a partir do nome do ficheiro (opcional):
const { posterGuess, thumbsGuess } = useMemo(() => {
  if (!storageOrAbs) return { posterGuess: undefined as string | undefined, thumbsGuess: undefined as string | undefined };
  try {
    // remove a extensão -> base
    const base = storageOrAbs.replace(/\.[^/.]+$/, '');
    return {
      posterGuess: `${base}.webp`,          // ex: video.mp4 -> video.webp
      thumbsGuess: `${base}.thumbnails.vtt` // ex: video.thumbnails.vtt
    };
  } catch {
    return { posterGuess: undefined, thumbsGuess: undefined };
  }
}, [storageOrAbs]);

// Text tracks (legendas). Deixa vazio por agora; quando tiveres VTT verdadeiros, preenche.
const textTracks = useMemo(
  () =>
    [] as Array<{
      kind?: 'subtitles' | 'captions';
      src: string;
      srclang?: string;
      label?: string;
      default?: boolean;
    }>,
  []
);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      {/* BG moderno, sem cinzento */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-indigo-50" />
      <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-30 bg-emerald-200" />
      <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-30 bg-indigo-200" />

      <Helmet>
        <title>{mat?.title ? `${mat.title} | Materiais` : "Material | Materiais"}</title>
        <meta name="description" content={mat?.description ?? "Detalhe do material de estudo."} />
        <link rel="canonical" href={canonical(id)} />
      </Helmet>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          &larr; Voltar
        </Button>

        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Icon className="w-6 h-6 text-primary" />
              {mat?.title ?? "Material"}
            </CardTitle>
            {mat?.subject || mat?.school_year || autoCompleted ? (
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {mat?.subject && <span className="bg-muted px-2 py-1 rounded">{String(mat.subject)}</span>}
                {mat?.school_year && <span className="bg-muted px-2 py-1 rounded">{mat.school_year}</span>}
                {autoCompleted && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded">
                    TPC concluído automaticamente
                  </span>
                )}
              </div>
            ) : null}
          </CardHeader>

          <CardContent>
            {loading && (
              <div className="relative h-[70vh] rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-muted/40 animate-pulse" />
              </div>
            )}

            {!loading && err && <div className="text-destructive text-sm">{err}</div>}

            {!loading && !err && mat && (
              <>
                {mat.description && (
                  <div className="text-muted-foreground mb-4">{mat.description}</div>
                )}

                {/* VIEWER */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border overflow-hidden bg-white/70 backdrop-blur"
                >
                  {/* PDF com react-pdf-viewer */}
                  {isPdf && storageOrAbs && (
                    <div className="flex flex-col">
                      {/* toolbar minimal, sem download/print */}
                      <div className="flex items-center justify-between px-3 py-2 border-b bg-white/70 backdrop-blur">
                        <div className="flex items-center gap-1">
                          <GoToPreviousPage />
                          <CurrentPageInput />
                          <span className="px-1 text-xs text-muted-foreground">/</span>
                          <NumberOfPages />
                          <GoToNextPage />
                        </div>
                        <div className="flex items-center gap-2">
                          <ZoomOut />
                          <ZoomPopover />
                          <ZoomIn />
                          <EnterFullScreen />
                        </div>
                      </div>

                      <div className="h-[72vh]">
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                          <Viewer
                            fileUrl={storageOrAbs}
                            plugins={[zoomPluginInstance, pageNavPluginInstance, fullScreenPluginInstance]}
                          />
                        </Worker>
                      </div>
                    </div>
                  )}

{/* Vídeo — Vidstack (layout “default” completo) */}
{!isPdf && isVideo && storageOrAbs && (
  <div className="w-full bg-black">
    <MediaPlayer
      src={videoSrc?.src || storageOrAbs}   // usa o src calculado (HLS/MP4)
      viewType="video"
      streamType="on-demand"
      logLevel="warn"
      crossOrigin
      playsInline
      title={mat?.title || 'Vídeo'}
      poster={posterGuess}                  // opcional; só aparece se existir
      className="w-full aspect-video bg-slate-900 text-white overflow-hidden rounded-xl ring-media-focus data-[focus]:ring-4"
    >
      <MediaProvider>
        <Poster className="vds-poster" />
        {textTracks.map((track) => (
          <Track {...track} key={track.src} />
        ))}
      </MediaProvider>

      {/* thumbnails também é opcional; só passa se existir */}
      <DefaultVideoLayout
        {...(thumbsGuess ? { thumbnails: thumbsGuess } : {})}
        icons={defaultLayoutIcons}
      />
    </MediaPlayer>
  </div>
)}

                  {/* YouTube */}
                  {!isPdf && !isVideo && isYouTube && embedYouTube && (
                    <iframe
                      src={embedYouTube}
                      className="w-full h-[64vh]"
                      title={mat.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}

                  {/* Imagem */}
                  {!isPdf && !isVideo && !isYouTube && isImage && storageOrAbs && (
                    <div className="w-full grid place-items-center bg-muted">
                      <img
                        src={storageOrAbs}
                        alt={mat.title || "Material"}
                        className="max-h-[72vh] w-auto object-contain"
                      />
                    </div>
                  )}

                  {/* HTML standalone */}
                  {!isPdf && !isVideo && !isYouTube && isHtml && storageOrAbs && (
                    <iframe
                      src={storageOrAbs}
                      className="w-full h-[72vh]"
                      title={mat.title || "Material"}
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                  )}

                  {/* PPT: normalmente não embebe bem → abrir em nova aba */}
                  {!isPdf && !isVideo && !isYouTube && !isImage && !isHtml && isPpt && (
                    <div className="p-6 text-sm text-muted-foreground">
                      Este ficheiro é uma apresentação. Usa o botão <strong>Abrir</strong> para visualizar.
                    </div>
                  )}

                  {/* Fallback */}
                  {!isPdf && !isVideo && !isYouTube && !isImage && !isHtml && !isPpt && (
                    <div className="p-6 text-sm text-muted-foreground">
                      Este ficheiro não tem preview embebido.
                    </div>
                  )}
                </motion.div>

                {/* Ações — sem “transferir” exceto arquivos */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {storageOrAbs && (isPpt || isHtml || isAbsUrl(mat.file_path || "")) && (
                    <Button
                      variant="hero"
                      onClick={() => window.open(storageOrAbs, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir
                    </Button>
                  )}
                  {storageOrAbs && isArchive && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(storageOrAbs, "_blank", "noopener,noreferrer")}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Transferir
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <style>
        {`
          .glass-panel{background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
          .animate-fade-in{animation:fadeIn .4s cubic-bezier(.4,0,.2,1)}
          @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          .rpv-core__inner{background:transparent}
        `}
      </style>
    </div>
  );
}
