import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import useCollection from '../hooks/useCollection';
import { auth, db, appId } from '../firebase/config';

function AnaliseProjetos() {
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const todosGrupos = useCollection(`/artifacts/${appId}/public/data/grupos`);
    const usuarioId = auth.currentUser?.uid;

    // Busca o perfil do usuário logado para verificar o papel
    useEffect(() => {
        if (usuarioId) {
            const userRef = doc(db, 'usuarios', usuarioId);
            getDoc(userRef).then(docSnap => {
                if (docSnap.exists()) {
                    setPerfilUsuario(docSnap.data());
                }
            });
        }
    }, [usuarioId]);


    // Filtra os grupos com base no papel do usuário
    const meusGrupos = useMemo(() => {
        // Aguarda o perfil do usuário carregar
        if (!perfilUsuario) {
            return [];
        }

        // Se for admin, mostra todos os grupos
        if (perfilUsuario.papel === 'admin') {
            return todosGrupos;
        }

        // Para outros usuários, mostra apenas os grupos dos quais são integrantes
        return todosGrupos.filter(grupo => 
            grupo.integrantesIds?.includes(usuarioId)
        );
    }, [todosGrupos, usuarioId, perfilUsuario]);

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Meus Projetos de Análise</h2>
            <p className="text-gray-400 mb-8">Selecione um grupo para iniciar ou continuar a análise estratégica.</p>
            
            <div className="space-y-4">
                {meusGrupos.length > 0 ? (
                    meusGrupos.map(grupo => (
                        <div key={grupo.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-bold text-lg">{grupo.nome} ({grupo.sigla})</p>
                                <p className="text-sm text-gray-400">{grupo.descricao}</p>
                            </div>
                            <Link to={`/analise/${grupo.id}`} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                Acessar Análise
                            </Link>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-8">
                        {perfilUsuario && perfilUsuario.papel === 'admin' 
                            ? "Nenhum grupo cadastrado ainda." 
                            : "Você ainda não faz parte de nenhum grupo. Peça a um administrador para incluí-lo em um."
                        }
                    </p>
                )}
            </div>
        </div>
    );
}

export default AnaliseProjetos;

