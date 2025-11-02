import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

/**
 * Hook customizado que escuta uma coleção e (opcionalmente) aplica queries.
 * Retorna um objeto com dados, erro e estado de carregamento.
 */
export const useCollection = (collectionPath, _q, _orderBy) => {
    const [documents, setDocuments] = useState(null); // Inicia como null para sabermos que não carregou
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Inicia carregando

    // Usando useRef para evitar loops infinitos de dependência
    const q = useRef(_q).current;
    const ob = useRef(_orderBy).current;

    useEffect(() => {
        // Se collectionPath ou a query (se for obrigatória) não estiverem prontos
        if (!collectionPath || (q && !q.length)) {
            setIsLoading(false);
            // Se a query era esperada (q=true) mas veio vazia (ex: user.uid ainda não carregou),
            // não definimos documentos, apenas paramos de carregar.
            // Se q não era esperado (q=false/null), continuamos.
            if (q) { // Se 'q' era esperado mas veio nulo (ex: user.uid a carregar)
                 setDocuments([]); // Retorna vazio se a query é nula mas esperada
                 return;
            }
        }
        
        setIsLoading(true); // Inicia o carregamento
        setError(null);
        let ref = collection(db, collectionPath);

        // Aplicando a query (where) se ela existir
        if (q && q.length > 0) {
            ref = query(ref, where(...q));
        }
        
        // Aplicando o orderBy se ele existir
        if (ob && ob.length > 0) {
            ref = query(ref, orderBy(...ob));
        }

        const unsubscribe = onSnapshot(ref, (snapshot) => {
            let results = [];
            snapshot.docs.forEach(doc => {
                results.push({ ...doc.data(), id: doc.id });
            });

            setDocuments(results);
            setError(null);
            setIsLoading(false); // Carregamento concluído
        }, (err) => {
            console.error(err);
            setError('Falha ao carregar os dados: ' + err.message);
            setIsLoading(false); // Carregamento falhou
        });

        // Limpa o listener ao desmontar o componente
        return () => unsubscribe();

    }, [collectionPath, q, ob]); // Depende do nome da coleção e das referências estáveis

    return { documents, error, isLoading }; // Retorna o objeto
};

// Renomeado para 'export' em vez de 'export default' se 'useAuthContext'
// também for exportado do mesmo ficheiro, ou manter 'default' se for o único.
// Vamos assumir que é o default baseado no seu ficheiro.
export default useCollection;

