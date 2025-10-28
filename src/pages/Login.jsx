import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/config.js';

function PaginaLogin() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro('');
        try {
            await signInWithEmailAndPassword(auth, email, senha);
            navigate('/dashboard');
        } catch (error) {
            setErro('E-mail ou senha inválidos. Tente novamente.');
            console.error("Erro no login:", error);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (error) {
            setErro('Falha ao autenticar com o Google.');
            console.error("Erro no login com Google:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center text-white p-4">
            <div className="text-center mb-10">
                <h1 className="text-5xl font-extrabold tracking-tight text-white"><span className="text-cyan-400">Trilha</span>Digital</h1>
            </div>
            <div className="bg-gray-700 shadow-lg rounded-xl p-8 max-w-sm w-full">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Acessar Plataforma</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <div className="text-right">
                        <Link to="/esqueci-senha" className="text-sm text-cyan-400 hover:underline">
                            Esqueceu a senha?
                        </Link>
                    </div>
                    {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}
                    <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">Entrar</button>
                </form>
                <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600" /></div><div className="relative flex justify-center text-sm"><span className="bg-gray-700 px-2 text-gray-400">OU</span></div></div>
                <button onClick={handleGoogleLogin} className="w-full bg-white text-gray-800 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors">
                    <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                    Entrar com Google
                </button>
                <p className="text-center text-sm text-gray-400 mt-6">
                    Não tem uma conta?{' '}
                    <Link to="/cadastro" className="font-semibold text-cyan-400 hover:underline">Cadastre-se</Link>
                </p>
            </div>
        </div>
    );
}

export default PaginaLogin;

