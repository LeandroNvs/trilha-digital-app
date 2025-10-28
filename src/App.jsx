import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config.js'; // Corrigido

// Componentes e Páginas
import Sidebar from './components/Sidebar.jsx'; // Corrigido
import PaginaLogin from './pages/Login.jsx'; // Corrigido
import PaginaCadastro from './pages/Cadastro.jsx'; // Corrigido
import PaginaEsqueciSenha from './pages/EsqueciSenha.jsx'; // Corrigido
import PaginaDashboard from './pages/Dashboard.jsx'; // Corrigido
import AnaliseProjetos from './pages/AnaliseProjetos.jsx'; // Corrigido
import PaginaAnalise from './pages/PaginaAnalise.jsx'; // Corrigido
import PaginaInstituicoes from './pages/Instituicoes.jsx'; // Corrigido
import PaginaCursos from './pages/Cursos.jsx'; // Corrigido
import PaginaDisciplinas from './pages/Disciplinas.jsx'; // Corrigido
import PaginaTurmas from './pages/Turmas.jsx'; // Corrigido
import PaginaGrupos from './pages/Grupos.jsx'; // Corrigido
import PaginaAlunos from './pages/Alunos.jsx'; // Corrigido
import SimuladorHub from './pages/SimuladorHub.jsx'; // Corrigido
import SimuladorAdmin from './pages/SimuladorAdmin.jsx'; // Corrigido
import SimuladorForm from './pages/SimuladorForm.jsx'; // Corrigido
import SimuladorDesignar from './pages/SimuladorDesignar.jsx'; // Corrigido
import SimuladorAlunoHub from './pages/SimuladorAlunoHub.jsx'; // Corrigido
import SimuladorPainel from './pages/SimuladorPainel.jsx'; // Corrigido
// --- NOVO COMPONENTE ---
import SimuladorRanking from './pages/SimuladorRanking.jsx';


// --- Layouts e Rotas ---

function Layout({ perfilUsuario, sidebarAberta, setSidebarAberta }) {
    const location = useLocation();
    const formatarTitulo = (pathname) => {
        if (pathname.startsWith('/analise/')) { return 'Análise do Grupo'; }
        if (pathname === '/simulador/novo') { return 'Nova Simulação'; }
        if (pathname.startsWith('/simulador/editar/')) { return 'Editar Simulação'; }
        if (pathname.startsWith('/simulador/designar/')) { return 'Designar Alunos'; }
        // --- NOVA ROTA ---
        if (pathname.startsWith('/simulador/ranking/')) { return 'Ranking da Simulação'; }
        if (pathname === '/simulador/admin') { return 'Admin Simulador'; }
        if (pathname === '/simulador/aluno') { return 'Meus Jogos'; }
        if (pathname.startsWith('/simulador/painel/')) { return 'Painel da Empresa'; }
        if (pathname === '/simulador') { return 'Simulador'; }
        const nomeDaPagina = pathname.split('/').pop().replace(/-/g, ' ') || 'dashboard';
        return nomeDaPagina.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    };
    const tituloDaPagina = formatarTitulo(location.pathname);

    if (!perfilUsuario) { return <Navigate to="/login" replace />; }

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <Sidebar perfilUsuario={perfilUsuario} aberta={sidebarAberta} setSidebarAberta={setSidebarAberta} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center h-16 border-b border-gray-700 flex-shrink-0">
                    <h1 className="text-2xl font-extrabold text-white whitespace-nowrap"><span className="text-cyan-400">Trilha</span>Digital</h1>
                    <h2 className="text-xl font-semibold capitalize">{tituloDaPagina}</h2>
                </header>
                <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-gray-900"><Outlet /></main>
            </div>
        </div>
    );
}

function AdminRoute({ perfilUsuario }) {
    if (!perfilUsuario || perfilUsuario.papel !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
}

function ProfessorAdminRoute({ perfilUsuario }) {
    // Rota acessível para Professor ou Admin
    if (!perfilUsuario || (perfilUsuario.papel !== 'admin' && perfilUsuario.papel !== 'professor')) {
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
}

// --- Componente Principal ---
function App() {
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarAberta, setSidebarAberta] = useState(true);

    // Efeito de autenticação (inalterado)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = doc(db, 'usuarios', user.uid);
                const userSnap = await getDoc(userRef);
                const isAdminEmail = user.email === 'leandros.nvs@gmail.com';
                if (userSnap.exists()) {
                    const perfil = userSnap.data();
                    if (isAdminEmail && perfil.papel !== 'admin') {
                        await updateDoc(userRef, { papel: 'admin' });
                        setPerfilUsuario({ ...perfil, papel: 'admin' });
                    } else {
                        setPerfilUsuario(perfil);
                    }
                } else {
                    const nome = user.displayName || user.email.split('@')[0];
                    const fotoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=0D8ABC&color=fff`;
                    const novoPerfil = { nome, email: user.email, fotoURL, papel: isAdminEmail ? 'admin' : 'aluno' };
                    await setDoc(userRef, novoPerfil);
                    setPerfilUsuario(novoPerfil);
                }
            } else { setPerfilUsuario(null); }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Carregando...</div>;
    }

    return (
        <Routes>
            {/* Rotas Públicas (inalteradas) */}
            <Route path="/login" element={perfilUsuario ? <Navigate to="/dashboard" /> : <PaginaLogin />} />
            <Route path="/cadastro" element={perfilUsuario ? <Navigate to="/dashboard" /> : <PaginaCadastro />} />
            <Route path="/esqueci-senha" element={perfilUsuario ? <Navigate to="/dashboard" /> : <PaginaEsqueciSenha />} />
            
            {/* Rotas Protegidas (atualizadas) */}
            <Route path="/" element={<Layout perfilUsuario={perfilUsuario} sidebarAberta={sidebarAberta} setSidebarAberta={setSidebarAberta} />}>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<PaginaDashboard perfilUsuario={perfilUsuario} />} />
                <Route path="analise" element={<AnaliseProjetos />} />
                <Route path="analise/:grupoId" element={<PaginaAnalise />} />

                {/* Rota "Hub" do Simulador */}
                <Route path="simulador" element={<SimuladorHub perfilUsuario={perfilUsuario} />} />
                
                {/* Rota do Painel do Aluno */}
                <Route path="simulador/aluno" element={<SimuladorAlunoHub />} />
                <Route path="simulador/painel/:simulacaoId/:empresaId" element={<SimuladorPainel />} />

                {/* Rotas de Admin/Professor do Simulador */}
                 <Route element={<ProfessorAdminRoute perfilUsuario={perfilUsuario} />}>
                    <Route path="simulador/admin" element={<SimuladorAdmin />} />
                    <Route path="simulador/novo" element={<SimuladorForm />} /> 
                    <Route path="simulador/editar/:simulacaoId" element={<SimuladorForm />} />
                    <Route path="simulador/designar/:simulacaoId" element={<SimuladorDesignar />} />
                    {/* --- NOVA ROTA ADICIONADA --- */}
                    <Route path="simulador/ranking/:simulacaoId" element={<SimuladorRanking />} />
                </Route>

                {/* Rotas de Admin (Parametrização) (inalteradas) */}
                <Route element={<AdminRoute perfilUsuario={perfilUsuario} />}>
                    <Route path="instituicoes" element={<PaginaInstituicoes />} />
                    <Route path="cursos" element={<PaginaCursos />} />
                    <Route path="disciplinas" element={<PaginaDisciplinas />} />
                    <Route path="turmas" element={<PaginaTurmas />} />
                    <Route path="grupos" element={<PaginaGrupos />} />
                    <Route path="alunos" element={<PaginaAlunos />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to={perfilUsuario ? "/dashboard" : "/login"} />} />
        </Routes>
    );
}

export default App;