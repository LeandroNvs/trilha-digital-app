import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config.js';

function PaginaEsqueciSenha() {
    const [email, setEmail] = useState('');
    const [erro, setErro] = useState('');
    const [mensagem, setMensagem] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setMensagem('');

        if (!email) {
            setErro('Por favor, insira seu e-mail.');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setMensagem('E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.');
        } catch (error) {
            console.error("Erro ao enviar e-mail de redefinição:", error);
            setErro('Falha ao enviar e-mail. Verifique se o e-mail está correto e tente novamente.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center text-white p-4">
            <div className="text-center mb-10">
                <h1 className="text-5xl font-extrabold tracking-tight text-white">
                    <span className="text-cyan-400">Trilha</span>Digital
                </h1>
            </div>
            <div className="bg-gray-700 shadow-lg rounded-xl p-8 max-w-sm w-full">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Redefinir Senha</h2>

                {mensagem ? (
                    <p className="text-green-400 text-center">{mensagem}</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-gray-300">
                            Insira o e-mail associado à sua conta e enviaremos um link para redefinir sua senha.
                        </p>
                        <input
                            type="email"
                            placeholder="Seu e-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            required
                        />
                        {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}
                        <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                            Enviar E-mail de Redefinição
                        </button>
                    </form>
                )}

                <p className="text-center text-sm text-gray-400 mt-6">
                    Lembrou da senha?{' '}
                    <Link to="/login" className="font-semibold text-cyan-400 hover:underline">
                        Voltar para o Login
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default PaginaEsqueciSenha;

