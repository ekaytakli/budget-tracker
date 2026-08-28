import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function RegisterPage() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await api.post("/auth/register", {
                username,
                email,
                password,
            });

            navigate("/login");
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Kayıt olurken bir hata oluştu."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Budget Tracker</h1>
                <h2>Kayıt Ol</h2>

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
                            placeholder="Kullanıcı adı"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>

                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="ornek@mail.com"
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
                            placeholder="Şifre"
                            required
                        />
                    </div>

                    <button
                        className="primary-button"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Kayıt oluşturuluyor..."
                            : "Kayıt Ol"}
                    </button>
                </form>

                <div className="auth-switch">
                    <span>Zaten hesabın var mı? </span>

                    <button
                        className="secondary-button"
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        Giriş Yap
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;