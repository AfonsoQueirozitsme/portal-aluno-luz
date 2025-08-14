import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

const ContaBloqueada = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f0f4ff] via-[#e3e9f7] to-[#f9fafb] text-center px-4">
    <div className="max-w-md w-full bg-white/90 p-10 rounded-2xl shadow-2xl animate-fade-in flex flex-col items-center">
      <div className="mb-4">
        <span className="inline-flex items-center justify-center rounded-full bg-destructive/10 p-4 mb-2">
          <Lock className="w-10 h-10 text-destructive" />
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-2 text-destructive">Conta Bloqueada</h1>
      <p className="mb-6 text-muted-foreground text-base">
        A sua conta foi temporariamente bloqueada.<br />
        Por favor contacte o suporte para mais informações.
      </p>
      <Link to="/" className="text-primary hover:underline font-medium">
        Voltar ao início
      </Link>
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

export default ContaBloqueada;
