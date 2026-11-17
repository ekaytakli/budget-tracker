# Şirket finans çalışma alanı

Bu sürüm tek bir şirketin TRY cinsinden gelir, gider, alacak ve borç takibi içindir.
Tüm yetkili çalışanlar aynı kayıtları görür. Önceki kişisel kayıtlar korunur ve şirket
çalışma alanına dahil edilir. `user_id` kaydı oluşturan kişiyi gösterir.

## Ekranlar

- **Genel bakış:** Kayıtlı gelir/gider, net tutar, tahsilat eksi ödeme ve bekleyenler.
- **Hesap hareketleri:** Birlikte çalışan tarih, tür, kategori, cari hesap, durum ve
  açıklama/belge/departman araması. Sunucuda sayfalama, sayfa başına 30 kayıt.
- **Dönem raporları:** İşlem tarihine göre kayıt bulunan son 24 ayın gelir, gider,
  tahsil edilmiş ve ödenmiş tutarları. Aktif filtreler rapora da uygulanır.
- **Cari hesaplar:** Müşteri/tedarikçi kartları, bekleyen alacak ve borç bakiyeleri,
  ilgili carinin hareketlerine geçiş.
- **Kategoriler:** Gelir/gider kategorilerini uygulamadan oluşturma.
- **İşlem geçmişi:** Yöneticiler için kayıt öncesi/sonrası değerleri ve işlem yapan kişi.
- **Ekip ve yetkiler:** Yönetici tarafından hesap oluşturma, rol değiştirme ve erişimi
  devre dışı bırakma. Kullanıcı üst menüden kendi parolasını değiştirebilir.

CSV dışa aktarma tüm filtrelere uyar, yalnızca açık sayfayla sınırlı değildir.
En fazla 10.000 kayıt dışa aktarılır; daha büyük sonuçlarda tarih aralığı daraltılır.
Dosya UTF-8 BOM ve noktalı virgül kullanır; tutarlarda ondalık virgül vardır.
Kullanıcı girdilerindeki Excel formül başlangıçları metne çevrilir.

## Hesaplama kuralları

- Tüm tutarlar pozitif ve en fazla iki ondalık basamaklıdır. Yönü gelir/gider türü belirler.
- Veritabanında para `NUMERIC(12,2)`, Java'da `BigDecimal` olarak tutulur.
- **Gelir / gider toplamı:** Ödenmiş ve bekleyen kayıtların tamamı.
- **Net gelir − gider:** Gelir toplamı eksi gider toplamı.
- **Net nakit hareketi:** Ödenmiş gelir eksi ödenmiş gider. Gerçek banka bakiyesi değildir;
  açılış bakiyesi ve banka mutabakatı içermez.
- **Bekleyen alacak / borç:** PENDING durumundaki gelir / gider.
- **Vadesi geçen:** Vadesi bugünden önce olan bekleyen gelir ve giderlerin toplamı.
- İptal edilmiş işlemler hiçbir finansal toplama katılmaz.
- Filtreler özet ve CSV için de geçerlidir. Cari kartların bakiyeleri tüm dönem içindir.
- Bekleyen kayıtta cari hesap ve vade zorunludur. Ödeme tamamlanınca kayıt düzenlenerek
  `Ödendi` / `Tahsil edildi` seçilir. Bu sürümde kısmi ödeme ve ayrı ödeme tarihi yoktur.
  Tarih filtreleri belge/işlem tarihine göre çalışır.
- Bir kaydı iki kişi açarsa ilk güncellemeden sonra eski sürümle gönderilen ikinci
  değişiklik 409 ile reddedilir. Kullanıcı listeyi yenilemelidir.
- İptal için neden zorunludur. Fiziksel silme ve iptali geri alma uç noktası yoktur.

## Yetkiler

| Rol | Okuma / CSV | Kayıt, kategori, cari ekleme ve düzenleme | Ekip / geçmiş |
| --- | --- | --- | --- |
| ADMIN | Evet | Evet | Evet |
| ACCOUNTANT | Evet | Evet | Hayır |
| VIEWER | Evet | Hayır | Hayır |

Yetkiler yalnızca ekranda değil API üzerinde uygulanır. Halka açık kayıt kapalıdır.
Eski güvensiz `/api/users` oluşturma işlemi kaldırıldı; aynı adres artık sadece
yöneticinin DTO ile, BCrypt parolayla hesap oluşturmasına izin verir. Yanıtlarda
parola veya parola özeti dönmez. Son yöneticinin yetkisi kaldırılamaz.
Son aktif yönetici devre dışı bırakılamaz. Yetki/erişim ve parola değişiklikleri
hesabın önceki JWT oturumlarını geçersiz kılar. Devre dışı hesap giriş yapamaz;
yeniden etkinleştirilse bile eski token ile oturum açamaz.

## İlk geçiş ve giriş

1. Eski backend'i durdurun. Proje kökünde `./scripts/Backup-Database.ps1` ile yedek alın.
2. `.env` dosyasında gerçek DB parolası ve `JWT_SECRET` bulunmalıdır. Yeni JWT anahtarı
   eski oturumları geçersiz kılar; kullanıcı yeniden giriş yapar.
   `./scripts/Initialize-Environment.ps1` eksik `.env` dosyasını örnekten oluşturur,
   boş DB parolası ve JWT alanlarını rastgele üretir; dolu değerleri değiştirmez.
3. Önceden kullanıcı bulunan veritabanında **en eski hesap bir defaya mahsus ADMIN**
   yapılır; diğer hesaplar VIEWER olur. Gerekli roller ekip ekranından verilir.
4. Veritabanı tamamen boşsa `.env` içindeki `BOOTSTRAP_ADMIN_USERNAME`,
   `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` doldurulmalıdır. Parola en az
   12 karakter, BCrypt için UTF-8 olarak en fazla 72 bayt olmalıdır. Kurulum sonrası
   bootstrap parolasını `.env` dosyasından kaldırabilirsiniz; var olan hesap güncellenmez.
5. Flyway V1 mevcut tabloları korur, yeni sütunları ve tabloları ekler. Eski işlemler
   PAID kabul edilir. Eski kayıtların gerçek oluşturulma saati bilinmediğinden geçiş
   anı atanır; geçiş öncesi değişiklik geçmişi oluşturulmaz.
6. `ddl-auto=validate` kullanılır. Şema değişiklikleri sürümlü SQL migration ile yapılır;
   uygulanmış migration dosyaları sonradan değiştirilmez.

## Windows'ta geliştirme

Docker Desktop, Java 17, Node 24 ve PowerShell kullanılır.

```powershell
.\scripts\Initialize-Environment.ps1
.\scripts\Start-Backend.ps1
```

Bu betik `.env` değerlerini terminale yükler, JWT anahtarı yoksa üretir, PostgreSQL'i
başlatır, migration öncesi yedek alır ve backend'i Maven Wrapper ile çalıştırır.
İlk kurulumdaki PostgreSQL kullanıcı/parola değerleri mevcut volume'dakiyle aynı olmalıdır.
Başka terminalde:

```powershell
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Adres: http://localhost:5173. API: http://localhost:8080/api.
Yeni klonda `application.properties` yoksa betik örnek yapılandırmayı kopyalar.
`application-docker.properties`, Windows'taki backend'i Docker DB'sine `127.0.0.1:5433`
üzerinden bağlar. Node/Vite geliştirme sunucusu gerçek sunucu yayını için kullanılmaz.

## Tamamen Docker ile çalıştırma

`.env` yerel olarak hazırlanmış ve JWT anahtarı oluşturulmuş olmalı. Windows'taki
backend/Vite aynı portlarda çalışıyorsa önce durdurun.

```powershell
.\scripts\Initialize-Environment.ps1
docker compose up -d --wait db
.\scripts\Backup-Database.ps1
docker compose up --build -d --wait
docker compose ps
docker compose logs --tail 100 backend
```

Tarayıcı yine http://localhost:5173 adresini açar. Üretim frontend derlemesi Nginx
tarafından sunulur; tarayıcı `/api` adresine gider. Nginx içeriden `backend:8080`
adresine yönlendirir. Backend içeriden `db:5432` kullanır. Servis isimleri tarayıcıya
verilmez. Dockerfile build aşaması Maven Wrapper ve JDK 17 ile JAR oluşturur;
run aşaması JRE 17 ve yetkisiz Linux kullanıcısıyla JAR'ı çalıştırır.

```powershell
docker compose stop
docker compose down
```

İkisi de volume'u korur. `docker compose down -v` verileri siler.
DB healthcheck bağlantıya hazır olmayı, backend healthcheck TCP portunun açılmasını
kontrol eder. `/api/health` ayrıca SQL sorgusu ile DB bağlantısını kontrol eder ve
bağlantı bilgilerini açıklamaz.

## Yedek ve geri yükleme

```powershell
.\scripts\Backup-Database.ps1
.\scripts\Restore-Database.ps1 -BackupFile .\backups\YEDEK.dump -NewDatabase budget_restore_test
```

Yedekler Git dışında kalan `backups/` klasöründedir. Custom-format pg_dump dosyası
PowerShell metin yönlendirmesinden geçirilmez; docker cp ile baytları korunarak taşınır.
Geri yükleme yalnızca **yeni bir veritabanına** yapılır; mevcut veritabanı varsa durur.
Başarısız geri yükleme asıl DB'yi değiştirmez. Başarılı dosya kopyası tek başına yeterli
değildir: düzenli olarak ayrı veritabanına geri yükleyip uygulamayla okuma doğrulanmalıdır.
Üretimde yedekleri aynı makineden ayrı, erişimi sınırlı ve şifreli depolamada saklayın;
zamanlamayı, saklama süresini ve geri dönüş hedeflerini şirketinize göre belirleyin.

## Testler

```powershell
.\mvnw.cmd test
cd frontend
npm run build
npm run lint
```

HTTP entegrasyon testleri geçici H2 veritabanında çalışır; gerçek kayıtları değiştirmez.
SQL migration ayrıca PostgreSQL 16 üzerinde, mevcut yedeğin ayrı kopyasında doğrulanmıştır.

## Gerçek kullanım sınırları

Bu sürüm şirketin gelir/gider ve cari takibi için geliştirilmiş bir temeldir.
Tam kapsamlı kurumsal muhasebe/ERP kabulü anlamına gelmez. Çift taraflı yevmiye,
hesap planı, dönem kapama, KDV motoru, e-Fatura/e-Defter entegrasyonu, döviz ve kur
farkı, kısmi tahsilat, banka mutabakatı, belge eki, satın alma onayı henüz yoktur.
Unutulan parola sıfırlama, MFA/SSO ve giriş denemesi sınırlaması ayrıca
geliştirilmelidir. Bu nedenle uygulama şu an internete açık
kurumsal üretim sistemi olarak sunulmamalıdır.

Üretim öncesi şirket muhasebe ekibiyle kabul senaryoları, bağımsız güvenlik incelemesi,
yük testi, HTTPS/alan adı, gizli değer yönetimi, merkezi izleme ve düzenli yedekten
geri dönüş tatbikatı tamamlanmalıdır. DB yöneticisi audit tablosuna erişebilir;
bu günlükler kriptografik olarak değiştirilemez bir arşiv değildir.
