import { Wrench } from "lucide-react";

const EmManutencao = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f0f4ff] via-[#e3e9f7] to-[#f9fafb] text-center px-4">
    <div className="max-w-md w-full bg-white/90 p-10 rounded-2xl shadow-2xl animate-fade-in flex flex-col items-center">
      <div className="mb-4">
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-2">
          <Wrench className="w-10 h-10 text-primary" />
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-2 text-primary">Em Manutenção</h1>
      <p className="mb-6 text-muted-foreground text-base">
        O portal está temporariamente indisponível para manutenção.<br />
        Por favor tente novamente mais tarde.
      </p>
      <span className="text-xs text-muted-foreground">Se precisar de ajuda urgente, contacte o suporte.</span>
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

export default EmManutencao;
