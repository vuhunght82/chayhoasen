import React, { useState } from 'react';
import { Branch, PrinterSettings } from '../../types';
import { useToast, useConfirmation } from '../../App';
import { storage } from '../../firebase';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

interface BranchModalProps {
    branch: Partial<Branch> | null;
    onClose: () => void;
    onSave: (branch: Partial<Branch>) => void;
}

const BranchModal: React.FC<BranchModalProps> = ({ branch, onClose, onSave }) => {
    const [formData, setFormData] = useState(branch);

    const handleSave = () => {
        if (formData?.name?.trim()) {
            onSave(formData);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: name === 'tableCount' ? Number(value) : value } : null);
    };

    if (!formData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-primary-dark border border-accent rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold text-accent mb-4">{formData.id ? 'Sửa Chi Nhánh' : 'Thêm Chi Nhánh'}</h3>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-100 mb-2">Tên chi nhánh</label>
                        <input 
                            type="text" 
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            className="w-full bg-primary p-2 rounded border border-accent/50"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-100 mb-2">Số lượng bàn</label>
                        <input 
                            type="number" 
                            name="tableCount"
                            value={formData.tableCount || 0}
                            onChange={handleChange}
                            className="w-full bg-primary p-2 rounded border border-accent/50"
                            min="0"
                        />
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
    printerSettings: PrinterSettings;
    setPrinterSettings: (settings: PrinterSettings | ((prev: PrinterSettings) => PrinterSettings)) => void;
    logoUrl: string;
    setLogoUrl: (url: string | ((prev: string) => string)) => void;
    resetAllData: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ branches, setBranches, printerSettings, setPrinterSettings, logoUrl, setLogoUrl, resetAllData }) => {
    const [localSettings, setLocalSettings] = useState<PrinterSettings>(printerSettings);
    const { showToast } = useToast();
    const { confirm } = useConfirmation();
    const [isUploading, setIsUploading] = useState(false);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);

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

    const handleOpenBranchModal = (branch: Partial<Branch> | null) => {
        setEditingBranch(branch || {});
        setIsBranchModalOpen(true);
    };

    const handleSaveBranch = (branchData: Partial<Branch>) => {
        if (branchData.id) { // Editing
            setBranches(prev => prev.map(b => b.id === branchData.id ? { ...b, ...branchData } as Branch : b));
            showToast('Đã cập nhật thông tin chi nhánh.');
        } else { // Adding
            const newBranch = { ...branchData, id: `cn-${Date.now()}` } as Branch;
            setBranches(prev => [...prev, newBranch]);
            showToast('Đã thêm chi nhánh mới.');
        }
        setIsBranchModalOpen(false);
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

    const generateQrCode = () => {
        if (!qrBranch || !qrTable) {
            showToast('Vui lòng chọn chi nhánh và nhập số bàn.', 'error');
            return;
        }
        const appUrl = window.location.origin + window.location.pathname;
        const qrData = `${appUrl}?branchId=${qrBranch}&table=${qrTable}`;
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
        window.print();
    };

    return (
        <div>
            {isBranchModalOpen && <BranchModal branch={editingBranch} onClose={() => setIsBranchModalOpen(false)} onSave={handleSaveBranch} />}
            <h2 className="text-2xl font-bold text-accent mb-6">Cài Đặt</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Branch Management */}
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <div className="flex justify-between items-center mb-4 border-b border-accent/30 pb-2">
                        <h3 className="text-lg font-semibold text-accent">Quản Lý Chi Nhánh</h3>
                        <button onClick={() => handleOpenBranchModal(null)} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-1 px-3 rounded-lg text-sm">
                            Thêm mới
                        </button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {branches.map(branch => (
                            <div key={branch.id} className="flex justify-between items-center bg-primary p-3 rounded-md">
                                <div>
                                    <span className="text-white">{branch.name}</span>
                                    <span className="text-xs text-gray-300 ml-2">({branch.tableCount || 0} bàn)</span>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleOpenBranchModal(branch)} className="text-blue-400 hover:text-blue-300 text-sm font-semibold">Sửa</button>
                                    <button onClick={() => handleDeleteBranch(branch.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold">Xóa</button>
                                </div>
                            </div>
                        ))}
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
                        <h3 className="text-lg font-semibold text-accent mb-4 border-b border-accent/30 pb-2">Cài Đặt Thanh toán & In ấn</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-200 block mb-1">Thông tin Header Hóa đơn</label>
                                <textarea name="header" rows={4} value={localSettings.header} onChange={handleSettingsChange} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white font-mono text-sm"></textarea>
                            </div>
                            <div>
                                <label className="text-sm text-gray-200 block mb-1">Thông tin Footer Hóa đơn</label>
                                <textarea name="footer" rows={3} value={localSettings.footer} onChange={handleSettingsChange} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white font-mono text-sm"></textarea>
                            </div>
                            <div className="flex items-center gap-6">
                                <img src={localSettings.qrCodeUrl} alt="Bank QR Code" className="w-24 h-24 object-contain bg-white p-1 rounded-md"/>
                                <div>
                                    <label htmlFor="qr-upload" className="block text-sm font-medium text-gray-100 mb-2">Tải lên ảnh QR Ngân hàng</label>
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
                         <div id="settings-bill-preview" className="bg-white text-black rounded-lg shadow-inner w-full p-4">
                            <div className="text-center font-mono text-xs">
                                <pre className="whitespace-pre-wrap">{localSettings.header}</pre>
                                <h2 className="text-sm font-bold my-3">HÓA ĐƠN THANH TOÁN</h2>
                                <div className="text-left">
                                    <p>Số HD: #{previewOrder.id}</p>
                                    <p>Bàn: {previewOrder.tableNumber}</p>
                                    <p>Ngày: {new Date(previewOrder.timestamp).toLocaleString('vi-VN')}</p>
                                </div>
                                <hr className="my-2 border-dashed border-gray-600" />
                                <table className="w-full text-left">
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
                                <hr className="my-2 border-dashed border-gray-600" />
                                <div className="text-right font-bold text-sm">
                                    <p>TỔNG CỘNG: {previewOrder.total.toLocaleString('vi-VN')}đ</p>
                                </div>
                                <hr className="my-2 border-dashed border-gray-600" />
                                <pre className="whitespace-pre-wrap">{localSettings.footer}</pre>
                                {localSettings.qrCodeUrl && <img src={localSettings.qrCodeUrl} alt="Bank QR" className="mx-auto mt-4 w-28 h-28 object-contain"/>}
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