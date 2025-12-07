// ================================================================
//            CHAY HOA SEN - PRINT AGENT (TRẠM IN)
// ================================================================
// Chạy chương trình này trên một máy tính có kết nối mạng LAN
// với máy in nhiệt để tự động in hóa đơn.

const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

// --- CẤU HÌNH ---

// 1. Dán Service Account Key của bạn vào đây
//    Tải về từ: Firebase Console > Project Settings > Service Accounts > Generate new private key
//    VÀ ĐẶT FILE `serviceAccountKey.json` vào cùng thư mục với file này.
const serviceAccount = require("./serviceAccountKey.json");

// 2. Dán Database URL của bạn vào đây
//    Tìm thấy trong Firebase Console > Realtime Database
const DATABASE_URL = "https://chayhoasen-8c00e-default-rtdb.firebaseio.com";


// --- KHỞI TẠO ---

try {
    initializeApp({
        credential: cert(serviceAccount),
        databaseURL: DATABASE_URL,
    });
    console.log("[INFO] Kết nối Firebase thành công.");
} catch (error) {
    console.error("[ERROR] Không thể kết nối Firebase. Vui lòng kiểm tra lại file serviceAccountKey.json và DATABASE_URL.");
    console.error(error);
    process.exit(1);
}

const db = getDatabase();
const printQueueRef = db.ref("printQueue");

let isProcessing = false;

// --- HÀM IN ---

async function executePrintJob(jobSnapshot) {
    const jobKey = jobSnapshot.key;
    const jobData = jobSnapshot.val();
    
    if (!jobData || !jobData.stationId || !jobData.order) {
        console.error(`[WARN] Dữ liệu lệnh in không hợp lệ, bỏ qua: ${jobKey}`);
        await printQueueRef.child(jobKey).remove();
        return;
    }
    
    console.log(`\n[INFO] Nhận được lệnh in mới: ${jobKey} cho trạm ${jobData.stationId}`);

    try {
        const stationSnapshot = await db.ref(`printStations/${jobData.stationId}`).once('value');
        const station = stationSnapshot.val();

        if (!station) {
            throw new Error(`Không tìm thấy cấu hình cho trạm in ID: ${jobData.stationId}`);
        }

        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: `tcp://${station.ipAddress}:${station.port}`,
            characterSet: 'UTF-8',
            removeSpecialCharacters: false,
            lineCharacter: "=",
            timeout: 5000,
        });

        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
            throw new Error(`Không thể kết nối đến máy in "${station.name}" tại ${station.ipAddress}:${station.port}`);
        }
        
        console.log(`[INFO] Đang in đến "${station.name}"...`);

        const { order, printerSettings, branchName } = jobData;
        const timestamp = new Date(order.timestamp).toLocaleString('vi-VN');

        // === Bắt đầu định dạng hóa đơn ===
        printer.alignCenter();
        printer.println(printerSettings.header.replace('[Địa chỉ chi nhánh]', branchName));
        printer.println("--------------------------------");
        printer.bold(true);
        printer.println("HOA DON THANH TOAN");
        printer.bold(false);

        printer.alignLeft();
        printer.println(`So HD: #${order.id.slice(-6).toUpperCase()}`);
        printer.println(`Ban: ${order.tableNumber}`);
        printer.println(`Ngay: ${timestamp}`);
        printer.println("--------------------------------");

        printer.tableCustom([
            { text: "Mon An", align: "LEFT", width: 0.6 },
            { text: "SL", align: "CENTER", width: 0.1 },
            { text: "T.Tien", align: "RIGHT", width: 0.3 },
        ]);

        order.items.forEach(item => {
            printer.tableCustom([
                { text: `${item.name}`, align: "LEFT", width: 0.6 },
                { text: `${item.quantity}`, align: "CENTER", width: 0.1 },
                { text: `${(item.price * item.quantity).toLocaleString('vi-VN')}`, align: "RIGHT", width: 0.3 },
            ]);
            if (item.selectedToppings && item.selectedToppings.length > 0) {
                 printer.println(`  + ${item.selectedToppings.map(t => t.name).join(', ')}`);
            }
            if (item.note) {
                 printer.println(`  * Ghi chu: ${item.note}`);
            }
        });
        
        printer.println("--------------------------------");
        
        printer.alignRight();
        printer.bold(true);
        printer.println(`TONG CONG: ${order.total.toLocaleString('vi-VN')}d`);
        printer.bold(false);
        printer.println(`Thanh toan: ${order.paymentMethod}`);
        
        if (order.note) {
            printer.alignLeft();
            printer.println("--------------------------------");
            printer.bold(true);
            printer.println(`GHI CHU DON: ${order.note}`);
            printer.bold(false);
        }

        printer.alignCenter();
        printer.println("\n" + printerSettings.footer);
        
        if (printerSettings.qrCodeUrl) {
            try {
                // Giả định QR code là một URL hợp lệ
                await printer.printQR(printerSettings.qrCodeUrl, {
                    cellSize: 4,
                    correction: 'M'
                });
                 printer.println("Quet ma de thanh toan");
            } catch (qrError) {
                 console.warn("[WARN] Không thể in mã QR. URL có thể không hợp lệ hoặc máy in không hỗ trợ.");
            }
        }
        
        printer.cut();
        // === Kết thúc định dạng hóa đơn ===

        await printer.execute();
        console.log(`[SUCCESS] Đã in thành công lệnh: ${jobKey}`);

    } catch (error) {
        console.error(`[ERROR] Lỗi khi xử lý lệnh in ${jobKey}:`, error.message);
        // Không xóa lệnh in lỗi để có thể kiểm tra lại
        return; // Dừng lại ở đây, không xóa job
    }
    
    // Xóa lệnh in khỏi hàng chờ sau khi đã xử lý thành công
    await printQueueRef.child(jobKey).remove();
}

// --- HÀM LẮNG NGHE ---

function listenForPrintJobs() {
    console.log("[INFO] Đang lắng nghe hàng chờ in tại /printQueue...");
    printQueueRef.on("child_added", async (snapshot) => {
        // Đảm bảo không xử lý nhiều lệnh cùng lúc để tránh xung đột
        if (isProcessing) return; 

        isProcessing = true;
        try {
            await executePrintJob(snapshot);
        } catch (e) {
            console.error("[FATAL] Lỗi không xác định trong vòng lặp xử lý:", e);
        } finally {
            isProcessing = false;
        }
    });
}

// --- BẮT ĐẦU CHƯƠNG TRÌNH ---
listenForPrintJobs();
