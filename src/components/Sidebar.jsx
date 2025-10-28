import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config.js'; // Corrigido: Adicionada a extensão .js

// --- Ícones ---
const IconeDashboard = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const IconeConfig = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconeAnalise = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconeSimulador = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2 1M4 7l2-1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>;
const IconeChevron = ({ aberto }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const IconeMenu = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const IconeLogout = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

function Sidebar({ perfilUsuario, aberta, setSidebarAberta }) {
  const [parametrizacaoAberta, setParametrizacaoAberta] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await signOut(auth); navigate('/login'); } 
    catch (error) { console.error("Erro ao fazer logout:", error); }
  };

  const NavLink = ({ to, icon, children }) => (
    <Link to={to} className="w-full flex items-center gap-4 px-4 py-2 rounded-lg text-white hover:bg-cyan-400">
      {icon}
      {aberta && <span>{children}</span>}
    </Link>
  );

  return (
    <aside className={`bg-gray-800 flex flex-col transition-all duration-300 ${aberta ? 'w-64' : 'w-20'}`}>
      <div className={`p-4 flex items-center h-16 border-b border-gray-700 ${aberta ? 'justify-start' : 'justify-center'}`}>
        <button onClick={() => setSidebarAberta(!aberta)} className="p-2 rounded-md hover:bg-gray-700"><IconeMenu /></button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        <NavLink to="/dashboard" icon={<IconeDashboard />}>Dashboard</NavLink>
        <NavLink to="/analise" icon={<IconeAnalise />}>Análise</NavLink>
        
        {/* Link do Simulador agora é visível para TODOS os usuários logados */}
        <NavLink to="/simulador" icon={<IconeSimulador />}>Simulador</NavLink>

        {/* Menu de Parametrização (visível apenas para Admin) */}
        {perfilUsuario?.papel === 'admin' && (
          <div>
            <button onClick={() => setParametrizacaoAberta(!parametrizacaoAberta)} className="w-full flex items-center justify-between gap-4 px-4 py-2 rounded-lg text-white hover:bg-cyan-400">
              <div className="flex items-center gap-4"><IconeConfig />{aberta && <span>Parametrização</span>}</div>
              {aberta && <IconeChevron aberto={parametrizacaoAberta} />}
            </button>
            {parametrizacaoAberta && aberta && (
              <div className="pl-8 pt-2 space-y-1">
                <Link to="/instituicoes" className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white hover:bg-gray-700">Instituições</Link>
                <Link to="/cursos" className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white hover:bg-gray-700">Cursos</Link>
                <Link to="/disciplinas" className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white hover:bg-gray-700">Disciplinas</Link>
                <Link to="/turmas" className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white hover:bg-gray-700">Turmas</Link>
                <Link to="/grupos" className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white hover:bg-gray-700">Grupos</Link>
                <Link to="/alunos" className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white hover:bg-gray-700">Alunos</Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Restante do Sidebar (Perfil e Logout) */}
      <div className={`p-4 border-t border-gray-700`}>
        {aberta ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <img src={perfilUsuario?.fotoURL} alt={perfilUsuario?.nome} className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-semibold whitespace-nowrap">{perfilUsuario?.nome}</p>
                <p className="text-sm text-gray-400 capitalize">{perfilUsuario?.papel}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Sair</button>
          </>
        ) : (
          <button onClick={handleLogout} className="w-full p-2 flex justify-center bg-red-500 hover:bg-red-600 rounded-lg" title="Sair"><IconeLogout /></button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;