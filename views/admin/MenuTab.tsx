
import React, { useState, useMemo } from 'react';
import { MenuItem, Category, Branch, Topping, ToppingGroup } from '../../types';
import { useToast, useConfirmation } from '../../App';
import { storage } from '../../firebase';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';


interface MenuTabProps {
    menuItems: MenuItem[];
    setMenuItems: (items: MenuItem[] | ((prev: MenuItem[]) => MenuItem[])) => void;
    categories: Category[];
    setCategories: (categories: Category[] | ((prev: Category[]) => Category[])) => void;
    branches: Branch[];
    toppings: Topping[];
    setToppings: (toppings: Topping[] | ((prev: Topping[]) => Topping[])) => void;
    toppingGroups: ToppingGroup[];
    setToppingGroups: (groups: ToppingGroup[] | ((prev: ToppingGroup[]) => ToppingGroup[])) => void;
}

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/540x540.png?text=Chay+Hoa+Sen";


const MenuItemModal: React.FC<{
    item: Partial<MenuItem> | null;
    categories: Category[];
    branches: Branch[];
    toppingGroups: ToppingGroup[];
    onClose: () => void;
    onSave: (item: MenuItem) => void;
}> = ({ item, categories, branches, toppingGroups, onClose, onSave }) => {
    const { showToast } = useToast();
    const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
    const [formData, setFormData] = useState<Partial<MenuItem>>(item || { name: '', categoryId: defaultCategoryId, description: '', price: 0, imageUrl: '', isOutOfStock: false, branchIds: [], toppingGroupIds: [] });
    const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl || null);
    const [isUploading, setIsUploading] = useState(false);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) : value }));
        }
    };

    const handleBranchChange = (branchId: string) => {
        setFormData(prev => {
            const currentBranchIds = prev.branchIds || [];
            const newBranchIds = currentBranchIds.includes(branchId)
                ? currentBranchIds.filter(id => id !== branchId)
                : [...currentBranchIds, branchId];
            return { ...prev, branchIds: newBranchIds };
        });
    };

    const handleToppingGroupChange = (groupId: string) => {
        setFormData(prev => {
            const currentGroupIds = prev.toppingGroupIds || [];
            const newGroupIds = currentGroupIds.includes(groupId)
                ? currentGroupIds.filter(id => id !== groupId)
                : [...currentGroupIds, groupId];
            return { ...prev, toppingGroupIds: newGroupIds };
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const maxWidth = 800;
                    const maxHeight = 600;
                    let width = img.width;
                    let height = img.height;
                    let shouldResize = false;

                    if (width > maxWidth || height > maxHeight) {
                        shouldResize = true;
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    if (shouldResize) {
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                             ctx.drawImage(img, 0, 0, width, height);
                             const dataUrl = canvas.toDataURL('image/jpeg', 0.9); 
                             setImagePreview(dataUrl);
                             setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
                             showToast(`Ảnh đã được tự động điều chỉnh về ${width}x${height}px.`, 'success');
                        }
                    } else {
                        const result = event.target?.result;
                        if (typeof result === 'string') {
                            setImagePreview(result);
                            setFormData(prev => ({ ...prev, imageUrl: result }));
                        }
                    }
                };
                const result = event.target?.result;
                if (typeof result === 'string') {
                    img.src = result;
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(isUploading) return;

        if(!formData.name || !formData.categoryId || formData.price === undefined || formData.price < 0) {
            showToast('Vui lòng điền đầy đủ tên, danh mục và giá hợp lệ.', 'error');
            return;
        }
        if (!formData.branchIds || formData.branchIds.length === 0) {
            showToast('Vui lòng chọn ít nhất một chi nhánh.', 'error');
            return;
        }

        setIsUploading(true);
        let finalItemData = { ...formData };

        if (finalItemData.imageUrl && finalItemData.imageUrl.startsWith('data:image/')) {
            try {
                const imageRef = storageRef(storage, `menuItems/${Date.now()}-${formData.name}`);
                const snapshot = await uploadString(imageRef, finalItemData.imageUrl, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);
                finalItemData.imageUrl = downloadURL;
            } catch (error) {
                console.error("Error uploading image:", error);
                showToast('Tải ảnh lên thất bại.', 'error');
                setIsUploading(false);
                return;
            }
        }
        
        onSave(finalItemData as MenuItem);
        setIsUploading(false);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-primary-dark border border-accent rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold text-accent mb-4">{formData.id ? 'Sửa Món Ăn' : 'Thêm Món Mới'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-100">Tên món</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full bg-primary p-2 rounded border border-accent/50" required/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-100">Danh mục</label>
                            <select name="categoryId" value={formData.categoryId || ''} onChange={handleChange} className="w-full bg-primary p-2 rounded border border-accent/50" required>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-100">Mô tả</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full bg-primary p-2 rounded border border-accent/50" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-100">Giá bán</label>
                        <input type="number" name="price" value={formData.price || 0} onChange={handleChange} className="w-full bg-primary p-2 rounded border border-accent/50" required min="0"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-100">Áp dụng cho chi nhánh</label>
                        <div className="mt-1 grid grid-cols-2 gap-2 p-3 bg-primary border border-accent/50 rounded-md">
                            {branches.map(branch => (
                                <div key={branch.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`branch-${branch.id}`}
                                        checked={formData.branchIds?.includes(branch.id) || false}
                                        onChange={() => handleBranchChange(branch.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                                    />
                                    <label htmlFor={`branch-${branch.id}`} className="ml-2 block text-sm text-gray-100">{branch.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-100">Nhóm Topping (Món thêm)</label>
                        <div className="mt-1 grid grid-cols-2 gap-2 p-3 bg-primary border border-accent/50 rounded-md max-h-32 overflow-y-auto">
                            {toppingGroups.map(group => (
                                <div key={group.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`topping-group-${group.id}`}
                                        checked={formData.toppingGroupIds?.includes(group.id) || false}
                                        onChange={() => handleToppingGroupChange(group.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                                    />
                                    <label htmlFor={`topping-group-${group.id}`} className="ml-2 block text-sm text-gray-100">{group.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-100">Hình ảnh (Tự động chỉnh về tối đa 800x600)</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary-dark hover:file:bg-accent-dark"/>
                        {imagePreview && <img src={imagePreview} alt="Xem trước" className="mt-2 w-full max-h-48 object-contain rounded bg-black/20"/>}
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="isOutOfStock" name="isOutOfStock" checked={!!formData.isOutOfStock} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"/>
                        <label htmlFor="isOutOfStock" className="ml-2 block text-sm text-gray-100">Đánh dấu hết hàng</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>
                        <button type="submit" disabled={isUploading} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-wait">
                            {isUploading ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CategoryManagerModal: React.FC<{
    categories: Category[];
    onClose: () => void;
    onSave: (categories: Category[]) => void;
}> = ({ categories: initialCategories, onClose, onSave }) => {
    const [cats, setCats] = useState(initialCategories);
    const [newCatName, setNewCatName] = useState('');
    const { confirm } = useConfirmation();

    const handleAdd = () => {
        if (newCatName.trim()) {
            const newCat = { id: `cat-${Date.now()}`, name: newCatName.trim() };
            setCats(prev => [...prev, newCat]);
            setNewCatName('');
        }
    };
    const handleDelete = (id: string) => {
        confirm({
            title: 'Xác nhận xóa danh mục',
            description: 'Bạn có chắc muốn xóa danh mục này? Thao tác này không thể hoàn tác.',
            onConfirm: () => setCats(prev => prev.filter(c => c.id !== id)),
        });
    };
    
    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === cats.length - 1) return;

        const newCats = [...cats];
        const item = newCats[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        newCats[index] = newCats[swapIndex];
        newCats[swapIndex] = item;
        setCats(newCats);
    };

    const handleSave = () => {
        onSave(cats);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-primary-dark border border-accent rounded-lg p-6 w-full max-w-md">
                 <h3 className="text-xl font-bold text-accent mb-4">Quản Lý Danh Mục</h3>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                    {cats.map((cat, index) => (
                        <div key={cat.id} className="flex justify-between items-center bg-primary p-2 rounded">
                            <span>{cat.name}</span>
                             <div className="flex items-center gap-3">
                                <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="disabled:opacity-20 text-white">↑</button>
                                <button onClick={() => handleMove(index, 'down')} disabled={index === cats.length - 1} className="disabled:opacity-20 text-white">↓</button>
                                <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold">Xóa</button>
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="flex gap-2">
                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)} type="text" placeholder="Tên danh mục mới" className="flex-grow bg-primary p-2 rounded border border-accent/50"/>
                    <button onClick={handleAdd} className="bg-primary-light hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Thêm</button>
                 </div>
                 <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>
                    <button type="button" onClick={handleSave} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Lưu Thay Đổi</button>
                </div>
            </div>
        </div>
    )
}

const ToppingManagerModal: React.FC<{
    toppings: Topping[];
    toppingGroups: ToppingGroup[];
    onClose: () => void;
    onSaveToppings: (toppings: Topping[]) => void;
    onSaveToppingGroups: (groups: ToppingGroup[]) => void;
}> = ({ toppings, toppingGroups, onClose, onSaveToppings, onSaveToppingGroups }) => {
    const [localToppings, setLocalToppings] = useState<Topping[]>(toppings);
    const [localGroups, setLocalGroups] = useState<ToppingGroup[]>(toppingGroups);
    const [newTopping, setNewTopping] = useState({ name: '', price: '' });
    const [newGroup, setNewGroup] = useState({ name: '', min: '0', max: '1', selectedToppingIds: [] as string[] });
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const { confirm } = useConfirmation();

    const isEditing = editingGroupId !== null;

    const handleAddTopping = () => {
        if (newTopping.name.trim() && newTopping.price !== '') {
            const newT: Topping = {
                id: `t-${Date.now()}`,
                name: newTopping.name,
                price: parseFloat(newTopping.price)
            };
            setLocalToppings(prev => [...prev, newT]);
            setNewTopping({ name: '', price: '' });
        }
    };
    
    const handleDeleteTopping = (id: string) => {
         confirm({
            title: 'Xác nhận xóa Topping',
            description: 'Bạn có chắc muốn xóa topping này? Nó cũng sẽ bị xóa khỏi tất cả các nhóm.',
            onConfirm: () => {
                setLocalToppings(prev => prev.filter(t => t.id !== id));
                setLocalGroups(prev => prev.map(g => ({
                    ...g,
                    toppingIds: g.toppingIds.filter(tId => tId !== id)
                })));
            }
        });
    };

    const handleAddOrUpdateGroup = () => {
        if (isEditing) {
            handleUpdateGroup();
        } else {
            handleAddGroup();
        }
    }

    const handleAddGroup = () => {
        if (newGroup.name.trim()) {
            const newG: ToppingGroup = {
                id: `tg-${Date.now()}`,
                name: newGroup.name,
                minSelection: parseInt(newGroup.min) || 0,
                maxSelection: parseInt(newGroup.max) || 1,
                toppingIds: newGroup.selectedToppingIds,
            };
            setLocalGroups(prev => [...prev, newG]);
            setNewGroup({ name: '', min: '0', max: '1', selectedToppingIds: [] });
        }
    };

     const handleUpdateGroup = () => {
        if (!editingGroupId) return;
        setLocalGroups(prev => prev.map(g => 
            g.id === editingGroupId 
            ? { ...g, name: newGroup.name, minSelection: parseInt(newGroup.min) || 0, maxSelection: parseInt(newGroup.max) || 1, toppingIds: newGroup.selectedToppingIds }
            : g
        ));
        handleCancelEditGroup();
    };

    const handleDeleteGroup = (id: string) => {
        confirm({
            title: 'Xác nhận xóa Nhóm',
            description: 'Bạn có chắc muốn xóa nhóm topping này?',
            onConfirm: () => {
                setLocalGroups(prev => prev.filter(g => g.id !== id));
            }
        });
    };

    const handleStartEditGroup = (group: ToppingGroup) => {
        setEditingGroupId(group.id);
        setNewGroup({
            name: group.name,
            min: group.minSelection.toString(),
            max: group.maxSelection.toString(),
            selectedToppingIds: [...group.toppingIds]
        });
    };

    const handleCancelEditGroup = () => {
        setEditingGroupId(null);
        setNewGroup({ name: '', min: '0', max: '1', selectedToppingIds: [] });
    };

    const handleMoveGroup = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === localGroups.length - 1)) {
            return;
        }
        const newGroups = [...localGroups];
        const item = newGroups.splice(index, 1)[0];
        newGroups.splice(direction === 'up' ? index - 1 : index + 1, 0, item);
        setLocalGroups(newGroups);
    };

    const handleGroupToppingChange = (toppingId: string) => {
        setNewGroup(prev => {
            const isSelected = prev.selectedToppingIds.includes(toppingId);
            return {
                ...prev,
                selectedToppingIds: isSelected
                    ? prev.selectedToppingIds.filter(id => id !== toppingId)
                    : [...prev.selectedToppingIds, toppingId]
            };
        });
    };
    
    const handleSave = () => {
        onSaveToppings(localToppings);
        onSaveToppingGroups(localGroups);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-primary-dark border border-accent rounded-lg p-6 w-full max-w-3xl text-white">
                <h3 className="text-xl font-bold text-accent mb-4">Quản Lý Topping (Món thêm)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[80vh] overflow-y-auto pr-2">
                    {/* Toppings Section */}
                    <div className="bg-primary p-4 rounded-lg">
                        <h4 className="font-semibold mb-3">Danh sách Topping</h4>
                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                            {localToppings.map(t => (
                                <div key={t.id} className="flex justify-between items-center bg-primary-dark p-2 rounded">
                                    <span>{t.name} ({t.price.toLocaleString('vi-VN')}đ)</span>
                                    <button onClick={() => handleDeleteTopping(t.id)} className="text-red-500 text-sm">Xóa</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newTopping.name} onChange={e => setNewTopping({ ...newTopping, name: e.target.value })} placeholder="Tên topping" className="flex-grow bg-primary-dark p-2 text-sm rounded border border-accent/50"/>
                            <input type="number" value={newTopping.price} onChange={e => setNewTopping({ ...newTopping, price: e.target.value })} placeholder="Giá" className="w-24 bg-primary-dark p-2 text-sm rounded border border-accent/50"/>
                            <button onClick={handleAddTopping} className="bg-green-600 px-3 rounded">+</button>
                        </div>
                    </div>

                    {/* Topping Groups Section */}
                    <div className="bg-primary p-4 rounded-lg">
                        <h4 className="font-semibold mb-3">Nhóm Topping</h4>
                         <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                             {localGroups.map((g, index) => (
                                <div key={g.id} className="flex justify-between items-center bg-primary-dark p-2 rounded">
                                    <span className="truncate">{g.name} (Chọn {g.minSelection}-{g.maxSelection})</span>
                                    <div className="flex items-center gap-2 text-sm flex-shrink-0 ml-2">
                                        <button onClick={() => handleMoveGroup(index, 'up')} disabled={index === 0} className="disabled:opacity-20 text-white">↑</button>
                                        <button onClick={() => handleMoveGroup(index, 'down')} disabled={index === localGroups.length - 1} className="disabled:opacity-20 text-white">↓</button>
                                        <button onClick={() => handleStartEditGroup(g)} className="text-blue-400 hover:text-blue-300">Sửa</button>
                                        <button onClick={() => handleDeleteGroup(g.id)} className="text-red-500 hover:text-red-400">Xóa</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h5 className="font-semibold mb-2 text-gray-200">{isEditing ? `Sửa nhóm: ${localGroups.find(g => g.id === editingGroupId)?.name}` : 'Thêm Nhóm Mới'}</h5>
                            <input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Tên nhóm mới" className="w-full bg-primary-dark p-2 text-sm rounded border border-accent/50 mb-2"/>
                            <div className="flex gap-2 mb-2">
                                <input type="number" value={newGroup.min} onChange={e => setNewGroup({ ...newGroup, min: e.target.value })} placeholder="Tối thiểu" className="w-1/2 bg-primary-dark p-2 text-sm rounded border border-accent/50"/>
                                <input type="number" value={newGroup.max} onChange={e => setNewGroup({ ...newGroup, max: e.target.value })} placeholder="Tối đa" className="w-1/2 bg-primary-dark p-2 text-sm rounded border border-accent/50"/>
                            </div>
                             <div className="p-2 border border-accent/50 rounded max-h-32 overflow-y-auto mb-2">
                                {localToppings.map(t => (
                                    <div key={t.id} className="flex items-center">
                                        <input type="checkbox" id={`group-topping-${t.id}`} checked={newGroup.selectedToppingIds.includes(t.id)} onChange={() => handleGroupToppingChange(t.id)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"/>
                                        <label htmlFor={`group-topping-${t.id}`} className="ml-2">{t.name}</label>
                                    </div>
                                ))}
                            </div>
                             <div className="flex gap-2 mt-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleUpdateGroup} type="button" className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded text-white font-bold">Cập nhật</button>
                                        <button onClick={handleCancelEditGroup} type="button" className="w-full bg-gray-600 hover:bg-gray-700 p-2 rounded text-white font-bold">Hủy</button>
                                    </>
                                ) : (
                                    <button onClick={handleAddGroup} className="w-full bg-green-600 hover:bg-green-700 p-2 rounded text-white font-bold">Thêm Nhóm</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded-lg">Hủy</button>
                    <button type="button" onClick={handleSave} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Lưu Toàn Bộ</button>
                </div>
            </div>
        </div>
    )
};


const MenuItemCardAdmin: React.FC<{
    item: MenuItem;
    categoryName: string;
    branches: Branch[];
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleStock: (id: string) => void;
}> = ({ item, categoryName, branches, onEdit, onDelete, onToggleStock }) => (
    <div className={`bg-primary-dark border border-accent rounded-lg shadow-lg flex flex-col relative transition-opacity ${item.isOutOfStock ? 'opacity-50' : ''}`}>
        {item.isOutOfStock && <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">Hết hàng</div>}
        <img src={item.imageUrl || PLACEHOLDER_IMAGE} alt={item.name} className="w-full aspect-square object-cover rounded-t-lg"/>
        <div className="p-3 flex flex-col flex-grow">
            <h4 className="font-bold text-white">{item.name}</h4>
            <p className="text-sm text-gray-200">{categoryName}</p>
            <p className="text-xs text-gray-300 mt-1 line-clamp-2">{item.description}</p>
            <div className="flex-grow"></div> {/* Spacer to push content down */}
            <div className="flex flex-wrap gap-1 text-xs mt-1">
                {item.branchIds?.map(branchId => {
                    const branch = branches.find(b => b.id === branchId);
                    return branch ? <span key={branch.id} className="bg-gray-700 text-gray-100 px-1.5 py-0.5 rounded">{branch.name.replace('Chi nhánh ', '')}</span> : null;
                })}
            </div>
            <p className="text-lg font-semibold text-accent mt-2">{item.price.toLocaleString('vi-VN')}đ</p>
        </div>
         <div className="p-3 border-t border-accent/30 flex flex-col gap-2">
            <button 
                onClick={() => onToggleStock(item.id)} 
                className={`w-full text-xs font-bold py-2 px-3 rounded-md transition-colors ${item.isOutOfStock ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
            >
                {item.isOutOfStock ? 'Còn hàng' : 'Hết hàng'}
            </button>
            <div className="flex gap-2">
                <button onClick={() => onEdit(item)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-md transition-colors">Sửa</button>
                <button onClick={() => onDelete(item.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded-md transition-colors">Xóa</button>
            </div>
        </div>
    </div>
);


const MenuTab: React.FC<MenuTabProps> = ({ menuItems, setMenuItems, categories, setCategories, branches, toppings, setToppings, toppingGroups, setToppingGroups }) => {
    const [isMenuModalOpen, setMenuModalOpen] = useState(false);
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [isToppingModalOpen, setIsToppingModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [filtersVisible, setFiltersVisible] = useState(true);
    const { showToast } = useToast();
    const { confirm } = useConfirmation();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');

    const handleOpenMenuModal = (item?: Partial<MenuItem>) => {
        if (item) {
            setEditingItem(item);
        } else {
            const defaultCategory = categories.length > 0 ? categories[0].id : '';
            setEditingItem({ name: '', categoryId: defaultCategory, description: '', price: 0, imageUrl: '', isOutOfStock: false, branchIds: [], toppingGroupIds: [] });
        }
        setMenuModalOpen(true);
    };

    const handleSaveMenuItem = (itemToSave: MenuItem) => {
        if (itemToSave.id) { // Editing
            setMenuItems(prev => prev.map(item => item.id === itemToSave.id ? itemToSave : item));
        } else { // Adding
            setMenuItems(prev => [...prev, { ...itemToSave, id: `m-${Date.now()}` }]);
        }
        showToast('Lưu món ăn thành công!');
        setMenuModalOpen(false);
        setEditingItem(null);
    };

    const handleDeleteMenuItem = (id: string) => {
        confirm({
            title: 'Xác nhận xóa món ăn',
            description: 'Bạn có chắc muốn xóa món ăn này? Thao tác này không thể hoàn tác.',
            onConfirm: () => {
                setMenuItems(prev => prev.filter(item => item.id !== id));
                showToast('Đã xóa món ăn.');
            }
        });
    };

    const handleToggleStock = (id: string) => {
        setMenuItems(prev => prev.map(item => 
            item.id === id ? { ...item, isOutOfStock: !item.isOutOfStock } : item
        ));
    };
    
    const handleSaveCategories = (updatedCategories: Category[]) => {
        setCategories(updatedCategories);
        showToast('Đã cập nhật danh mục!');
    };

    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.name || 'N/A';
    };

    const filteredMenuItems = useMemo(() => {
        return menuItems
             .filter(item => {
                if (branchFilter === 'all') return true;
                return item.branchIds?.includes(branchFilter);
            })
            .filter(item => {
                if (categoryFilter === 'all') return true;
                return item.categoryId === categoryFilter;
            })
            .filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [menuItems, categoryFilter, branchFilter, searchTerm]);

    return (
        <div>
            {isMenuModalOpen && editingItem && <MenuItemModal item={editingItem} categories={categories} branches={branches} toppingGroups={toppingGroups} onClose={() => setMenuModalOpen(false)} onSave={handleSaveMenuItem} />}
            {isCategoryModalOpen && <CategoryManagerModal categories={categories} onClose={() => setCategoryModalOpen(false)} onSave={handleSaveCategories}/>}
            {isToppingModalOpen && <ToppingManagerModal toppings={toppings} toppingGroups={toppingGroups} onClose={() => setIsToppingModalOpen(false)} onSaveToppings={setToppings} onSaveToppingGroups={setToppingGroups} />}
            
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-accent">Quản Lý Thực Đơn</h2>
                <div className="flex gap-2 flex-wrap">
                     <button onClick={() => handleOpenMenuModal()} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg transition-colors">
                        Thêm Món Mới
                    </button>
                    <button onClick={() => setCategoryModalOpen(true)} className="bg-primary-light hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Quản Lý Danh Mục
                    </button>
                    <button onClick={() => setIsToppingModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Quản Lý Topping
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <button onClick={() => setFiltersVisible(!filtersVisible)} className="w-full text-left p-2 bg-primary-dark rounded-md border border-accent/50 text-accent font-semibold mb-2">
                    {filtersVisible ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                </button>
                {filtersVisible && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-primary-dark rounded-lg border border-accent/50">
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block mb-1">Tìm kiếm món ăn</label>
                            <input 
                                type="text" 
                                placeholder="Nhập tên món..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white"
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block mb-1">Lọc theo danh mục</label>
                            <select 
                                value={categoryFilter} 
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white"
                            >
                                <option value="all">Tất cả danh mục</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block mb-1">Lọc theo chi nhánh</label>
                            <select
                                value={branchFilter}
                                onChange={e => setBranchFilter(e.target.value)}
                                className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white"
                            >
                                <option value="all">Tất cả chi nhánh</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {filteredMenuItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMenuItems.map(item => (
                        <MenuItemCardAdmin
                            key={item.id}
                            item={item}
                            categoryName={getCategoryName(item.categoryId)}
                            branches={branches}
                            onEdit={handleOpenMenuModal}
                            onDelete={handleDeleteMenuItem}
                            onToggleStock={handleToggleStock}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-200">
                    <p>Không tìm thấy món ăn nào phù hợp.</p>
                </div>
            )}
        </div>
    );
};

export default MenuTab;
