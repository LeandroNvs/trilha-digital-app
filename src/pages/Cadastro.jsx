import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';

function PaginaCadastro() {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');

        const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
        const emailLimpo = email.trim().toLowerCase();

        if (nomeLimpo.length < 3 || !nomeLimpo.includes(' ')) {
            setErro('Por favor, informe seu Nome e Sobrenome completos para identificação pelo professor.');
            return;
        }

        if (senha.length < 6) {
            setErro('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (senha !== confirmarSenha) {
            setErro('As senhas digitadas não coincidem.');
            return;
        }

        setSalvando(true);
        try {
            // 1. Cria o usuário no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
            const user = userCredential.user;

            // 2. Atualiza o displayName no Firebase Auth
            await updateProfile(user, { displayName: nomeLimpo });

            // 3. Grava diretamente no Firestore com merge: true para evitar a condição de corrida
            // em que o onAuthStateChanged do App.jsx salvava apenas o prefixo do e-mail
            const isAdminEmail = emailLimpo === 'leandros.nvs@gmail.com';
            const fotoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeLimpo)}&background=0D8ABC&color=fff`;

            await setDoc(doc(db, 'usuarios', user.uid), {
                nome: nomeLimpo,
                email: emailLimpo,
                fotoURL,
                papel: isAdminEmail ? 'admin' : 'aluno',
                criadoEm: serverTimestamp()
            }, { merge: true });

            // 4. Redireciona para o dashboard
            navigate('/dashboard');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setErro('Este e-mail já está cadastrado. Faça login ou use "Esqueceu a senha?".');
            } else if (error.code === 'auth/weak-password') {
                setErro('A senha deve ter no mínimo 6 caracteres.');
            } else if (error.code === 'auth/invalid-email') {
                setErro('O formato do e-mail informado é inválido.');
            } else {
                setErro('Ocorreu um erro ao criar a conta. Tente novamente.');
            }
            console.error("Erro no cadastro:", error);
        } finally {
            setSalvando(false);
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
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">Criar Nova Conta</h2>
                <p className="text-xs text-gray-300 mb-6">
                    Preencha seu <strong>nome e sobrenome reais</strong> para que o professor possa identificar você e vinculá-lo à sua turma e grupo.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-300 mb-1">
                            Nome e Sobrenome Completos *
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Maria Clara Oliveira"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-300 mb-1">
                            E-mail *
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs uppercase font-bold text-gray-300 mb-1">
                                Senha *
                            </label>
                            <input
                                type="password"
                                placeholder="Mín. 6 caracteres"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold text-gray-300 mb-1">
                                Confirmar Senha *
                            </label>
                            <input
                                type="password"
                                placeholder="Repita a senha"
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            />
                        </div>
                    </div>

                    {erro && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
                            {erro}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={salvando}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        {salvando ? 'Criando conta...' : 'Concluir Cadastro'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-400 mt-6">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="font-semibold text-cyan-400 hover:underline">
                        Faça o login
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default PaginaCadastro;

