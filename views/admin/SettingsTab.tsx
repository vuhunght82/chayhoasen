
import React, { useState } from 'react';
import { Branch, PrinterSettings } from '../../types';
import { useToast, useConfirmation } from '../../App';
import { storage } from '../../firebase';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

interface BranchEditModalProps {
    branch: Branch;
    onClose: () => void;
    onSave: (branchId: string, newName: string, latitude?: number, longitude?: number) => void;
}

const BranchEditModal: React.FC<BranchEditModalProps> = ({ branch, onClose, onSave }) => {
    const [name, setName] = useState(branch.name);
    const [latitude, setLatitude] = useState(branch.latitude?.toString() || '');
    const [longitude, setLongitude] = useState(branch.longitude?.toString() || '');

    const handleSave = () => {
        if (name.trim()) {
            onSave(
                branch.id, 
                name.trim(),
                latitude ? parseFloat(latitude) : undefined,
                longitude ? parseFloat(longitude) : undefined
            );
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-primary-dark border border-accent rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold text-accent mb-4">Sửa Chi Nhánh</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-100 mb-1">Tên chi nhánh</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-sm font-medium text-gray-100 mb-1">Vĩ độ (Lat)</label>
                            <input 
                                type="number" 
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                placeholder="10.77..."
                                className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                            />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-100 mb-1">Kinh độ (Long)</label>
                            <input 
                                type="number" 
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                placeholder="106.70..."
                                className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                            />
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>
                    <button type="button" onClick={handleSave} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Lưu</button>
                </div>
            </div>
        </div>
    );
}

// --- PRINTER CONFIG MODAL ---
const PrinterConfigModal: React.FC<{
    settings: PrinterSettings;
    onClose: () => void;
    onSave: (settings: PrinterSettings) => void;
}> = ({ settings, onClose, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
             <div className="bg-primary-dark border border-accent rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold text-accent mb-4">Cấu hình Máy in</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-100 mb-1">Tên Máy in (Gợi nhớ)</label>
                         <input 
                            type="text" 
                            value={localSettings.printerName || ''}
                            onChange={(e) => setLocalSettings({...localSettings, printerName: e.target.value})}
                            placeholder="Ví dụ: Máy in Bếp, Máy in Quầy..."
                            className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-100 mb-1">Khổ giấy</label>
                         <select 
                            value={localSettings.paperSize}
                            onChange={(e) => setLocalSettings({...localSettings, paperSize: e.target.value as any})}
                            className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                         >
                             <option value="80mm">K80 (80mm - Phổ biến)</option>
                             <option value="58mm">K58 (58mm - Mini)</option>
                             <option value="A4">A4 (Văn phòng)</option>
                             <option value="A5">A5 (Văn phòng nhỏ)</option>
                         </select>
                         <p className="text-xs text-gray-400 mt-1">
                            Lưu ý: Chọn khổ giấy phù hợp để hóa đơn hiển thị đẹp nhất. Khi in, vui lòng chọn đúng máy in trong hộp thoại của trình duyệt.
                         </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>
                    <button type="button" onClick={handleSave} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Lưu Cấu Hình</button>
                </div>
             </div>
        </div>
    )
}


// Helper function to read file as data URL
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface SettingsTabProps {
    branches: Branch[];
    setBranches: (branches: Branch[] | ((prev: Branch[]) => Branch[])) => void;
    printerSettings: PrinterSettings;
    setPrinterSettings: (settings: PrinterSettings | ((prev: PrinterSettings) => PrinterSettings)) => void;
    logoUrl: string;
    setLogoUrl: (url: string | ((prev: string) => string)) => void;
    resetAllData: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ branches, setBranches, printerSettings, setPrinterSettings, logoUrl, setLogoUrl, resetAllData }) => {
    const [newBranchName, setNewBranchName] = useState('');
    const [localSettings, setLocalSettings] = useState<PrinterSettings>(printerSettings);
    const { showToast } = useToast();
    const { confirm } = useConfirmation();
    const [isUploading, setIsUploading] = useState(false);
    const [isPrinterConfigOpen, setPrinterConfigOpen] = useState(false);

    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const [qrBranch, setQrBranch] = useState(branches[0]?.id || '');
    const [qrTable, setQrTable] = useState('1');
    const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState('');
    
    // Dummy data for the bill preview
    const previewOrder = {
        id: 'DEMO789',
        tableNumber: 12,
        timestamp: Date.now(),
        items: {
            'm1_demo': { name: 'Gỏi Cuốn Hoa Sen', quantity: 2, price: 45000 },
            'm4_demo': { name: 'Lẩu Nấm', quantity: 1, price: 250000 },
        },
        total: 340000,
    };


    const handleAddBranch = () => {
        if (newBranchName.trim()) {
            const newBranch: Branch = { 
                id: `cn-${Date.now()}`, 
                name: newBranchName.trim() 
            };
            setBranches(prev => [...prev, newBranch]);
            setNewBranchName('');
            showToast('Đã thêm chi nhánh mới.');
        }
    };
    
    const handleDeleteBranch = (id: string) => {
        confirm({
            title: 'Xác nhận xóa chi nhánh',
            description: 'Bạn có chắc muốn xóa chi nhánh này? Thao tác này không thể hoàn tác.',
            onConfirm: () => {
                setBranches(prev => prev.filter(b => b.id !== id));
                showToast('Đã xóa chi nhánh.');
            }
        });
    };
    
    const handleSaveBranch = (branchId: string, newName: string, latitude?: number, longitude?: number) => {
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, name: newName, latitude, longitude } : b));
        setEditingBranch(null);
        showToast('Đã cập nhật thông tin chi nhánh.');
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({...prev, [name]: value}));
    };
    
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                const dataUrl = await fileToDataUrl(file);
                const imageRef = storageRef(storage, `brand/logo`);
                const snapshot = await uploadString(imageRef, dataUrl, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);
                setLogoUrl(downloadURL);
                showToast('Logo đã được cập nhật.');
            } catch (error) {
                console.error("Error uploading logo:", error);
                showToast('Không thể tải logo lên.', 'error');
            } finally {
                setIsUploading(false);
            }
        }
    };
    
    const handleQrCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                const dataUrl = await fileToDataUrl(file);
                const imageRef = storageRef(storage, `brand/payment-qrcode`);
                const snapshot = await uploadString(imageRef, dataUrl, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);
                setLocalSettings(prev => ({ ...prev, qrCodeUrl: downloadURL }));
                showToast('Đã tải ảnh QR. Nhấn "Lưu" để áp dụng.');
            } catch (error) {
                console.error("Error uploading QR code:", error);
                showToast('Không thể tải ảnh QR.', 'error');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSaveSettings = () => {
        setPrinterSettings(localSettings);
        showToast('Đã lưu cài đặt!');
    };
    
    const handleSavePrinterConfig = (newSettings: PrinterSettings) => {
        setLocalSettings(newSettings);
        setPrinterSettings(newSettings); // Save immediately
        showToast('Đã lưu cấu hình máy in.');
    }

    const generateQrCode = () => {
        if (!qrBranch || !qrTable) {
            showToast('Vui lòng chọn chi nhánh và nhập số bàn.', 'error');
            return;
        }
        const branch = branches.find(b => b.id === qrBranch);
        if (!branch) return;

        const branchName = branch.name;
        const gps = (branch.latitude && branch.longitude) ? `(${branch.latitude},${branch.longitude})` : 'N/A';
        const qrData = `${branchName}-${gps}-${qrTable}`;
        
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
        setGeneratedQrCodeUrl(url);
        showToast('Đã tạo mã QR!');
    };
    
    const handleResetData = () => {
        confirm({
            title: 'Khôi phục Cài đặt Gốc?',
            description: 'Tất cả dữ liệu (thực đơn, đơn hàng, cài đặt,...) sẽ bị XÓA và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?',
            onConfirm: () => {
                resetAllData();
                showToast('Đã khôi phục dữ liệu về trạng thái ban đầu.');
            }
        })
    }

    const handlePrintTest = () => {
        const previewElement = document.getElementById('settings-bill-preview');
        if (previewElement) {
            // Determine width based on paper size settings
            let paperWidth = '100%'; 
            if (printerSettings.paperSize === '80mm') paperWidth = '72mm'; 
            if (printerSettings.paperSize === '58mm') paperWidth = '48mm'; 
            if (printerSettings.paperSize === 'A4') paperWidth = '210mm';
            if (printerSettings.paperSize === 'A5') paperWidth = '148mm';

             // Open a new window
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write('<!DOCTYPE html>');
                printWindow.document.write('<html><head><title>In thử Hóa đơn</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                // Inject custom print styles for margin and width
                printWindow.document.write(`
                    <style>
                        @page { size: auto; margin: 0mm; }
                        body { 
                            margin: 0; 
                            padding: 5mm; 
                            width: ${paperWidth}; 
                            font-family: monospace; 
                            background-color: white;
                            color: black !important;
                        }
                        * { color: black !important; }
                        ::-webkit-scrollbar { display: none; }
                        .no-print { display: none; }
                    </style>
                `);
                printWindow.document.write('</head><body class="bg-white">');
                printWindow.document.write(previewElement.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();

                // Wait for content to load then print
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 1500);
            } else {
                 alert('Vui lòng cho phép mở cửa sổ bật lên (pop-up) để in hóa đơn.');
            }
        }
    };

    // Determine preview width class based on paper size
    const getPreviewWidthClass = () => {
        switch (localSettings.paperSize) {
            case '58mm': return 'w-[58mm]';
            case '80mm': return 'w-[80mm]';
            case 'A5': return 'w-[148mm]';
            case 'A4': return 'w-[210mm]';
            default: return 'w-full';
        }
    };


    return (
        <div>
            {editingBranch && <BranchEditModal branch={editingBranch} onClose={() => setEditingBranch(null)} onSave={handleSaveBranch} />}
            {isPrinterConfigOpen && <PrinterConfigModal settings={localSettings} onClose={() => setPrinterConfigOpen(false)} onSave={handleSavePrinterConfig} />}
            
            <h2 className="text-2xl font-bold text-accent mb-6">Cài Đặt</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Branch Management */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4 border-b border-accent/30 pb-2">Quản Lý Chi Nhánh</h3>
                    <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                        {branches.map(branch => (
                            <div key={branch.id} className="flex justify-between items-center bg-primary p-3 rounded-md">
                                <div>
                                    <span className="text-white block">{branch.name}</span>
                                    {(branch.latitude && branch.longitude) && 
                                        <span className="text-xs text-gray-300">GPS: {branch.latitude}, {branch.longitude}</span>
                                    }
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setEditingBranch(branch)} className="text-blue-400 hover:text-blue-300 text-sm font-semibold">Sửa</button>
                                    <button onClick={() => handleDeleteBranch(branch.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold">Xóa</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="Tên chi nhánh mới" 
                            className="flex-grow bg-primary border border-accent/50 rounded-md p-2 text-white"
                        />
                        <button onClick={handleAddBranch} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg transition-colors">
                            Thêm
                        </button>
                    </div>
                </div>

                {/* Brand Settings */}
                 <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4 border-b border-accent/30 pb-2">Cài đặt Thương hiệu</h3>
                    <div className="flex items-center gap-6">
                        <img src={logoUrl} alt="Current Logo" className="w-24 h-24 rounded-full object-cover border-2 border-accent/50"/>
                        <div>
                             <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-100 mb-2">Thay đổi logo</label>
                             <input 
                                id="logo-upload"
                                type="file" 
                                accept="image/*" 
                                onChange={handleLogoChange} 
                                className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark cursor-pointer"/>
                        </div>
                    </div>
                </div>

                {/* QR Code Generation */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4 border-b border-accent/30 pb-2">Tạo QR Code Bàn</h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-sm text-gray-200 block mb-1">Chi nhánh</label>
                            <select value={qrBranch} onChange={e => setQrBranch(e.target.value)} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white">
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                         <div className="flex-1">
                            <label className="text-sm text-gray-200 block mb-1">Số bàn</label>
                            <input type="number" value={qrTable} onChange={e => setQrTable(e.target.value)} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white" />
                        </div>
                        <button onClick={generateQrCode} className="bg-primary-light hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Tạo QR
                        </button>
                    </div>
                     {generatedQrCodeUrl && <div className="mt-4 p-4 bg-white rounded-lg flex justify-center">
                        <img src={generatedQrCodeUrl} alt="QR Code" />
                    </div>}
                </div>
                
                {/* Printer Settings */}
                <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                        <div className="flex justify-between items-center mb-4 border-b border-accent/30 pb-2">
                            <h3 className="text-lg font-semibold text-accent">Cài Đặt Thanh toán & In ấn</h3>
                            <button onClick={() => setPrinterConfigOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
                                ⚙️ Cấu hình Máy in
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-primary/30 p-2 rounded border border-accent/20 text-sm text-gray-300 mb-2">
                                Đang sử dụng cấu hình: <span className="text-accent font-bold">{localSettings.paperSize || '80mm'}</span> 
                                {localSettings.printerName ? ` (${localSettings.printerName})` : ''}
                            </div>
                            <div>
                                <label className="text-sm text-gray-200 block mb-1">Thông tin Header Hóa đơn</label>
                                <textarea name="header" rows={4} value={localSettings.header} onChange={handleSettingsChange} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white font-mono text-sm"></textarea>
                            </div>
                            <div>
                                <label className="text-sm text-gray-200 block mb-1">Thông tin Footer Hóa đơn</label>
                                <textarea name="footer" rows={3} value={localSettings.footer} onChange={handleSettingsChange} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white font-mono text-sm"></textarea>
                            </div>
                             <div>
                                <label className="text-sm text-gray-200 block mb-1">Đường dẫn ảnh QR Ngân hàng (URL)</label>
                                <input
                                    type="text"
                                    name="qrCodeUrl"
                                    value={localSettings.qrCodeUrl}
                                    onChange={handleSettingsChange}
                                    className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white text-sm"
                                    placeholder="https://example.com/qr-code.png"
                                />
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-white p-1 rounded-md flex items-center justify-center overflow-hidden">
                                     {localSettings.qrCodeUrl ? (
                                        <img src={localSettings.qrCodeUrl} alt="Bank QR Code" className="w-full h-full object-contain"/>
                                     ) : (
                                         <span className="text-gray-400 text-xs text-center">Chưa có QR</span>
                                     )}
                                </div>
                                <div>
                                    <label htmlFor="qr-upload" className="block text-sm font-medium text-gray-100 mb-2">Hoặc tải lên ảnh từ máy</label>
                                    <input 
                                        id="qr-upload"
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleQrCodeChange} 
                                        className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark cursor-pointer"/>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSaveSettings} disabled={isUploading} className="mt-6 bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-wait">
                            {isUploading ? 'Đang tải...' : 'Lưu Cài Đặt'}
                        </button>
                    </div>

                    {/* Bill Preview */}
                    <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                         <div className="flex justify-between items-center mb-4 border-b border-accent/30 pb-2">
                            <h3 className="text-lg font-semibold text-accent">Xem trước Hóa đơn</h3>
                            <button onClick={handlePrintTest} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded-lg text-sm no-print">
                                In thử
                            </button>
                         </div>
                         <div className="overflow-auto bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-center">
                             <div id="settings-bill-preview" className={`bg-white text-black rounded shadow-inner p-2 ${getPreviewWidthClass()}`}>
                                    <div className="text-center font-mono text-xs">
                                        <pre className="whitespace-pre-wrap text-black font-sans text-sm font-semibold mb-2">{localSettings.header}</pre>
                                        <h2 className="text-lg font-bold my-2 text-black uppercase border-b-2 border-black pb-1 inline-block">HÓA ĐƠN THANH TOÁN</h2>
                                        <div className="text-left text-black mt-2 mb-2">
                                            <p>Số HD: #{previewOrder.id}</p>
                                            <p>Bàn: {previewOrder.tableNumber}</p>
                                            <p>Ngày: {new Date(previewOrder.timestamp).toLocaleString('vi-VN')}</p>
                                        </div>
                                        <hr className="my-2 border-dashed border-black" />
                                        <table className="w-full text-left text-black">
                                            <thead>
                                                <tr>
                                                    <th className="font-semibold">Tên món</th>
                                                    <th className="font-semibold text-center">SL</th>
                                                    <th className="font-semibold text-right">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(previewOrder.items).map(([itemId, itemData]) => (
                                                    <tr key={itemId}>
                                                        <td>{itemData.name}</td>
                                                        <td className="text-center">{itemData.quantity}</td>
                                                        <td className="text-right">{(itemData.price * itemData.quantity).toLocaleString('vi-VN')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <hr className="my-2 border-dashed border-black" />
                                        <div className="text-right font-bold text-sm text-black">
                                            <p>TỔNG CỘNG: {previewOrder.total.toLocaleString('vi-VN')}đ</p>
                                        </div>
                                        <hr className="my-2 border-dashed border-black" />
                                        <pre className="whitespace-pre-wrap text-black font-sans mt-4">{localSettings.footer}</pre>
                                        {localSettings.qrCodeUrl && <img src={localSettings.qrCodeUrl} alt="Bank QR" className="mx-auto mt-4 w-28 h-28 object-contain border border-black"/>}
                                    </div>
                             </div>
                         </div>
                    </div>
                </div>


                 {/* Danger Zone */}
                <div className="md:col-span-2 bg-red-900/30 p-6 rounded-lg border border-red-500/50">
                     <h3 className="text-lg font-semibold text-red-400 mb-4 border-b border-red-500/30 pb-2">Khu vực nguy hiểm</h3>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-white">Khôi phục Cài đặt Gốc</p>
                            <p className="text-sm text-red-300">Thao tác này sẽ xóa toàn bộ dữ liệu và không thể hoàn tác.</p>
                        </div>
                        <button onClick={handleResetData} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Khôi phục
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsTab;
