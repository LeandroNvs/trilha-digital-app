import React from 'react';

function ModalConfirmacao({ mensagem, onConfirmar, onCancelar }) {
    // Impede que o clique no fundo do modal feche o mesmo sem querer
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancelar();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-gray-700 rounded-lg shadow-xl p-8 max-w-sm w-full transform transition-all animate-zoom-in">
                <p className="text-white text-lg mb-6">{mensagem}</p>
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onCancelar}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirmar}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalConfirmacao;

