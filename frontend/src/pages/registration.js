export function validateRegistration(form) {
  if (!/^[a-zA-Z0-9._-]{3,80}$/.test(form.username.trim())) {
    return "Kullanıcı adı 3–80 karakter olmalı; a-z, A-Z, rakam, nokta, alt çizgi veya tire içermelidir.";
  }
  const email = form.email.trim();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+$/.test(email)) {
    return "Geçerli bir e-posta adresi girin.";
  }
  if (!form.password.trim() || form.password.length < 12) {
    return "Parola en az 12 karakter olmalıdır.";
  }
  if (new TextEncoder().encode(form.password).length > 72) {
    return "Parola UTF-8 biçiminde en fazla 72 bayt olabilir. Daha kısa bir parola seçin.";
  }
  if (form.password !== form.confirmation) {
    return "Parola tekrarı eşleşmiyor.";
  }
  return "";
}
