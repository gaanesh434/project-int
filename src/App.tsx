import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import EnhancedCodeEditor from './components/EnhancedCodeEditor';
import GCMonitor from './components/GCMonitor';
import TimeTravelDebugger from './components/TimeTravel';
import WasmDemo from './components/WasmDemo';
import Benchmarks from './components/Benchmarks';
import EmbeddedSimulator from './components/EmbeddedSimulator';

type ActiveTab = 'editor' | 'gc' | 'debugger' | 'wasm' | 'benchmarks' | 'embedded';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'editor':
        return <EnhancedCodeEditor />;
      case 'gc':
        return <GCMonitor />;
      case 'debugger':
        return <TimeTravelDebugger />;
      case 'wasm':
        return <WasmDemo />;
      case 'benchmarks':
        return <Benchmarks />;
      case 'embedded':
        return <EmbeddedSimulator />;
      default:
        return <EnhancedCodeEditor />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;