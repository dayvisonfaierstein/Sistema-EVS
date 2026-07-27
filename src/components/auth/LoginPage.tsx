import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShoppingCart,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import "@/components/auth/login-page.css";

export type LoginCredentials = {
  email: string;
  password: string;
  remember: boolean;
};

type LoginPageProps = {
  onLogin: (credentials: LoginCredentials) => Promise<void> | void;
  onForgotPassword: (identifier: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  unitName?: string;
  heroImageSrc?: string;
  showGoogleLogin?: boolean;
  version: string;
  configured?: boolean;
};

export default function LoginPage({
  onLogin,
  onForgotPassword,
  loading = false,
  error = null,
  unitName = "Unidade Centro",
  heroImageSrc = "/images/login-wellness.png",
  showGoogleLogin = false,
  version,
  configured = true,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    await onLogin({ email: email.trim(), password, remember });
  }

  return (
    <main className="evs-login-shell">
      <section className="evs-login-card">
        <div className="evs-brand-panel">
          <div className="evs-brand-copy">
            <Brand />
            <div className="evs-headline">
              <h1>
                Gestão completa
                <br />
                para um espaço
                <br />
                <strong>Vida Saudável</strong>
              </h1>
              <p>
                Organize clientes, avaliações, vendas
                <br className="desktop-only" /> e muito mais em um só lugar.
              </p>
            </div>
            <div className="evs-feature-grid">
              <Feature
                icon={<UsersRound size={21} strokeWidth={1.9} />}
                title="Gestão de Clientes"
                description="Cadastro e acompanhamento completo"
              />
              <Feature
                icon={<BarChart3 size={21} strokeWidth={1.9} />}
                title="Relatórios Inteligentes"
                description="Dados e insights para decisões melhores"
              />
              <Feature
                icon={<ClipboardCheck size={21} strokeWidth={1.9} />}
                title="Avaliações"
                description="Acompanhe a evolução dos seus clientes"
              />
              <Feature
                icon={<ShoppingCart size={21} strokeWidth={1.9} />}
                title="Controle Comercial"
                description="Vendas, produtos, estoque e financeiro"
              />
            </div>
            <div className="evs-message-card">
              <div className="evs-message-icon">
                <ShieldCheck size={25} strokeWidth={1.8} />
              </div>
              <div>
                <strong>Mais saúde, mais controle, mais resultados.</strong>
                <span>Transforme vidas com organização e tecnologia.</span>
              </div>
            </div>
          </div>
          <div className="evs-arc evs-arc-left" aria-hidden="true" />
        </div>

        <div className="evs-hero-panel" aria-hidden="true">
          <img src={heroImageSrc} alt="" className="evs-hero-image" />
          <div className="evs-hero-arc" />
        </div>

        <div className="evs-form-panel">
          <div className="evs-form-wrap">
            <div className="evs-form-badge">
              <span className="evs-leaf-mark">◒</span>
            </div>
            <header className="evs-form-header">
              <h2>Bem-vindo de volta!</h2>
              <p>Acesse sua conta para continuar</p>
            </header>
            <form className="evs-form" onSubmit={handleSubmit}>
              <label className="evs-field">
                <span className="evs-label">Usuário ou e-mail</span>
                <span className="evs-input-wrap">
                  <Mail className="evs-input-icon" size={20} strokeWidth={1.8} />
                  <input
                    type="text"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Digite seu usuário ou e-mail"
                    autoComplete="username"
                    disabled={loading}
                    required
                  />
                </span>
              </label>
              <label className="evs-field">
                <span className="evs-label">Senha</span>
                <span className="evs-input-wrap">
                  <LockKeyhole className="evs-input-icon" size={20} strokeWidth={1.8} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="evs-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </span>
              </label>
              <div className="evs-form-options">
                <label className="evs-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    disabled={loading}
                  />
                  <span>Lembrar de mim</span>
                </label>
                <button
                  type="button"
                  className="evs-link-button"
                  onClick={() => onForgotPassword(email.trim())}
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>
              {error && (
                <div className="evs-error" role="alert">
                  {error}
                </div>
              )}
              {!configured && (
                <div className="evs-error" role="alert">
                  Ambiente ainda não conectado ao Supabase.
                </div>
              )}
              <button
                type="submit"
                className="evs-submit"
                disabled={loading || !configured || !email.trim() || !password}
              >
                {loading ? (
                  <span className="evs-spinner" aria-hidden="true" />
                ) : (
                  <ArrowRight size={20} />
                )}
                <span>{loading ? "Entrando..." : "Entrar no sistema"}</span>
              </button>
              {showGoogleLogin && null}
            </form>
            <footer className="evs-login-footer">
              <strong>Espaço+ — {unitName}</strong>
              <span>Espaço+ • Sistema de Gestão • {version}</span>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return <img className="evs-logo" src="/images/logo-espaco-mais.png" alt="Espaço+" />;
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="evs-feature">
      <div className="evs-feature-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}
