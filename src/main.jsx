import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css'; // O Vite já configura este arquivo CSS básico para nós

// Encontra o elemento 'root' no index.html e renderiza nossa aplicação dentro dele.
ReactDOM.createRoot(document.getElementById('root')).render(
    // React.StrictMode ajuda a encontrar potenciais problemas na aplicação.
    <React.StrictMode>
        {/* BrowserRouter habilita a funcionalidade de roteamento em toda a aplicação. */}
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);

