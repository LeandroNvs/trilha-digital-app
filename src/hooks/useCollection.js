import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config'; // Importa a instância do db

/**
 * Um hook customizado que escuta as mudanças em uma coleção do Firestore.
 * @param {string} path O caminho para a coleção no Firestore (ex: 'usuarios').
 * @returns {Array} Um array com os documentos da coleção.
 */
const useCollection = (collectionPath) => {
    const [data, setData] = useState([]);

    useEffect(() => {
        // Se o caminho não for fornecido, não faz nada.
        if (!collectionPath) {
            setData([]);
            return;
        };

        const collectionRef = collection(db, collectionPath);

        // onSnapshot cria um ouvinte em tempo real.
        // A função callback será executada sempre que os dados na coleção mudarem.
        const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
            const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setData(results);
        });

        // A função de limpeza do useEffect.
        // Ela é chamada quando o componente que usa o hook é "desmontado".
        // Isso cancela o ouvinte, evitando vazamentos de memória.
        return () => unsubscribe();

    }, [collectionPath]); // O efeito será re-executado se o caminho da coleção mudar.

    return data;
};

export default useCollection;

