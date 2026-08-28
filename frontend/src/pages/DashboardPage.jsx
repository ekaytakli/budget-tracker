
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function DashboardPage() {
    const navigate = useNavigate();

    const username = localStorage.getItem("username");

    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
    });

    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);

    const [type, setType] = useState("EXPENSE");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");

    const [editingId, setEditingId] = useState(null);

    const [filterCategoryId, setFilterCategoryId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [reportType, setReportType] = useState("daily");
    const [reportData, setReportData] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        fetchReportData();
    }, [reportType]);

    const fetchDashboardData = async () => {
        try {
            setError("");

            const [
                summaryResponse,
                transactionsResponse,
                categoriesResponse
            ] = await Promise.all([
                api.get("/transactions/summary"),
                api.get("/transactions"),
                api.get("/categories"),
            ]);

            setSummary(summaryResponse.data);
            setTransactions(transactionsResponse.data);
            setCategories(categoriesResponse.data);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Dashboard bilgileri alınamadı."
            );
        } finally {
            setLoading(false);
        }
    };

    const fetchReportData = async () => {
        try {
            setError("");

            const response = await api.get(
                `/transactions/reports/${reportType}`
            );

            setReportData(response.data);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Rapor verileri alınamadı."
            );
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setType("EXPENSE");
        setAmount("");
        setDate("");
        setDescription("");
        setCategoryId("");
    };

    const handleSubmitTransaction = async (event) => {
        event.preventDefault();

        try {
            setError("");

            const transactionData = {
                type,
                amount: Number(amount),
                date,
                description,
                categoryId: Number(categoryId),
            };

            if (editingId) {
                await api.put(
                    `/transactions/${editingId}`,
                    transactionData
                );
            } else {
                await api.post(
                    "/transactions",
                    transactionData
                );
            }

            resetForm();

            await fetchDashboardData();
            await fetchReportData();

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "İşlem kaydedilirken bir hata oluştu."
            );
        }
    };

    const handleEditTransaction = (transaction) => {
        setEditingId(transaction.id);
        setType(transaction.type);
        setAmount(transaction.amount);
        setDate(transaction.date);
        setDescription(transaction.description || "");
        setCategoryId(transaction.categoryId);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleDeleteTransaction = async (id) => {
        const confirmed = window.confirm(
            "Bu işlemi silmek istediğinize emin misiniz?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await api.delete(`/transactions/${id}`);

            if (editingId === id) {
                resetForm();
            }

            await fetchDashboardData();
            await fetchReportData();

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "İşlem silinirken bir hata oluştu."
            );
        }
    };

    const handleFilter = async () => {
        try {
            setError("");

            let response;

            if (filterCategoryId) {
                response = await api.get(
                    `/transactions/category/${filterCategoryId}`
                );

            } else if (startDate && endDate) {
                response = await api.get(
                    `/transactions/date-range?startDate=${startDate}&endDate=${endDate}`
                );

            } else {
                response = await api.get("/transactions");
            }

            setTransactions(response.data);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Filtreleme sırasında bir hata oluştu."
            );
        }
    };

    const clearFilters = async () => {
        setFilterCategoryId("");
        setStartDate("");
        setEndDate("");

        try {
            setError("");

            const response = await api.get("/transactions");

            setTransactions(response.data);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "İşlemler alınamadı."
            );
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");

        navigate("/login");
    };

    if (loading) {
        return (
            <div className="auth-page">
                <p>Yükleniyor...</p>
            </div>
        );
    }

    const chartData = {
        labels: ["Gelir", "Gider"],
        datasets: [
            {
                label: "Tutar (TL)",
                data: [
                    Number(summary.totalIncome),
                    Number(summary.totalExpense),
                ],
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
            legend: {
                display: false,
            },

            title: {
                display: true,
                text: "Gelir - Gider Karşılaştırması",
            },
        },

        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    const reportChartData = {
        labels: reportData.map((item) => item.label),

        datasets: [
            {
                label: "Gelir",
                data: reportData.map(
                    (item) => Number(item.totalIncome)
                ),
            },
            {
                label: "Gider",
                data: reportData.map(
                    (item) => Number(item.totalExpense)
                ),
            },
        ],
    };

    const reportChartOptions = {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
            legend: {
                position: "top",
            },

            title: {
                display: true,
                text:
                    reportType === "daily"
                        ? "Günlük Gelir - Gider"
                        : reportType === "weekly"
                            ? "Haftalık Gelir - Gider"
                            : "Aylık Gelir - Gider",
            },
        },

        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="page-container">
            <div className="dashboard-container">

                <header className="dashboard-header">
                    <div>
                        <h1>Budget Tracker</h1>
                        <p>Hoş geldin, {username}</p>
                    </div>

                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Çıkış Yap
                    </button>
                </header>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="summary-grid">
                    <div className="summary-card">
                        <h3>Toplam Gelir</h3>

                        <p className="income-text">
                            {Number(summary.totalIncome)
                                .toLocaleString("tr-TR")} TL
                        </p>
                    </div>

                    <div className="summary-card">
                        <h3>Toplam Gider</h3>

                        <p className="expense-text">
                            {Number(summary.totalExpense)
                                .toLocaleString("tr-TR")} TL
                        </p>
                    </div>

                    <div className="summary-card">
                        <h3>Bakiye</h3>

                        <p>
                            {Number(summary.balance)
                                .toLocaleString("tr-TR")} TL
                        </p>
                    </div>
                </div>

                <section className="section-card">
                    <h2>Finansal Genel Bakış</h2>

                    <div className="chart-container">
                        <Bar
                            data={chartData}
                            options={chartOptions}
                        />
                    </div>
                </section>

                <section className="section-card">

                    <div className="report-header">
                        <div>
                            <h2>Gelir - Gider Raporu</h2>
                            <p>
                                İşlemlerinizi dönemlere göre karşılaştırın.
                            </p>
                        </div>

                        <select
                            value={reportType}
                            onChange={(event) =>
                                setReportType(event.target.value)
                            }
                        >
                            <option value="daily">
                                Günlük
                            </option>

                            <option value="weekly">
                                Haftalık
                            </option>

                            <option value="monthly">
                                Aylık
                            </option>
                        </select>
                    </div>

                    {reportData.length === 0 ? (
                        <p>
                            Rapor için yeterli veri bulunmuyor.
                        </p>
                    ) : (
                        <div className="chart-container">
                            <Bar
                                data={reportChartData}
                                options={reportChartOptions}
                            />
                        </div>
                    )}

                </section>

                <section className="section-card">
                    <h2>
                        {editingId
                            ? "İşlemi Düzenle"
                            : "Yeni İşlem Ekle"}
                    </h2>

                    <form
                        className="transaction-form"
                        onSubmit={handleSubmitTransaction}
                    >
                        <div className="form-group">
                            <label>İşlem Türü</label>

                            <select
                                value={type}
                                onChange={(event) => {
                                    setType(event.target.value);
                                    setCategoryId("");
                                }}
                            >
                                <option value="INCOME">
                                    Gelir
                                </option>

                                <option value="EXPENSE">
                                    Gider
                                </option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tutar</label>

                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(event) =>
                                    setAmount(event.target.value)
                                }
                                placeholder="Örn. 1500"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tarih</label>

                            <input
                                type="date"
                                value={date}
                                onChange={(event) =>
                                    setDate(event.target.value)
                                }
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Kategori</label>

                            <select
                                value={categoryId}
                                onChange={(event) =>
                                    setCategoryId(event.target.value)
                                }
                                required
                            >
                                <option value="">
                                    Kategori Seç
                                </option>

                                {categories
                                    .filter(
                                        (category) =>
                                            category.type === type
                                    )
                                    .map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="form-group form-full">
                            <label>Açıklama</label>

                            <input
                                type="text"
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="İsteğe bağlı açıklama"
                            />
                        </div>

                        <div className="form-full form-actions">

                            <button
                                className="primary-button"
                                type="submit"
                            >
                                {editingId
                                    ? "Güncelle"
                                    : "İşlem Ekle"}
                            </button>

                            {editingId && (
                                <button
                                    className="cancel-button"
                                    type="button"
                                    onClick={resetForm}
                                >
                                    İptal
                                </button>
                            )}

                        </div>
                    </form>
                </section>

                <section className="section-card">
                    <h2>İşlemleri Filtrele</h2>

                    <div className="filter-grid">

                        <div className="form-group">
                            <label>Kategori</label>

                            <select
                                value={filterCategoryId}
                                onChange={(event) =>
                                    setFilterCategoryId(event.target.value)
                                }
                            >
                                <option value="">
                                    Tüm Kategoriler
                                </option>

                                {categories.map((category) => (
                                    <option
                                        key={category.id}
                                        value={category.id}
                                    >
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Başlangıç Tarihi</label>

                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) =>
                                    setStartDate(event.target.value)
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Bitiş Tarihi</label>

                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                            />
                        </div>

                        <div className="filter-actions">

                            <button
                                className="primary-button"
                                type="button"
                                onClick={handleFilter}
                            >
                                Filtrele
                            </button>

                            <button
                                className="cancel-button"
                                type="button"
                                onClick={clearFilters}
                            >
                                Temizle
                            </button>

                        </div>
                    </div>
                </section>

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>İşlemler</h2>
                            <p>
                                Toplam {transactions.length} işlem
                            </p>
                        </div>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="empty-state">
                            Filtreye uygun işlem bulunamadı.
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="transaction-table">
                                <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Kategori</th>
                                    <th>Tür</th>
                                    <th>Tutar</th>
                                    <th>Açıklama</th>
                                    <th>İşlemler</th>
                                </tr>
                                </thead>

                                <tbody>
                                {transactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td>
                                            {transaction.date}
                                        </td>

                                        <td>
                                            {transaction.categoryName}
                                        </td>

                                        <td>
                                                <span
                                                    className={
                                                        transaction.type === "INCOME"
                                                            ? "type-badge income-badge"
                                                            : "type-badge expense-badge"
                                                    }
                                                >
                                                    {transaction.type === "INCOME"
                                                        ? "Gelir"
                                                        : "Gider"}
                                                </span>
                                        </td>

                                        <td
                                            className={
                                                transaction.type === "INCOME"
                                                    ? "income-text"
                                                    : "expense-text"
                                            }
                                        >
                                            {transaction.type === "INCOME"
                                                ? "+"
                                                : "-"}
                                            {Number(transaction.amount)
                                                .toLocaleString("tr-TR")} TL
                                        </td>

                                        <td>
                                            {transaction.description || "-"}
                                        </td>

                                        <td>
                                            <div className="table-actions">

                                                <button
                                                    className="edit-button"
                                                    type="button"
                                                    onClick={() =>
                                                        handleEditTransaction(
                                                            transaction
                                                        )
                                                    }
                                                >
                                                    Düzenle
                                                </button>

                                                <button
                                                    className="delete-button"
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteTransaction(
                                                            transaction.id
                                                        )
                                                    }
                                                >
                                                    Sil
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}

export default DashboardPage;