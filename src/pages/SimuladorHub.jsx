import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js'; // Corrigido: Adicionada a extensão .js

// Esta página não renderiza nada. Ela apenas busca o perfil do usuário
// e o redireciona para a página correta (Admin ou Aluno).
function SimuladorHub() {
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const usuarioId = auth.currentUser?.uid;
        if (usuarioId) {
            const userRef = doc(db, 'usuarios', usuarioId);
            getDoc(userRef).then(docSnap => {
                if (docSnap.exists()) {
                    setPerfil(docSnap.data());
                }
                setLoading(false);
            }).catch(err => {
                console.error("Erro ao buscar perfil:", err);
                setLoading(false);
            });
        } else {
            // Caso de segurança, usuário não logado
            setLoading(false);
        }
    }, [db]); // Adicionado db como dependência

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Carregando...</div>;
    }

    if (!perfil) {
        // Se não houver perfil, mas o usuário estiver logado (perfil ainda não foi criado?),
        // ou se o usuário estiver deslogado, manda para o login.
        if (auth.currentUser) {
            console.error("Usuário autenticado, mas perfil não encontrado no Firestore.");
            // Você pode querer forçar um logout aqui ou redirecionar para uma página de erro
             return <Navigate to="/login" replace />; // Mais seguro é deslogar
        }
        return <Navigate to="/login" replace />; 
    }

    if (perfil.papel === 'admin' || perfil.papel === 'professor') {
        return <Navigate to="/simulador/admin" replace />;
    } else {
        return <Navigate to="/simulador/aluno" replace />;
    }
}

export default SimuladorHub;

