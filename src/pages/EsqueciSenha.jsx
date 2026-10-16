import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config.js';

function PaginaEsqueciSenha() {
    const [email, setEmail] = useState('');
    const [erro, setErro] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [enviando, setEnviando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setMensagem('');

        const emailLimpo = email.trim().toLowerCase();
        if (!emailLimpo) {
            setErro('Por favor, insira seu e-mail.');
            return;
        }

        setEnviando(true);
        try {
            auth.languageCode = 'pt-BR';
            await sendPasswordResetEmail(auth, emailLimpo);
            setMensagem(`Enviamos um link de redefinição de senha para ${emailLimpo}.`);
        } catch (error) {
            console.error("Erro ao enviar e-mail de redefinição:", error);
            if (error.code === 'auth/invalid-email') {
                setErro('O formato do e-mail informado é inválido.');
            } else if (error.code === 'auth/user-not-found') {
                setErro('Nenhuma conta encontrada com este e-mail. Verifique a digitação ou crie uma nova conta.');
            } else if (error.code === 'auth/too-many-requests') {
                setErro('Muitas tentativas recentes. Aguarde alguns minutos antes de tentar novamente.');
            } else {
                setErro('Falha ao enviar o e-mail. Verifique se o endereço está correto e tente novamente.');
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center text-white p-4">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-extrabold tracking-tight text-white">
                    <span className="text-cyan-400">Trilha</span>Digital
                </h1>
            </div>
            <div className="bg-gray-700 shadow-lg rounded-xl p-8 max-w-md w-full border border-gray-600/60">
                <h2 className="text-2xl font-bold text-cyan-400 mb-3">Recuperar Senha</h2>

                {mensagem ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm space-y-2">
                            <p className="font-bold">✅ {mensagem}</p>
                            <p className="text-xs text-gray-200 leading-relaxed">
                                ⚠️ <strong>Importante:</strong> Caso não encontre na caixa de entrada em até 2 minutos, verifique a pasta de <strong>Spam / Lixo Eletrônico</strong> ou <strong>Promoções</strong> do seu e-mail.
                            </p>
                        </div>

                        <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-600 text-xs text-gray-300">
                            💡 <strong>Entrou com o Google?</strong> Se você criou sua conta clicando em <em>"Entrar com Google"</em>, basta usar o botão do Google na tela de Login (ou clicar no link recebido por e-mail se desejar criar uma senha própria).
                        </div>

                        <button
                            type="button"
                            onClick={() => setMensagem('')}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition-colors"
                        >
                            Enviar novamente ou tentar outro e-mail
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Digite o e-mail cadastrado na sua conta. Enviaremos um link seguro para você criar uma nova senha.
                        </p>

                        <div>
                            <label className="block text-xs uppercase font-bold text-gray-300 mb-1">
                                E-mail da Conta
                            </label>
                            <input
                                type="email"
                                placeholder="seu.email@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            />
                        </div>

                        {erro && (
                            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs text-center">
                                {erro}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={enviando}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            {enviando ? 'Enviando link...' : 'Enviar Link de Redefinição'}
                        </button>

                        <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-600/60 text-xs text-gray-400">
                            💡 Lembre-se de conferir também sua caixa de <strong>Spam / Lixo Eletrônico</strong> após solicitar o link.
                        </div>
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
