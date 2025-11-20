
import React, { useState } from 'react';
import { Branch, PrinterSettings, KitchenSettings, OrderItem } from '../../types';
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
    kitchenSettings: KitchenSettings;
    setKitchenSettings: (settings: KitchenSettings | ((prev: KitchenSettings) => KitchenSettings)) => void;
    logoUrl: string;
    setLogoUrl: (url: string | ((prev: string) => string)) => void;
    resetAllData: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ branches, setBranches, printerSettings, setPrinterSettings, kitchenSettings, setKitchenSettings, logoUrl, setLogoUrl, resetAllData }) => {
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
    
    // Corrected dummy data for the bill preview
    const previewOrder = {
        id: 'DEMO789',
        tableNumber: 12,
        timestamp: Date.now(),
        items: [
            { menuItemId: 'm1_demo', name: 'Gỏi Cuốn Hoa Sen', quantity: 2, price: 45000, note: 'Không cay' },
            { menuItemId: 'm4_demo', name: 'Lẩu Nấm', quantity: 1, price: 250000 },
        ] as OrderItem[],
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

     const handleSoundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                showToast('Tệp âm thanh quá lớn (tối đa 2MB).', 'error');
                return;
            }
            setIsUploading(true);
            try {
                const dataUrl = await fileToDataUrl(file);
                const soundRef = storageRef(storage, `kitchen/notification_sound`);
                const snapshot = await uploadString(soundRef, dataUrl, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);
                setKitchenSettings(prev => ({ ...prev, notificationSoundUrl: downloadURL }));
                showToast('Đã cập nhật âm thanh thông báo.');
            } catch (error) {
                console.error("Error uploading sound:", error);
                showToast('Không thể tải tệp âm thanh.', 'error');
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
        const currentUrl = window.location.origin + window.location.pathname;
        const qrData = `${currentUrl}?branchId=${qrBranch}&table=${qrTable}`;
        
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
        setGeneratedQrCodeUrl(url);
        showToast('Đã tạo mã QR thành công!');
    };

    const handleResetData = () => {
        confirm({
            title: 'Xác nhận Khôi phục',
            description: 'Bạn có chắc muốn xóa TOÀN BỘ dữ liệu và quay về cài đặt gốc? Thao tác này không thể hoàn tác.',
            onConfirm: () => {
                resetAllData();
                showToast('Đã khôi phục dữ liệu gốc.');
            }
        });
    };

    const handlePrintTest = () => {
        const printContent = document.getElementById('settings-bill-preview');
        if (printContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Test</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('<style>body { background-color: white; color: black; font-family: monospace; } * { color: black !important; } </style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContent.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold text-accent mb-6">Cài Đặt Hệ Thống</h2>

            {/* Modals */}
            {editingBranch && <BranchEditModal branch={editingBranch} onClose={() => setEditingBranch(null)} onSave={handleSaveBranch} />}
            {isPrinterConfigOpen && <PrinterConfigModal settings={printerSettings} onClose={() => setPrinterConfigOpen(false)} onSave={handleSavePrinterConfig} />}

            <div className="space-y-8">
                {/* Branch Management */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Quản lý Chi nhánh</h3>
                    <div className="space-y-2 mb-4">
                        {branches.map(branch => (
                            <div key={branch.id} className="flex justify-between items-center bg-primary p-2 rounded">
                                <span>{branch.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingBranch(branch)} className="text-sm text-accent hover:underline">Sửa</button>
                                    <button onClick={() => handleDeleteBranch(branch.id)} className="text-sm text-red-500 hover:underline">Xóa</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={newBranchName} onChange={e => setNewBranchName(e.target.value)} type="text" placeholder="Tên chi nhánh mới" className="flex-grow bg-primary p-2 rounded border border-accent/50 text-white"/>
                        <button onClick={handleAddBranch} className="bg-primary-light hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Thêm</button>
                    </div>
                </div>

                {/* Brand Settings */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Cài đặt Thương hiệu</h3>
                    <div className="flex items-center gap-4">
                        <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-full object-cover border-2 border-accent"/>
                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Thay đổi Logo</label>
                            <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark"/>
                        </div>
                    </div>
                </div>

                {/* Table QR Code Generator */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Tạo QR Code Bàn</h3>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block mb-1">Chi nhánh</label>
                            <select
                                value={qrBranch}
                                onChange={e => setQrBranch(e.target.value)}
                                className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white"
                            >
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[100px]">
                            <label className="text-sm text-gray-200 block mb-1">Số bàn</label>
                            <input
                                type="number"
                                value={qrTable}
                                onChange={e => setQrTable(e.target.value)}
                                className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white"
                            />
                        </div>
                        <button onClick={generateQrCode} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Tạo QR</button>
                    </div>
                    {generatedQrCodeUrl && (
                        <div className="mt-4 text-center">
                            <img src={generatedQrCodeUrl} alt="QR Code bàn" className="mx-auto border-4 border-accent p-1" />
                            <p className="text-sm text-gray-200 mt-2">In mã này và dán lên bàn</p>
                        </div>
                    )}
                </div>

                {/* Printer & Bill Settings */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-accent">Cài đặt Hóa đơn & In ấn</h3>
                        <button onClick={() => setPrinterConfigOpen(true)} className="text-sm bg-primary-light hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg">Cấu hình máy in</button>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Tiêu đề hóa đơn (Header)</label>
                            <textarea name="header" value={localSettings.header} onChange={handleSettingsChange} rows={3} className="w-full bg-primary p-2 rounded border border-accent/50 text-white font-mono text-sm"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Chân hóa đơn (Footer)</label>
                            <textarea name="footer" value={localSettings.footer} onChange={handleSettingsChange} rows={2} className="w-full bg-primary p-2 rounded border border-accent/50 text-white font-mono text-sm"></textarea>
                        </div>
                         <div className="flex items-center gap-4">
                             <img src={localSettings.qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded border-2 border-accent bg-white p-1"/>
                             <div>
                                <label className="block text-sm font-medium text-gray-100 mb-1">Thay đổi mã QR thanh toán</label>
                                <input type="file" accept="image/*" onChange={handleQrCodeChange} className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark"/>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4 gap-3">
                        <button onClick={handlePrintTest} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg">In thử</button>
                        <button onClick={handleSaveSettings} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Lưu cài đặt hóa đơn</button>
                    </div>
                    {/* Hidden preview for printing test */}
                    <div id="settings-bill-preview" className="hidden">
                         <div className="text-center font-mono text-xs leading-relaxed">
                            <pre className="whitespace-pre-wrap font-sans text-sm font-semibold mb-2">{localSettings.header}</pre>
                            <h2 className="text-lg font-bold my-2 uppercase border-b-2 border-black pb-1 inline-block">HÓA ĐƠN MẪU</h2>
                            <div className="text-left mt-2 mb-2 text-sm">
                                <p>Số HD: <span className="font-bold">#DEMO123</span></p>
                                <p>Bàn: <span className="font-bold">{previewOrder.tableNumber}</span></p>
                                <p>Ngày: {new Date(previewOrder.timestamp).toLocaleString('vi-VN')}</p>
                            </div>
                            <hr className="my-2 border-dashed border-black" />
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-black border-dashed">
                                        <th className="font-bold py-1">Món</th>
                                        <th className="font-bold text-center py-1 w-8">SL</th>
                                        <th className="font-bold text-right py-1">Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewOrder.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-1 pr-1 align-top">
                                                <div className="font-semibold">{item.name}</div>
                                                {item.note && <div className="text-[10px] italic text-gray-600">- {item.note}</div>}
                                            </td>
                                            <td className="text-center py-1 align-top">{item.quantity}</td>
                                            <td className="text-right py-1 align-top font-medium">{((item.price || 0) * item.quantity).toLocaleString('vi-VN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <hr className="my-2 border-t-2 border-black" />
                            <div className="text-right font-bold text-lg">
                                <p>TỔNG: {(previewOrder.total || 0).toLocaleString('vi-VN')}đ</p>
                            </div>
                            <hr className="my-2 border-dashed border-black" />
                            <pre className="whitespace-pre-wrap font-sans mt-4">{localSettings.footer}</pre>
                            {localSettings.qrCodeUrl && (
                                <div className="mt-4 flex flex-col items-center">
                                    <img src={localSettings.qrCodeUrl} alt="Bank QR" className="w-32 h-32 object-contain border border-black"/>
                                    <p className="text-[10px] mt-1">Quét mã để thanh toán</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Kitchen Settings */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Cài đặt Bếp</h3>
                     <div>
                        <label className="block text-sm font-medium text-gray-100 mb-1">Âm thanh thông báo đơn mới (tối đa 2MB)</label>
                        <input type="file" accept="audio/*" onChange={handleSoundChange} className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark"/>
                        <audio key={kitchenSettings.notificationSoundUrl} controls className="mt-2 w-full">
                            <source src={kitchenSettings.notificationSoundUrl} type="audio/mpeg" />
                            Trình duyệt của bạn không hỗ trợ audio.
                        </audio>
                    </div>
                    
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-100 mb-1">Số lần lặp lại âm thanh</label>
                         <input 
                            type="number" 
                            min="1"
                            max="10"
                            value={kitchenSettings.notificationRepeatCount || 1}
                            onChange={(e) => setKitchenSettings(prev => ({...prev, notificationRepeatCount: parseInt(e.target.value) || 1}))}
                            className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">Số lần âm thanh sẽ phát khi có đơn hàng mới (Mặc định: 3)</p>
                    </div>
                </div>

                 {/* Danger Zone */}
                <div className="bg-red-900/50 p-6 rounded-lg border border-red-500">
                    <h3 className="text-lg font-semibold text-red-300 mb-2">Vùng nguy hiểm</h3>
                    <p className="text-sm text-red-200 mb-4">Hành động sau đây không thể hoàn tác. Vui lòng chắc chắn trước khi thực hiện.</p>
                    <button onClick={handleResetData} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Khôi phục Dữ liệu Gốc</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsTab;