import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { JavaInterpreter } from '../interpreter/JavaInterpreter';

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
        System.out.println("Temperature: " + temp + "°C");
    }
    
    private void triggerAlert() {
        System.out.println("Temperature alert: " + temperature + "°C");
    }
}`);

  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [interpreter] = useState(() => new JavaInterpreter());
  const [executionStats, setExecutionStats] = useState({
    executionTime: 0,
    gcPauseTime: 0,
    deadlineCompliance: 100,
    violations: 0
  });

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('Compiling with JavaRT interpreter...\n');
    
    try {
      // Simulate compilation delay
      await new Promise(resolve => setTimeout(resolve, 300));
      setOutput(prev => prev + 'Analyzing @Deadline annotations...\n');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      setOutput(prev => prev + 'Real-time GC initialized (0.3ms max pause)\n');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      setOutput(prev => prev + 'Executing Java code...\n');
      
      const startTime = performance.now();
      const result = interpreter.interpret(code);
      const executionTime = performance.now() - startTime;
      
      setOutput(prev => prev + result.output + '\n');
      
      // Calculate statistics
      const gcMetrics = interpreter.getGCMetrics();
      const violations = interpreter.getDeadlineViolations();
      const avgGCPause = gcMetrics.length > 0 
        ? gcMetrics.reduce((sum, m) => sum + m.pauseTime, 0) / gcMetrics.length 
        : 0;
      
      setExecutionStats({
        executionTime: parseFloat(executionTime.toFixed(2)),
        gcPauseTime: parseFloat(avgGCPause.toFixed(2)),
        deadlineCompliance: violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10),
        violations: violations.length
      });
      
      setOutput(prev => prev + '\n=== Performance Metrics ===\n');
      setOutput(prev => prev + `Total execution time: ${executionTime.toFixed(2)}ms\n`);
      setOutput(prev => prev + `GC pause time: ${avgGCPause.toFixed(2)}ms\n`);
      setOutput(prev => prev + `Deadline violations: ${violations.length}\n`);
      setOutput(prev => prev + `Deadline compliance: ${violations.length === 0 ? '100%' : `${Math.max(0, 100 - violations.length * 10)}%`}\n`);
      
      if (violations.length > 0) {
        setOutput(prev => prev + '\n=== Deadline Violations ===\n');
        violations.forEach(violation => {
          setOutput(prev => prev + `${violation}\n`);
        });
      }
      
    } catch (error) {
      setOutput(prev => prev + `\nError: ${error instanceof Error ? error.message : String(error)}\n`);
    } finally {
      setIsRunning(false);
    }
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
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span>{isRunning ? 'Running' : 'Ready'}</span>
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
              <div className="text-2xl font-bold text-green-400">{executionStats.gcPauseTime}ms</div>
              <div className="text-xs text-gray-400">Avg GC Pause</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${executionStats.violations === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {executionStats.deadlineCompliance}%
              </div>
              <div className="text-xs text-gray-400">Deadline Met</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{executionStats.executionTime}ms</div>
              <div className="text-xs text-gray-400">Total Runtime</div>
            </div>
          </div>
          
          {executionStats.violations > 0 && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{executionStats.violations} deadline violation{executionStats.violations !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;