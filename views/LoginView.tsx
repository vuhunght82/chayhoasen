
import React, { useState } from 'react';
import { ref, get, child } from 'firebase/database';
import { database } from '../firebase';

interface LoginViewProps {
    onLoginSuccess: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const dbRef = ref(database);
            const snapshot = await get(child(dbRef, 'admins'));

            if (snapshot.exists()) {
                const admins = snapshot.val();
                // Chuyển đổi object admins thành mảng để kiểm tra
                const adminList = Object.values(admins) as any[];
                const isValid = adminList.some(admin => 
                    admin.username === username && admin.password === password
                );

                if (isValid) {
                    onLoginSuccess();
                } else {
                    setError('Tên đăng nhập hoặc mật khẩu không đúng.');
                }
            } else {
                // Fallback nếu chưa có bảng admins (dùng hardcode cho demo lần đầu nếu cần, hoặc báo lỗi)
                if (username === 'admin' && password === '123') {
                     onLoginSuccess();
                } else {
                    setError('Hệ thống chưa có dữ liệu quản trị viên.');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Đã có lỗi xảy ra. Vui lòng kiểm tra kết nối mạng.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-primary-dark px-4">
            <div className="bg-primary border-2 border-accent p-8 rounded-2xl shadow-2xl w-full max-w-sm transform transition-all hover:scale-[1.01]">
                <div className="flex justify-center mb-6">
                     <div className="w-20 h-20 bg-primary-dark p-1 rounded-full border-2 border-accent flex justify-center items-center">
                        <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-accent text-center mb-8 uppercase tracking-wider">Đăng Nhập</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-gray-200 text-sm font-bold mb-2 ml-2">Tên đăng nhập</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-primary-dark border border-accent/50 text-white px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder-gray-500"
                            placeholder="Nhập tên đăng nhập..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-200 text-sm font-bold mb-2 ml-2">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-primary-dark border border-accent/50 text-white px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder-gray-500"
                            placeholder="Nhập mật khẩu..."
                            required
                        />
                    </div>
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3.5 px-4 rounded-full shadow-lg transform transition hover:translate-y-[-2px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed mt-4 uppercase tracking-wide"
                    >
                        {loading ? 'Đang kiểm tra...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginView;
