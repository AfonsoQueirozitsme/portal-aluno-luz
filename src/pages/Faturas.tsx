import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useState, Fragment } from "react";

// Avatares SVG
const MaleAvatar = () => (
	<svg width="36" height="36" viewBox="0 0 36 36" fill="none">
		<circle cx="18" cy="18" r="18" fill="#e0e7ff" />
		<ellipse cx="18" cy="15" rx="7" ry="7" fill="#6366f1" />
		<ellipse cx="18" cy="29" rx="10" ry="6" fill="#a5b4fc" />
	</svg>
);
const FemaleAvatar = () => (
	<svg width="36" height="36" viewBox="0 0 36 36" fill="none">
		<circle cx="18" cy="18" r="18" fill="#fce7f3" />
		<ellipse cx="18" cy="15" rx="7" ry="7" fill="#f472b6" />
		<ellipse cx="18" cy="29" rx="10" ry="6" fill="#f9a8d4" />
	</svg>
);

const mockAccounts = [
	{ name: "João Silva", gender: "male" },
	{ name: "Maria Luz", gender: "female" },
];

const Index = () => {
	const canonical = () => `${window.location.origin}/`;
	const navigate = useNavigate();

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [showAccounts, setShowAccounts] = useState(false);
	const [loading, setLoading] = useState(false);
	const [showForgot, setShowForgot] = useState(false);
	const [forgotEmail, setForgotEmail] = useState("");
	const [forgotSent, setForgotSent] = useState(false);

	// Deteta se é email
	const isEmail = (val: string) => /\S+@\S+\.\S+/.test(val);

	// Submissão do formulário
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
			}, 700);
		}
	};

	// Escolha de conta (após email)
	const handleAccountSelect = () => {
		setLoading(true);
		setTimeout(() => {
			setLoading(false);
			navigate("/aluno");
		}, 700);
	};

	return (
		<main
			className="min-h-screen flex items-center justify-center"
			style={{
				background:
					"linear-gradient(135deg, #f0f4ff 0%, #e3e9f7 50%, #f9fafb 100%)",
			}}
		>
			{/* Seta voltar atrás */}
			<button
				type="button"
				onClick={() => window.history.back()}
				className="absolute top-6 left-6 flex items-center gap-2 text-primary font-medium transition z-30 group"
				style={{ fontSize: 17, padding: "6px 12px", borderRadius: "8px", overflow: "hidden" }}
			>
				<svg width="22" height="22" fill="none" viewBox="0 0 24 24">
					<path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
				<span className="transition-colors">Voltar</span>
				<style>
					{`
						.group {
							background: transparent;
							transition: background 0.35s cubic-bezier(.4,0,.2,1), color 0.25s;
						}
						.group:hover {
							background: linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%);
							color: #fff;
						}
						.group:hover span {
							color: #fff;
						}
						.group:active {
							filter: brightness(0.97);
						}
					`}
				</style>
			</button>
			<section className="text-center max-w-md w-full p-8 rounded-xl shadow-lg bg-card relative overflow-hidden">
				<h1 className="text-4xl font-bold mb-4">Iniciar Sessão</h1>
				<p className="text-base text-muted-foreground mb-8">
					Aceda com email ou utilizador.
				</p>
				{/* Formulário de login */}
				<div className="relative min-h-[220px]">
					{/* Login Form */}
					<div
						className={`absolute inset-0 w-full transition-all duration-500 ${
							!showAccounts && !showForgot
								? "opacity-100 translate-x-0 z-10"
								: "opacity-0 pointer-events-none -translate-x-8 z-0"
						}`}
					>
						<form
							className="flex flex-col gap-4"
							onSubmit={handleLogin}
						>
							<input
								type="text"
								placeholder="Email ou utilizador"
								className="px-4 py-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
								autoComplete="username email"
								required
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								disabled={loading}
							/>
							<input
								type="password"
								placeholder="Palavra-passe"
								className="px-4 py-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={loading}
							/>
							<Button
								type="submit"
								variant="hero"
								className="mt-2"
								disabled={loading}
							>
								{loading ? "A entrar..." : "Entrar"}
							</Button>
						</form>
						<div className="mt-6">
							<button
								type="button"
								className="text-sm text-primary hover:underline transition"
								onClick={() => setShowForgot(true)}
								disabled={loading}
							>
								Esqueceu-se da palavra-passe?
							</button>
						</div>
					</div>
					{/* Escolha de contas associadas ao email */}
					<div
						className={`absolute inset-0 w-full transition-all duration-500 ${
							showAccounts && !showForgot
								? "opacity-100 translate-x-0 z-10"
								: "opacity-0 pointer-events-none translate-x-8 z-0"
						}`}
					>
						{showAccounts && (
							<div
								className="animate-fade-in flex flex-col items-center gap-4"
								style={{ minHeight: 220 }}
							>
								<div className="mb-2 text-lg font-semibold">
									Escolha a sua conta
								</div>
								<div className="flex flex-col gap-5 w-full">
									{mockAccounts.map((acc, idx) => (
										<Button
											key={idx}
											variant="outline"
											className="flex items-center gap-4 justify-start px-8 py-5 text-lg font-medium transition-all duration-200 rounded-xl shadow-sm hover:bg-primary hover:text-white hover:shadow-lg"
											onClick={handleAccountSelect}
											disabled={loading}
											style={{ minHeight: 64 }}
										>
											<span className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-200">
												{acc.gender === "male" ? <MaleAvatar /> : <FemaleAvatar />}
											</span>
											<span>{acc.name}</span>
										</Button>
									))}
								</div>
								<Button
									variant="ghost"
									className="mt-2 text-muted-foreground text-sm"
									onClick={() => setShowAccounts(false)}
									disabled={loading}
								>
									Voltar
								</Button>
							</div>
						)}
					</div>
					{/* Modal esqueceu-se da palavra-passe */}
					<div
						className={`absolute inset-0 w-full flex items-center justify-center transition-all duration-500 ${
							showForgot ? "opacity-100 translate-y-0 z-20" : "opacity-0 pointer-events-none translate-y-8 z-0"
						}`}
						style={{ background: showForgot ? "rgba(249,250,251,0.96)" : "transparent" }}
					>
						{showForgot && (
							<div
								className="bg-white rounded-xl shadow-xl p-8 animate-fade-in flex flex-col items-center"
								style={{
									width: "100%",
									maxWidth: "100%",
									minWidth: 0,
									minHeight: "352px", // igual ao card principal (p-8 + text + inputs + botões)
									display: "flex",
									justifyContent: "center"
								}}
							>
								<h2 className="text-2xl font-bold mb-2">Recuperar palavra-passe</h2>
								<p className="text-muted-foreground mb-6 text-sm">
									Insira o seu email para receber instruções de recuperação.
								</p>
								{!forgotSent ? (
									<Fragment>
										<form
											className="w-full flex flex-col gap-4"
											onSubmit={e => {
												e.preventDefault();
												setForgotSent(true);
												setTimeout(() => {
													setShowForgot(false);
													setForgotSent(false);
													setForgotEmail("");
												}, 1800);
											}}
										>
											<input
												type="email"
												placeholder="O seu email"
												className="px-4 py-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
												required
												value={forgotEmail}
												onChange={e => setForgotEmail(e.target.value)}
												autoFocus
											/>
											<Button type="submit" variant="hero">
												Enviar
											</Button>
										</form>


































export default Index;};	);		</main>			</section>				</div>					</div>						)}							</div>								)}									</div>										</Button>											Voltar ao início										>											disabled={loading}											onClick={() => setShowForgot(false)}											className="mt-4 text-muted-foreground text-sm"											variant="ghost"										<Button										</Button>											Pagar										>											onClick={() => window.open('/fatura', '_blank')}											size="sm"											variant="hero"										<Button										</p>											<span className="font-medium text-primary">{forgotEmail}</span>.											Um email com as instruções foi enviado para{" "}										<p className="text-sm text-muted-foreground mb-4">									<div className="text-center">								) : (									</Fragment>										<Button
											variant="ghost"
											className="mt-2 text-muted-foreground text-sm"
											onClick={() => setShowForgot(false)}
										>
											Cancelar
										</Button>
									</Fragment>
								) : (
									<div className="w-full text-center py-8">
										<p className="text-primary font-semibold mb-2">Verifique o seu email!</p>
										<p className="text-muted-foreground text-sm">Enviámos instruções para recuperar a palavra-passe.</p>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
				{/* Animação fade-in */}
				<style>
					{`
						.animate-fade-in {
							animation: fadeIn .5s cubic-bezier(.4,0,.2,1);
						}
						@keyframes fadeIn {
							from { opacity: 0; transform: translateY(20px);}
							to { opacity: 1; transform: translateY(0);}
						}
					`}
				</style>
			</section>
		</main>
	);
};

export default Index;
<Button
  variant="outline"
  size="sm"
  onClick={() => window.open('/fatura', '_blank')}
>
  Ver Fatura
</Button>