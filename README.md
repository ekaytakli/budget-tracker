# Budget Tracker · Şirket Finans

Tek şirket için ortak gelir/gider, cari hesap, vade, rol yönetimi ve işlem geçmişi.

**Güncel kurulum, kullanım ve sınırlar:** [Şirket çalışma alanı rehberi](docs/COMPANY-WORKSPACE.md).

Aşağıdaki bölüm projenin önceki kişisel bütçe sürümünü anlatır; güncel kurulum için üstteki rehberi kullanın.

---

# 💰 Budget Tracker

Budget Tracker, kullanıcıların gelir ve giderlerini takip edebildiği, finansal durumlarını görüntüleyebildiği full-stack bir bütçe takip uygulamasıdır.

Uygulama; kullanıcı kayıt ve giriş işlemleri, JWT tabanlı kimlik doğrulama, gelir-gider yönetimi, kategori ve tarih bazlı filtreleme, finansal özetler ve raporlama özelliklerini içermektedir.

## 🚀 Kullanılan Teknolojiler

### Backend

- Java 17
- Spring Boot
- Spring Security
- Spring Data JPA
- JWT (JSON Web Token)
- PostgreSQL
- Maven
- Lombok
- Jakarta Validation

### Frontend

- React
- Vite
- React Router
- Axios
- Chart.js
- react-chartjs-2
- CSS

### Diğer Araçlar

- Git & GitHub
- IntelliJ IDEA
- Postman
- PostgreSQL

## ✨ Özellikler

- Kullanıcı kayıt olma
- Kullanıcı giriş ve çıkış işlemleri
- JWT tabanlı kimlik doğrulama
- Kullanıcıya özel veri yönetimi
- Gelir ve gider ekleme
- İşlem düzenleme
- İşlem silme
- İşlemleri listeleme
- Kategori bazlı filtreleme
- Tarih aralığına göre filtreleme
- Toplam gelir hesaplama
- Toplam gider hesaplama
- Güncel bakiye hesaplama
- Gelir-gider grafiklerinin görüntülenmesi
- Günlük raporlama
- Haftalık raporlama
- Aylık raporlama
- Responsive Dashboard arayüzü

## 🔐 Kimlik Doğrulama ve Güvenlik

Uygulamada Spring Security ve JWT kullanılmıştır.

Kullanıcı başarılı bir şekilde giriş yaptığında JWT oluşturulur. Frontend tarafından yapılan korumalı API isteklerinde bu token `Authorization` header'ı içerisinde backend'e gönderilir.

Kullanıcı verileri birbirinden ayrılmıştır. Her kullanıcı yalnızca kendi gelir ve gider işlemlerini görüntüleyebilir ve yönetebilir.

## 📊 Dashboard

Dashboard üzerinden kullanıcı;

- Toplam gelirini,
- Toplam giderini,
- Güncel bakiyesini,
- Gelir ve gider işlemlerini,
- Finansal grafiklerini,
- Günlük, haftalık ve aylık raporlarını

görüntüleyebilir.

Ayrıca Dashboard üzerinden yeni işlem eklenebilir, mevcut işlemler düzenlenebilir veya silinebilir.

## 📁 Proje Yapısı

```text
budget-tracker/
│
├── src/                    # Spring Boot Backend
│   └── main/
│       ├── java/
│       └── resources/
│
├── frontend/               # React Frontend
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       ├── App.jsx
│       └── main.jsx
│
├── pom.xml
└── README.md
```

## ⚙️ Projeyi Çalıştırma

### 1. Repository'yi klonlayın

```bash
git clone https://github.com/ekaytakli/budget-tracker.git
cd budget-tracker
```

### 2. PostgreSQL veritabanını hazırlayın

PostgreSQL üzerinde proje için bir veritabanı oluşturun ve backend tarafındaki veritabanı bağlantı ayarlarını kendi ortamınıza göre düzenleyin.

### 3. Backend'i çalıştırın

Spring Boot uygulamasını IntelliJ IDEA üzerinden çalıştırabilir veya terminalden:

```bash
mvn spring-boot:run
```

komutunu kullanabilirsiniz.

Backend varsayılan olarak:

```text
http://localhost:8080
```

adresinde çalışır.

### 4. Frontend'i çalıştırın

```bash
cd frontend
npm install
npm run dev
```

Frontend varsayılan olarak:

```text
http://localhost:5173
```

adresinde çalışır.

## 📈 Raporlama

Uygulama kullanıcının finansal hareketlerini farklı zaman aralıklarında inceleyebilmesini sağlar.

Desteklenen rapor türleri:

- Günlük
- Haftalık
- Aylık

Gelir ve gider verileri Chart.js kullanılarak grafik üzerinde gösterilmektedir.

## 🧪 Test Edilen İşlemler

Proje tamamlanmadan önce aşağıdaki temel akışlar test edilmiştir:

- Kullanıcı kaydı
- Kullanıcı girişi
- JWT authentication
- Kullanıcı izolasyonu
- İşlem ekleme
- İşlem güncelleme
- İşlem silme
- İşlem listeleme
- Kategori filtreleme
- Tarih aralığı filtreleme
- Gelir-gider özeti
- Günlük, haftalık ve aylık raporlar
- Frontend-backend entegrasyonu

## 👨‍💻 Proje Hakkında

Bu proje, Spring Boot ve React kullanılarak full-stack web uygulaması geliştirme sürecini uygulamalı olarak öğrenmek amacıyla geliştirilmiştir.

Backend tarafında REST API, veritabanı işlemleri, güvenlik ve JWT authentication üzerinde çalışılırken; frontend tarafında React ile kullanıcı arayüzü, API entegrasyonu, veri yönetimi ve grafiksel raporlama gerçekleştirilmiştir.
