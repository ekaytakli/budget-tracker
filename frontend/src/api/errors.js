export function message(error) {
  if (error.response?.status === 403)
    return "Bu işlem için yetkiniz bulunmuyor.";
  const data = error.response?.data;
  if (data?.validationErrors)
    return Object.entries(data.validationErrors)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" • ");
  return (
    data?.message ||
    (error.response
      ? "İşlem tamamlanamadı. Lütfen tekrar deneyin."
      : "Sunucuya ulaşılamıyor. Backend bağlantısını kontrol edin.")
  );
}
