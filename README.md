# MobiDrawer

Website vẽ trực tuyến được phát triển bằng NextJS và Java Spring Boot.

## Cài đặt dự án

Đầu tiên, clone repository về máy:

```bash
git clone https://github.com/nhocratac/Mobidrawer.git
cd Mobidrawer
```

Tiến hành cài đặt các thư viện cần thiết cho cả frontend và backend.

### Cài đặt frontend

```bash
cd client
npm install
```

### Cài đặt backend

- Cài đặt JDK 17: https://www.oracle.com/java/technologies/downloads/?er=221886 (phiên bản LTS được khuyến nghị cho Spring Boot), sau đó thiết lập biến môi trường
- Cài đặt IntelliJ IDEA: https://www.jetbrains.com/idea/download/?section=windows
- Cài đặt Maven: https://maven.apache.org/download.cgi, sau đó thiết lập biến môi trường
- Import thư mục đã clone, chờ IntelliJ index các file và tải các dependency
- Cài đặt các plugin: Spring Boot, Lombok, Maven Helper

## Cấu hình biến môi trường

Tạo một file `.env` trong thư mục `IE213Backend/` với nội dung như sau:

```env
APP_ENVIRONMENT=dev

### Mongodb ###
SPRING_DATA_MONGODB_URI=
SPRING_DATA_MONGODB_DATABASE=

### Mail ###
SPRING_MAIL_USERNAME=
SPRING_MAIL_PASSWORD=

### Redis ###
SPRING_DATA_REDIS_HOST=
SPRING_DATA_REDIS_PORT=

### JWT ###
JWT_SECRET=
JWT_ACCESS_EXPIRATION=
JWT_REFRESH_EXPIRATION=

### Gemini ###
GEMINI_API_KEY=

### VNPay ###
VNP_TMN_CODE=
VNP_SECRET_KEY=
```

## Khởi chạy hệ thống

- Tại IntelliJ, khởi chạy file Ie213BackendApplication

- Tại thư mục `client/`, khởi chạy frontend:

  ```bash
  npm run dev
  ```
- Tại Docker, ta cần pull Redis image từ Docker Hub:

  ```bash
  docker pull redis
  ```
  
![image](https://github.com/user-attachments/assets/b813a90f-e09d-49b4-a7ac-7089bce3f264)

- Sau khi thiết lập Redis như trên hình, khởi chạy Redis Image

Sau khi khởi chạy thành công, website sẽ chạy tại địa chỉ: [http://localhost:3000](http://localhost:3000)

