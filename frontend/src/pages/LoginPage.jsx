import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function LoginPage() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

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
                error.response?.data?.message ||
                "Giriş yapılırken bir hata oluştu."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Budget Tracker · Şirket Finans</h1>
                <h2>Giriş Yap</h2>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                >
                    <div className="form-group">
                        <label>Kullanıcı Adı</label>

                        <input
                            type="text"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            placeholder="Kullanıcı adınızı girin"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Şifre</label>

                        <input
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Şifrenizi girin"
                            required
                        />
                    </div>

                    <button
                        className="primary-button"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Giriş yapılıyor..."
                            : "Giriş Yap"}
                    </button>
                </form>

                <p className="auth-switch">Hesap ve yetki işlemleri için şirket yöneticinize başvurun.</p>
            </div>
        </div>
    );
}

export default LoginPage;
