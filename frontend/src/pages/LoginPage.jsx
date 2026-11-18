import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { message } from "../api/errors";
import "./LoginPage.css";

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [username, setUsername] = useState(location.state?.username || "");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/login", {
                username,
                password,
            });

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("username", response.data.username);

            navigate("/dashboard");
        } catch (error) {
            setError(
                error.response?.status === 401
                    ? "Kullanıcı adı veya parola hatalı."
                    : message(error)
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page ledger-auth">
            <section className="auth-entry">
            <div className="auth-card">
                <a className="auth-brand" href="/login"><span>bt.</span> budgettracker</a>
                <h1>Giriş yap</h1>
                <p className="auth-intro">Şirket hesabınızla devam edin.</p>
                {location.state?.registered && (
                    <div className="auth-success" role="status">Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.</div>
                )}

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                >
                    <div className="form-group">
                        <label htmlFor="login-username">Kullanıcı adı</label>

                        <input
                            type="text"
                            id="login-username"
                            autoComplete="username"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            placeholder="Kullanıcı adınızı girin"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">Parola</label>

                        <div className="auth-password">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="login-password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Şifrenizi girin"
                            required
                        />
                        <button type="button" className="auth-password-toggle"
                            aria-controls="login-password" aria-pressed={showPassword}
                            aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
                            onClick={() => setShowPassword((value) => !value)}>
                            {showPassword ? "Gizle" : "Göster"}
                        </button>
                        </div>
                    </div>

                    <button
                        className="primary-button"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Giriş yapılıyor..."
                            : "Giriş yap"}
                    </button>
                </form>

                <p className="auth-switch">Hesabınız yok mu? <Link to="/register">Kayıt ol</Link></p>
            </div>
            </section>
        </div>
    );
}

export default LoginPage;
