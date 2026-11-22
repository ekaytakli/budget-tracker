# Kullanıcı kaydı

Login ekranından **Kayıt ol** bağlantısı `/register` sayfasını açar. Kullanıcı adı,
e-posta, parola ve parola tekrarı doldurulur. Başarılı kayıt `/login` sayfasına
yönlendirir; başarı mesajı gösterilir ve kullanıcı adı hazır gelir.

## API ve güvenlik

Mevcut `POST /api/auth/register` endpoint'i korunur; JWT gerektirmez.
İstek alanları `username`, `email`, `password`; başarı yanıtı HTTP 201 ve
`id`, `username`, `email`, `role`, `active` alanlarıdır. Parola döndürülmez.

- Kullanıcı adı: 3–80 karakter, a-z/A-Z/rakam/nokta/alt çizgi/tire.
- E-posta: geçerli adres, en fazla 200 karakter. Yeni adresler küçük harfle saklanır;
  mevcut adreslerle büyük/küçük harf gözetilmeden karşılaştırılır.
- Parola: en az 12 karakter, BCrypt nedeniyle UTF-8 olarak en fazla 72 bayt.
- Eksik/geçersiz alanlar HTTP 400; kullanılan kullanıcı adı veya e-posta HTTP 409.
  Mevcut veritabanı UNIQUE kısıtları eşzamanlı aynı kayıtları da reddeder.
- Rol ve hesap durumu kayıt isteğinden alınmaz. Yeni hesaplar USER rolündedir;
  şirket verilerini okuyabilir, değiştiremez ve yönetici işlemi yapamaz.
- Eski ADMIN, ACCOUNTANT ve VIEWER hesapları ve parolaları korunur.
- Giriş mevcut `POST /api/auth/login` ile yapılır; JWT akışı korunur.

## Docker

Tarayıcı `/api` üzerinden istek gönderir. Docker'da Nginx bu istekleri
`backend:8080` adresine; yerel Vite ise `127.0.0.1:8080` adresine iletir.
`/register` adresini doğrudan açmak Nginx SPA fallback ile desteklenir.

Proje kökünde mevcut veritabanını ve volume'u koruyarak güncellemek için:

```powershell
docker compose up -d --build --no-deps backend frontend
docker compose ps
```

http://localhost:5173/login adresini açın. Eski ekran önbellekte kalmışsa Ctrl+F5
ile yenileyin. `compose.yaml`, Dockerfile ve `.env` değişikliği gerekmez.
V3 migration yalnızca gelecekteki kullanıcıların veritabanı rol varsayılanını
USER yapar; mevcut satırları değiştirmez.

## Testler

```powershell
.\mvnw.cmd test
cd frontend
npm test
npm run build
npm run lint
```

Backend testleri geçici H2 veritabanında gerçek HTTP üzerinden kayıt, bağımsız
kullanıcı adı/e-posta çakışmaları, eksik/geçersiz alanlar, UTF-8 parola sınırı,
rol enjeksiyonu, yeni hesapla JWT girişi ve yetkileri kontrol eder. Mevcut
şirket/authentication testleri aynı test paketindedir. Frontend form testleri
Node'un yerleşik test çalıştırıcısını kullanır; yeni bağımlılık eklenmemiştir.

### 22 Kasım 2026 doğrulama sonucu

- Maven wrapper ile 14 backend testi geçti; hata veya atlanan test yok.
- 6 frontend form testi, `npm run build` ve `npm run lint` geçti.
- Docker image'ları yeniden derlendi, yalnızca backend/frontend container'ları yenilendi.
- `localhost:5173` üzerinden Nginx → backend → PostgreSQL gerçek HTTP akışında:
  kayıt 201; bağımsız kullanıcı adı/e-posta çakışmaları 409; eksik/geçersiz alanlar 400;
  yeni kullanıcıyla giriş ve JWT `/api/users/me` 200; yönetici erişimi 403 doğrulandı.
- `/login` ve `/register` 200 döndü; sunulan güncel JavaScript paketinde kayıt
  sayfası ve bağlantısı doğrulandı. Tarayıcı otomasyon servisine erişilemediği için
  tıklama ve görsel kontrol otomatik olarak yapılamadı.
- Yalnızca test sırasında oluşturulan geçici hesap temizlendi. Önceki 1 ADMIN ve
  1 VIEWER hesabı kaldı; PostgreSQL container kimliği aynı. Flyway V3 başarılı.
- Güncelleme öncesi yedek: `backups/before-registration-20261122-142203.dump`.

## Değiştirilen ve eklenen dosyalar

| Dosya | Değişiklik |
| --- | --- |
| `src/main/java/com/budgettracker/budget_tracker/service/AuthService.java` | USER rolünü açıkça atama, e-posta normalleştirme ve çakışma kontrolü |
| `src/main/java/com/budgettracker/budget_tracker/repository/UserRepository.java` | Büyük/küçük harf gözetmeyen e-posta sorgusu |
| `src/main/java/com/budgettracker/budget_tracker/dto/RegisterRequest.java` | Türkçe Jakarta Validation mesajları |
| `src/main/java/com/budgettracker/budget_tracker/entity/User.java` | Yeni hesap varsayılanı USER |
| `src/main/java/com/budgettracker/budget_tracker/entity/UserRole.java` | Mevcut rolleri koruyarak USER ekleme |
| `src/main/java/com/budgettracker/budget_tracker/controller/UserController.java` | Oluşturulan gerçek rolü denetim kaydına yazma |
| `src/main/resources/db/migration/V3__registration_user_role.sql` | Yeni kayıtlar için USER veritabanı varsayılanı |
| `src/test/java/com/budgettracker/budget_tracker/CompanyLedgerIntegrationTests.java` | Kayıt, validasyon, çakışma, rol ve JWT testleri |
| `frontend/src/pages/RegisterPage.jsx` | Ortak form doğrulaması ve UTF-8 parola açıklaması |
| `frontend/src/pages/registration.js` | Form doğrulama kuralları |
| `frontend/src/pages/registration.test.js` | Node ile form testleri |
| `frontend/src/pages/DashboardPage.jsx` | USER rolünün Türkçe gösterimi |
| `frontend/src/api/axios.js` | Login/register için eski token göndermeme ve form hatalarını koruma |
| `frontend/src/api/errors.js` | Validasyon alan adlarının Türkçe gösterimi |
| `frontend/package.json` | Yerleşik Node test komutu |
| `docs/COMPANY-WORKSPACE.md` | USER rolü belgesi |
| `docs/REGISTRATION.md` | Kayıt sistemi, çalıştırma ve doğrulama belgesi |

Login sayfası, routing, AuthController, SecurityConfig, BCrypt bean'i ve Docker
proxy yapılandırması zaten gerekli akışı içerdiğinden yeniden yazılmadı.
