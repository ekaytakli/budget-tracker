import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { message } from "../api/errors";
import "./LoginPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmation: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (form.password !== form.confirmation) {
      setError("Parola tekrarı eşleşmiyor.");
      return;
    }
    if (new TextEncoder().encode(form.password).length > 72) {
      setError("Parola UTF-8 biçiminde en fazla 72 bayt olabilir. Daha kısa bir parola seçin.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", {
        username: form.username.trim(), email: form.email.trim(), password: form.password,
      });
      navigate("/login", { replace: true, state: { registered: true, username: form.username.trim() } });
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page ledger-auth">
      <section className="auth-entry">
        <div className="auth-card">
          <Link className="auth-brand" to="/login"><span>bt.</span> budgettracker</Link>
          <h1>Kayıt ol</h1>
          <p className="auth-intro">Şirket finans çalışma alanı için hesabınızı oluşturun.</p>
          {error && <div className="error-message" role="alert">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="register-username">Kullanıcı adı</label>
              <input id="register-username" autoComplete="username" required minLength={3} maxLength={80}
                pattern="[a-zA-Z0-9._\-]+" title="Harf (a-z, A-Z), rakam, nokta, alt çizgi veya tire kullanın."
                aria-describedby="username-help" value={form.username} onChange={(e) => change("username", e.target.value)}
                placeholder="Kullanıcı adınızı belirleyin" />
              <small id="username-help" className="auth-help">En az 3 karakter; a-z, A-Z, rakam, nokta, alt çizgi veya tire.</small>
            </div>
            <div className="form-group">
              <label htmlFor="register-email">E-posta</label>
              <input id="register-email" type="email" autoComplete="email" required maxLength={200}
                value={form.email} onChange={(e) => change("email", e.target.value)} placeholder="ornek@sirket.com" />
            </div>
            <div className="form-group">
              <label htmlFor="register-password">Parola</label>
              <div className="auth-password">
                <input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                  required minLength={12} maxLength={72} aria-describedby="password-help"
                  value={form.password} onChange={(e) => change("password", e.target.value)} placeholder="En az 12 karakter" />
                <button type="button" className="auth-password-toggle" aria-controls="register-password register-confirmation"
                  aria-pressed={showPassword} aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
                  onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Gizle" : "Göster"}</button>
              </div>
              <small id="password-help" className="auth-help">En az 12 karakter kullanın.</small>
            </div>
            <div className="form-group">
              <label htmlFor="register-confirmation">Parola tekrarı</label>
              <input id="register-confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password"
                required minLength={12} maxLength={72} value={form.confirmation}
                onChange={(e) => change("confirmation", e.target.value)} placeholder="Parolanızı tekrar girin" />
            </div>
            <p className="auth-help">Hesabınız şirket kayıtlarını görüntüleme yetkisiyle açılır. İşlem eklemek için yöneticinizden yetki isteyin.</p>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
            </button>
          </form>
          <p className="auth-switch">Zaten hesabınız var mı? <Link to="/login">Giriş yap</Link></p>
        </div>
      </section>
    </div>
  );
}
