# Hướng dẫn Cài đặt Trạm In (Print Agent)

Đây là chương trình nhỏ chạy trên một máy tính tại nhà hàng để lắng nghe và tự động in hóa đơn từ ứng dụng web ra máy in nhiệt.

## Yêu cầu

1.  **Một máy tính chạy liên tục**: Có thể là PC Windows, Laptop, hoặc một máy tính nhỏ như Raspberry Pi.
2.  **Node.js**: Cần cài đặt Node.js (phiên bản 16 trở lên). Tải về tại [https://nodejs.org/](https://nodejs.org/).
3.  **Máy in nhiệt**: Máy in phải có cổng mạng (LAN) và được kết nối vào cùng một mạng với máy tính này.
4.  **Biết địa chỉ IP của máy in**: Ví dụ: `192.168.1.100`.

## Các bước Cài đặt

1.  **Chép thư mục `print-agent`**: Chép toàn bộ thư mục này vào máy tính sẽ dùng làm Trạm In.

2.  **Cài đặt các gói phụ thuộc**:
    *   Mở Terminal (trên macOS/Linux) hoặc Command Prompt/PowerShell (trên Windows).
    *   Di chuyển vào bên trong thư mục `print-agent` bằng lệnh `cd`. Ví dụ:
        ```bash
        cd C:\Users\Admin\Desktop\print-agent
        ```
    *   Chạy lệnh sau để cài đặt các thư viện cần thiết:
        ```bash
        npm install
        ```

3.  **Cấu hình kết nối Firebase**:
    *   Mở file `index.js` trong thư mục `print-agent` bằng một trình soạn thảo văn bản (như Notepad++, VS Code).
    *   Tìm đến phần `// --- CẤU HÌNH ---` ở đầu file.
    *   Copy và dán cấu hình Firebase từ file `src/firebase.ts` trong dự án chính của bạn vào đúng vị trí.
    *   **QUAN TRỌNG**: Bạn cần tạo một "Service Account Key" từ dự án Firebase của mình để chương trình này có quyền truy cập vào cơ sở dữ liệu.
        *   Vào Firebase Console > Project Settings > Service accounts.
        *   Nhấn "Generate new private key". Một file JSON sẽ được tải về.
        *   Đổi tên file này thành `serviceAccountKey.json` và đặt nó vào bên trong thư mục `print-agent`.

4.  **Chạy Trạm In**:
    *   Sau khi đã cấu hình xong, quay lại cửa sổ Terminal/Command Prompt.
    *   Đảm bảo bạn vẫn đang ở trong thư mục `print-agent`.
    *   Chạy lệnh sau:
        ```bash
        node index.js
        ```

Nếu bạn thấy thông báo `[INFO] Kết nối Firebase thành công.` và `[INFO] Đang lắng nghe hàng chờ in tại /printQueue...`, nghĩa là Trạm In đã hoạt động!

Hãy giữ cho cửa sổ này luôn chạy. Giờ đây, mỗi khi có lệnh in mới được gửi từ ứng dụng web, nó sẽ tự động được in ra.

## Tự động khởi động (Nâng cao)

Để chương trình tự chạy mỗi khi máy tính khởi động, bạn có thể dùng các công cụ như `PM2` (cho mọi nền tảng) hoặc tạo một tác vụ trong Task Scheduler (trên Windows).
