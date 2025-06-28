import React, { useState } from 'react';
import { 
  Book, 
  Code, 
  Play, 
  Zap, 
  Activity, 
  RotateCcw, 
  Cpu, 
  TestTube,
  Copy,
  CheckCircle
} from 'lucide-react';

const HelpDocumentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'overview', title: 'Overview', icon: Book },
    { id: 'editor', title: 'Code Editor', icon: Code },
    { id: 'examples', title: 'Code Examples', icon: Play },
  ];

  const iotExamples = [
    {
      id: 'basic-sensor',
      title: 'Basic IoT Sensor Reading',
      description: 'Simple temperature and humidity sensor with safety checks',
      code: `@Deadline(ms=5)
public void basicSensorRead() {
    int temperature = 25;
    int humidity = 60;
    boolean isActive = true;
    
    System.out.println("Basic IoT Sensor Starting...");
    
    for (int i = 0; i < 3; i++) {
        temperature = temperature + Math.floor(Math.random() * 6) - 3;
        humidity = humidity + Math.floor(Math.random() * 4) - 2;
        
        System.out.println("Reading " + (i + 1) + ":");
        System.out.println("  Temperature: " + temperature + "°C");
        System.out.println("  Humidity: " + humidity + "%");
        
        if (temperature > 30) {
            System.out.println("  WARNING: High temperature!");
            isActive = false;
        }
    }
    
    System.out.println("Sensor status: " + (isActive ? "ACTIVE" : "ALERT"));
}`
    },
    {
      id: 'multi-sensor',
      title: 'Multi-Sensor Data Processing',
      description: 'Processing data from multiple sensors with averaging',
      code: `@Deadline(ms=10)
public void multiSensorProcessing() {
    int[] temperatureReadings = new int[5];
    int[] humidityReadings = new int[5];
    int totalTemp = 0;
    int totalHumidity = 0;
    
    System.out.println("Multi-Sensor Processing Started");
    
    for (int i = 0; i < 5; i++) {
        temperatureReadings[i] = 20 + Math.floor(Math.random() * 15);
        humidityReadings[i] = 40 + Math.floor(Math.random() * 30);
        
        totalTemp = totalTemp + temperatureReadings[i];
        totalHumidity = totalHumidity + humidityReadings[i];
        
        System.out.println("Sensor " + (i + 1) + ": T=" + temperatureReadings[i] + "°C, H=" + humidityReadings[i] + "%");
    }
    
    int avgTemp = totalTemp / 5;
    int avgHumidity = totalHumidity / 5;
    
    System.out.println("Average Temperature: " + avgTemp + "°C");
    System.out.println("Average Humidity: " + avgHumidity + "%");
}`
    },
    {
      id: 'safety-critical',
      title: 'Safety-Critical System',
      description: 'Industrial sensor with safety protocols',
      code: `@Deadline(ms=3)
@SafetyCheck
public void safetyCriticalSystem() {
    int pressure = 100;
    int temperature = 25;
    boolean emergencyShutdown = false;
    
    System.out.println("Safety-Critical System Online");
    
    for (int i = 0; i < 4; i++) {
        pressure = pressure + Math.floor(Math.random() * 20) - 10;
        temperature = temperature + Math.floor(Math.random() * 8) - 4;
        
        System.out.println("Cycle " + (i + 1) + ":");
        System.out.println("  Pressure: " + pressure + " PSI");
        System.out.println("  Temperature: " + temperature + "°C");
        
        if (pressure > 120) {
            System.out.println("  CRITICAL: Pressure exceeds safe limit!");
            emergencyShutdown = true;
            break;
        }
        
        if (temperature > 40) {
            System.out.println("  WARNING: High temperature detected");
        }
    }
    
    System.out.println("System: " + (emergencyShutdown ? "SHUTDOWN" : "OPERATIONAL"));
}`
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">JavaRT Interpreter Overview</h2>
              <p className="text-gray-300 leading-relaxed">
                JavaRT is a revolutionary Java interpreter designed for embedded systems and real-time applications. 
                It features sub-millisecond garbage collection, time-travel debugging, and WebAssembly compilation 
                for browser execution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <Activity className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Real-time Performance</h3>
                </div>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Sub-millisecond GC pause times (0.5ms avg)</li>
                  <li>• @Deadline annotations for timing constraints</li>
                  <li>• Real-time safety verification</li>
                  <li>• Embedded system optimization</li>
                </ul>
              </div>

              <div className="bg-gray-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Advanced Features</h3>
                </div>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Time-travel debugging</li>
                  <li>• WebAssembly compilation</li>
                  <li>• IoT platform support</li>
                  <li>• Live syntax highlighting</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'editor':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Code Editor Guide</h2>
            
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">How to Use</h3>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="font-medium text-white mb-2">1. Writing Code</h4>
                  <p className="text-sm">Type Java code in the editor. Syntax highlighting appears automatically.</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">2. IoT Annotations</h4>
                  <p className="text-sm">Use @Deadline(ms=value) for real-time constraints, @Sensor for sensor data.</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">3. Running Code</h4>
                  <p className="text-sm">Click "Run" to execute. View real-time metrics including GC performance.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'examples':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">IoT Code Examples</h2>
            <p className="text-gray-300">
              Ready-to-use IoT code examples that demonstrate real-time constraints and sensor processing.
            </p>
            
            <div className="space-y-6">
              {iotExamples.map((example) => (
                <div key={example.id} className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{example.title}</h3>
                      <p className="text-gray-400 text-sm">{example.description}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(example.code, example.id)}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                    >
                      {copiedCode === example.id ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-sm">
                        {copiedCode === example.id ? 'Copied!' : 'Copy Code'}
                      </span>
                    </button>
                  </div>
                  
                  <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                    {example.code}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen">
          <div className="p-6">
            <h1 className="text-xl font-bold text-white mb-6">JavaRT Help</h1>
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default HelpDocumentation;