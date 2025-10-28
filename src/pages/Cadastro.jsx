import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase/config.js';

function PaginaCadastro() {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro(''); // Limpa erros anteriores

        try {
            // Cria o usuário no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // Adiciona o nome ao perfil do usuário
            // A foto de perfil não é adicionada aqui, pois usuários de e-mail/senha não têm uma por padrão
            await updateProfile(user, { displayName: nome });

            // Redireciona para o dashboard (o App.jsx vai criar o perfil no Firestore)
            navigate('/dashboard');

        } catch (error) {
            // Trata erros comuns do Firebase
            if (error.code === 'auth/email-already-in-use') {
                setErro('Este e-mail já está em uso.');
            } else if (error.code === 'auth/weak-password') {
                setErro('A senha deve ter no mínimo 6 caracteres.');
            } else {
                setErro('Ocorreu um erro ao criar a conta. Tente novamente.');
            }
            console.error("Erro no cadastro:", error);
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
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Criar Nova Conta</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Seu nome completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Seu melhor e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Crie uma senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        className="w-full bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                    {erro && <p className="text-red-400 text-sm">{erro}</p>}
                    <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                        Cadastrar
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

