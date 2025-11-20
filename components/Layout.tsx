import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useSidebar } from '../src/context/SidebarContext';
import { Menu, ScanLine } from 'lucide-react';

const MobileHeader: React.FC = () => {
  const { toggleMobileOpen } = useSidebar();
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b md:hidden p-4 flex items-center z-10">
      <button onClick={toggleMobileOpen} className="text-gray-600 mr-4">
        <Menu size={24} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">NEXUS</h1>
      </div>
    </header>
  );
};

export const Layout: React.FC = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <MobileHeader />
        <main className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};