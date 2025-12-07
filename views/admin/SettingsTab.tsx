
import React, { useState, useEffect, useMemo } from 'react';
import { Branch, PrinterSettings, KitchenSettings, OrderItem, SavedSound } from '../../types';
import { useToast, useConfirmation } from '../../App';
import { storage } from '../../firebase';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

interface BranchEditModalProps {
    branch: Branch;
    onClose: () => void;
    onSave: (branchId: string, newName: string, latitude?: number, longitude?: number, allowedDistance?: number) => void;
}

const BranchEditModal: React.FC<BranchEditModalProps> = ({ branch, onClose, onSave }) => {
    const [name, setName] = useState(branch.name);
    const [latitude, setLatitude] = useState(branch.latitude?.toString() || '');
    const [longitude, setLongitude] = useState(branch.longitude?.toString() || '');
    const [distance, setDistance] = useState(branch.allowedDistance?.toString() || '100');

    const handleSave = () => {
        if (name.trim()) {
            onSave(
                branch.id, 
                name.trim(),
                latitude ? parseFloat(latitude) : undefined,
                longitude ? parseFloat(longitude) : undefined,
                distance ? parseInt(distance, 10) : 100
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
                    <div>
                        <label className="block text-sm font-medium text-gray-100 mb-1">Phạm vi quét QR hợp lệ (mét)</label>
                        <input 
                            type="number" 
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            placeholder="Ví dụ: 100"
                            className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">Khoảng cách tối đa cho phép từ vị trí khách hàng đến chi nhánh để xác nhận đơn hàng.</p>
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
    kitchenSettings: KitchenSettings;
    setKitchenSettings: (settings: KitchenSettings | ((prev: KitchenSettings) => KitchenSettings)) => void;
    logoUrl: string;
    setLogoUrl: (url: string | ((prev: string) => string)) => void;
    themeColor: string;
    setThemeColor: (color: string | ((prev: string) => string)) => void;
    resetAllData: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ branches, setBranches, kitchenSettings, setKitchenSettings, logoUrl, setLogoUrl, themeColor, setThemeColor, resetAllData }) => {
    const [newBranchName, setNewBranchName] = useState('');
    const { showToast } = useToast();
    const { confirm } = useConfirmation();
    const [isUploading, setIsUploading] = useState(false);
    
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const [qrBranch, setQrBranch] = useState(branches[0]?.id || '');
    const [qrTable, setQrTable] = useState('1');
    const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState('');
    
    const [newSoundName, setNewSoundName] = useState('');
    const [newSoundFile, setNewSoundFile] = useState<File | null>(null);

    const [selectedBranchIdForSettings, setSelectedBranchIdForSettings] = useState<string>(branches[0]?.id || '');
    const [localPrinterSettings, setLocalPrinterSettings] = useState<PrinterSettings | undefined>(undefined);

    useEffect(() => {
        const branch = branches.find(b => b.id === selectedBranchIdForSettings);
        setLocalPrinterSettings(branch?.printerSettings);
    }, [selectedBranchIdForSettings, branches]);
    
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
    
    const handleSaveBranch = (branchId: string, newName: string, latitude?: number, longitude?: number, allowedDistance?: number) => {
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, name: newName, latitude, longitude, allowedDistance } : b));
        setEditingBranch(null);
        showToast('Đã cập nhật thông tin chi nhánh.');
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalPrinterSettings(prev => (prev ? {...prev, [name]: value} : undefined));
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
                const imageRef = storageRef(storage, `brand/payment-qrcode-${selectedBranchIdForSettings}`);
                const snapshot = await uploadString(imageRef, dataUrl, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);
                setLocalPrinterSettings(prev => (prev ? { ...prev, qrCodeUrl: downloadURL } : undefined));
                showToast('Đã tải ảnh QR. Nhấn "Lưu" để áp dụng.');
            } catch (error) {
                console.error("Error uploading QR code:", error);
                showToast('Không thể tải ảnh QR.', 'error');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleAddSound = async () => {
        if (!newSoundName.trim()) {
            showToast('Vui lòng nhập tên cho âm thanh.', 'error');
            return;
        }
        if (!newSoundFile) {
            showToast('Vui lòng chọn tệp âm thanh.', 'error');
            return;
        }
        if (newSoundFile.size > 2 * 1024 * 1024) { // 2MB limit
            showToast('Tệp âm thanh quá lớn (tối đa 2MB).', 'error');
            return;
        }

        setIsUploading(true);
        try {
            const dataUrl = await fileToDataUrl(newSoundFile);
            const soundRef = storageRef(storage, `kitchen/sounds/${Date.now()}_${newSoundFile.name}`);
            const snapshot = await uploadString(soundRef, dataUrl, 'data_url');
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            const newSound: SavedSound = {
                id: `sound-${Date.now()}`,
                name: newSoundName.trim(),
                url: downloadURL
            };
            
            const currentSounds = kitchenSettings.savedSounds || [];
            setKitchenSettings(prev => ({
                ...prev,
                savedSounds: [...currentSounds, newSound]
            }));
            
            setNewSoundName('');
            setNewSoundFile(null);
            // Reset file input visually
            const fileInput = document.getElementById('sound-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            showToast('Đã thêm âm thanh vào danh sách.');
        } catch (error) {
            console.error("Error uploading sound:", error);
            showToast('Không thể tải tệp âm thanh.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteSound = (soundId: string) => {
        confirm({
            title: 'Xóa âm thanh',
            description: 'Bạn có chắc muốn xóa âm thanh này khỏi danh sách?',
            onConfirm: () => {
                 const currentSounds = kitchenSettings.savedSounds || [];
                 const soundToDelete = currentSounds.find(s => s.id === soundId);
                 
                 // If deleting currently active sound, revert to default if possible
                 let newActiveUrl = kitchenSettings.notificationSoundUrl;
                 if (soundToDelete?.url === newActiveUrl) {
                     const remaining = currentSounds.filter(s => s.id !== soundId);
                     if (remaining.length > 0) newActiveUrl = remaining[0].url;
                     else newActiveUrl = ''; 
                 }

                 setKitchenSettings(prev => ({
                     ...prev,
                     notificationSoundUrl: newActiveUrl,
                     savedSounds: prev.savedSounds?.filter(s => s.id !== soundId)
                 }));
                 showToast('Đã xóa âm thanh.');
            }
        })
    }

    const handleSaveSettings = () => {
        if (!localPrinterSettings) return;
        setBranches(prev => prev.map(b => b.id === selectedBranchIdForSettings ? { ...b, printerSettings: localPrinterSettings } : b));
        showToast('Đã lưu cài đặt!');
    };
    

    const generateQrCode = () => {
        if (!qrBranch || !qrTable) {
            showToast('Vui lòng chọn chi nhánh và nhập số bàn.', 'error');
            return;
        }
        const branch = branches.find(b => b.id === qrBranch);
        if (!branch || !branch.latitude || !branch.longitude) {
            showToast('Chi nhánh được chọn chưa có tọa độ. Vui lòng cập nhật trong phần Sửa Chi Nhánh.', 'error');
            return;
        }

        const qrData = `${branch.latitude},${branch.longitude}-${qrTable}`;
        
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
    
    const PRESET_COLORS = [
        '#15803d', // Original Green
        '#1e40af', // Blue
        '#7e22ce', // Purple
        '#be123c', // Red
        '#c2410c', // Orange
        '#0f172a', // Slate/Black
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-accent mb-6">Cài Đặt Hệ Thống</h2>

            {/* Modals */}
            {editingBranch && <BranchEditModal branch={editingBranch} onClose={() => setEditingBranch(null)} onSave={handleSaveBranch} />}
            
            <div className="space-y-8">
                {/* Theme & Brand Settings */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Cài đặt Thương hiệu & Giao diện</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4">
                            <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-full object-cover border-2 border-accent"/>
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-gray-100 mb-1">Thay đổi Logo</label>
                                <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark"/>
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-100 mb-2">Màu chủ đạo (Nền, Tab, Nút bấm)</label>
                             <div className="flex flex-wrap gap-3 mb-3">
                                {PRESET_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setThemeColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 ${themeColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                             </div>
                             <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={themeColor} 
                                    onChange={(e) => setThemeColor(e.target.value)}
                                    className="h-10 w-full rounded cursor-pointer border-0 p-0"
                                />
                                <span className="text-sm text-gray-300 font-mono bg-primary px-2 py-1 rounded">{themeColor}</span>
                             </div>
                             <p className="text-xs text-gray-400 mt-2">
                                Màu được chọn sẽ tự động tạo ra các biến thể đậm/nhạt cho toàn bộ ứng dụng.
                             </p>
                        </div>
                    </div>
                </div>

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
                     <h3 className="text-lg font-semibold text-accent mb-4">Cài đặt Hóa đơn & In ấn</h3>
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-100 mb-1">Chọn chi nhánh để cấu hình:</label>
                        <select
                            value={selectedBranchIdForSettings}
                            onChange={e => setSelectedBranchIdForSettings(e.target.value)}
                            className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white"
                        >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                     </div>
                     
                    {localPrinterSettings && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-100 mb-1">Khổ giấy</label>
                                <select 
                                    name="paperSize"
                                    value={localPrinterSettings.paperSize}
                                    onChange={handleSettingsChange}
                                    className="w-full bg-primary p-2 rounded border border-accent/50 text-white"
                                >
                                    <option value="80mm">K80 (80mm - Phổ biến)</option>
                                    <option value="58mm">K58 (58mm - Mini)</option>
                                    <option value="A4">A4 (Văn phòng)</option>
                                    <option value="A5">A5 (Văn phòng nhỏ)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-100 mb-1">Tiêu đề hóa đơn (Header)</label>
                                <textarea name="header" value={localPrinterSettings.header} onChange={handleSettingsChange} rows={3} className="w-full bg-primary p-2 rounded border border-accent/50 text-white font-mono text-sm"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-100 mb-1">Chân hóa đơn (Footer)</label>
                                <textarea name="footer" value={localPrinterSettings.footer} onChange={handleSettingsChange} rows={2} className="w-full bg-primary p-2 rounded border border-accent/50 text-white font-mono text-sm"></textarea>
                            </div>
                             <div className="flex items-center gap-4">
                                 <img src={localPrinterSettings.qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded border-2 border-accent bg-white p-1"/>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-100 mb-1">Thay đổi mã QR thanh toán</label>
                                    <input type="file" accept="image/*" onChange={handleQrCodeChange} className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark"/>
                                </div>
                            </div>
                            <div className="flex justify-end mt-4 gap-3">
                                <button onClick={handlePrintTest} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg">In thử</button>
                                <button onClick={handleSaveSettings} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Lưu cài đặt cho chi nhánh này</button>
                            </div>
                             {/* Hidden preview for printing test */}
                            <div id="settings-bill-preview" className="hidden">
                                <div className="text-center font-mono text-xs leading-relaxed">
                                    <pre className="whitespace-pre-wrap font-sans text-sm font-semibold mb-2">{localPrinterSettings.header}</pre>
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
                                    <pre className="whitespace-pre-wrap font-sans mt-4">{localPrinterSettings.footer}</pre>
                                    {localPrinterSettings.qrCodeUrl && (
                                        <div className="mt-4 flex flex-col items-center">
                                            <img src={localPrinterSettings.qrCodeUrl} alt="Bank QR" className="w-32 h-32 object-contain border border-black"/>
                                            <p className="text-[10px] mt-1">Quét mã để thanh toán</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Kitchen Settings */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Cài đặt Bếp</h3>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-100 mb-3">Chọn âm thanh thông báo</label>
                        <div className="space-y-3 bg-primary p-4 rounded-lg border border-accent/30 max-h-60 overflow-y-auto">
                            {(kitchenSettings.savedSounds || []).map((sound) => (
                                <div key={sound.id} className="flex items-center justify-between hover:bg-primary-dark/30 p-2 rounded">
                                    <div className="flex items-center cursor-pointer flex-grow" onClick={() => setKitchenSettings(prev => ({ ...prev, notificationSoundUrl: sound.url }))}>
                                        <input
                                            type="radio"
                                            name="presetSound"
                                            id={`sound-${sound.id}`}
                                            checked={kitchenSettings.notificationSoundUrl === sound.url}
                                            onChange={() => setKitchenSettings(prev => ({ ...prev, notificationSoundUrl: sound.url }))}
                                            className="h-4 w-4 text-accent focus:ring-accent border-gray-300 cursor-pointer"
                                        />
                                        <label htmlFor={`sound-${sound.id}`} className="ml-3 text-sm text-white cursor-pointer font-medium">{sound.name}</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                         <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const audio = new Audio(sound.url);
                                                audio.play().catch(err => console.error("Play error", err));
                                            }}
                                            className="text-accent hover:text-white text-xs border border-accent hover:bg-accent/20 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                        >
                                            <span>▶</span> Nghe thử
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSound(sound.id); }}
                                            className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-900/30"
                                            title="Xóa"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6 bg-primary p-4 rounded-lg border border-accent/30">
                         <label className="block text-sm font-bold text-accent mb-3">Thêm âm thanh mới vào danh sách</label>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-300 mb-1">Tên hiển thị</label>
                                <input 
                                    type="text"
                                    value={newSoundName}
                                    onChange={e => setNewSoundName(e.target.value)}
                                    placeholder="Ví dụ: Chuông báo cháy..."
                                    className="w-full bg-primary-dark text-white text-sm p-2 rounded border border-accent/30 focus:border-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-300 mb-1">File âm thanh (Max 2MB)</label>
                                <input 
                                    id="sound-file-input"
                                    type="file" 
                                    accept="audio/*" 
                                    onChange={e => setNewSoundFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-gray-200 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark"
                                />
                            </div>
                         </div>
                         <div className="mt-3 text-right">
                            <button 
                                onClick={handleAddSound}
                                disabled={isUploading}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50"
                            >
                                {isUploading ? 'Đang tải lên...' : 'Thêm vào danh sách'}
                            </button>
                         </div>
                    </div>
                    
                    <div>
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