import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Clock, AlertTriangle } from 'lucide-react';

const CodeEditor: React.FC = () => {
  const [code, setCode] = useState(`@Deadline(ms=5)
public class IoTSensor {
    private int temperature;
    private boolean isActive = true;
    
    @Deadline(ms=2)
    public int readTemperature() {
        // Real-time constraint: must complete in 2ms
        temperature = simulateReading();
        return temperature;
    }
    
    @Deadline(ms=1)
    private int simulateReading() {
        // Ultra-low latency sensor read
        return (int)(Math.random() * 100);
    }
    
    public void processData() {
        int temp = readTemperature();
        if (temp > 80) {
            triggerAlert();
        }
    }
    
    private void triggerAlert() {
        System.out.println("Temperature alert: " + temperature + "°C");
    }
}`);

  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [deadlineViolations, setDeadlineViolations] = useState<string[]>([]);

  const handleRun = () => {
    setIsRunning(true);
    setOutput('Compiling with JavaRT interpreter...\n');
    
    // Simulate compilation and execution
    setTimeout(() => {
      setOutput(prev => prev + 'Analyzing @Deadline annotations...\n');
      setTimeout(() => {
        setOutput(prev => prev + 'Real-time GC initialized (0.3ms max pause)\n');
        setTimeout(() => {
          setOutput(prev => prev + 'Executing IoTSensor.processData()...\n');
          setTimeout(() => {
            setOutput(prev => prev + 'Temperature alert: 87°C\n');
            setOutput(prev => prev + 'Execution completed successfully\n');
            setOutput(prev => prev + '\n=== Performance Metrics ===\n');
            setOutput(prev => prev + 'Total execution time: 3.2ms\n');
            setOutput(prev => prev + 'GC pause time: 0.2ms\n');
            setOutput(prev => prev + 'Deadline compliance: 100%\n');
            setIsRunning(false);
          }, 500);
        }, 300);
      }, 400);
    }, 300);
  };

  const handleStop = () => {
    setIsRunning(false);
    setOutput(prev => prev + '\nExecution stopped by user\n');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
      {/* Code Editor */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Java Code Editor</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="text-sm">{isRunning ? 'Running' : 'Run'}</span>
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              <span className="text-sm">Stop</span>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-96 bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>
        
        {/* Deadline Annotations Info */}
        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-400">@Deadline Annotations</h3>
              <p className="text-xs text-gray-400 mt-1">
                Real-time constraints for embedded systems. Methods must complete within specified milliseconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Output Console */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Execution Output</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Real-time Mode</span>
          </div>
        </div>
        
        <div className="p-4">
          <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap bg-gray-900 p-4 rounded-lg h-64 overflow-y-auto">
            {output || 'Ready to execute Java code with real-time constraints...'}
          </pre>
        </div>

        {/* Performance Stats */}
        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">0.3ms</div>
              <div className="text-xs text-gray-400">Avg GC Pause</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">100%</div>
              <div className="text-xs text-gray-400">Deadline Met</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">3.2ms</div>
              <div className="text-xs text-gray-400">Total Runtime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;