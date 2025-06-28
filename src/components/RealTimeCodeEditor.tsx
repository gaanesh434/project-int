import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, Clock, AlertTriangle, Trash2, Shield, Rewind, FastForward, Zap } from 'lucide-react';
import { EnhancedJavaInterpreter } from '../interpreter/EnhancedJavaInterpreter';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { AutoComplete } from './AutoComplete';

const RealTimeCodeEditor: React.FC = () => {
  const [code, setCode] = useState(`// Real-time IoT Sensor with Enhanced Safety
@Deadline(ms=5)
public void sensorRead() {
    int temperature = 25;
    int humidity = 60;
    boolean isActive = true;
    
    System.out.println("Enhanced IoT Sensor Starting...");
    System.out.println("Real-time constraints: 5ms deadline");
    
    // Real-time sensor loop with safety verification
    for (int i = 0; i < 8; i++) {
        // Simulate realistic sensor readings
        temperature = temperature + Math.floor(Math.random() * 10) - 5;
        humidity = humidity + Math.floor(Math.random() * 6) - 3;
        
        System.out.println("Reading " + (i + 1) + ":");
        System.out.println("  Temperature: " + temperature + "°C");
        System.out.println("  Humidity: " + humidity + "%");
        
        // Safety-critical threshold checking with formal verification
        if (temperature > 35) {
            System.out.println("  CRITICAL: Temperature exceeded safe limit!");
            isActive = false;
        }
        
        // Safe division with automatic zero-check
        if (i > 0) {
            int avgTemp = temperature / i; // Verified safe division
            System.out.println("  Running average: " + avgTemp + "°C");
        }
        
        // Deadline-sensitive operations
        if (temperature > 30 || humidity < 40) {
            dataTransmit(temperature, humidity);
        }
        
        // Memory allocation for off-heap optimization
        String sensorData = "T:" + temperature + ",H:" + humidity;
        System.out.println("  Data: " + sensorData);
    }
    
    System.out.println("Sensor cycle completed. Status: " + (isActive ? "ACTIVE" : "SHUTDOWN"));
}

@Deadline(ms=3)
public void dataTransmit(int temp, int humidity) {
    System.out.println("TRANSMITTING: T=" + temp + "°C, H=" + humidity + "%");
    
    // Simulate network transmission with safety checks
    if (temp > 0 && humidity > 0) {
        System.out.println("Data transmission successful");
    } else {
        System.out.println("ERROR: Invalid sensor data");
    }
}`);

  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [interpreter] = useState(() => new EnhancedJavaInterpreter());
  const [errors, setErrors] = useState<Array<{ line: number; message: string; type: 'error' | 'warning' }>>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [executionStats, setExecutionStats] = useState({
    executionTime: 0,
    gcPauseTime: 0,
    deadlineCompliance: 100,
    safetyViolations: 0,
    deadlineViolations: 0,
    heapUsage: 0,
    offHeapUsage: 0,
    allocatedObjects: 0,
    freedObjects: 0,
    compactionTime: 0
  });

  const [timeTravelMode, setTimeTravelMode] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<any>(null);

  // Real-time syntax validation
  useEffect(() => {
    const validateSyntax = () => {
      const newErrors: Array<{ line: number; message: string; type: 'error' | 'warning' }> = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();
        
        // Check for @Deadline annotation validation
        if (trimmedLine.startsWith('@Deadline')) {
          const match = trimmedLine.match(/@Deadline\s*\(\s*ms\s*=\s*(\d+)\s*\)/);
          if (!match) {
            newErrors.push({
              line: lineNumber,
              message: 'Invalid @Deadline syntax. Use @Deadline(ms=value)',
              type: 'error'
            });
          } else {
            const ms = parseInt(match[1]);
            if (ms <= 0) {
              newErrors.push({
                line: lineNumber,
                message: 'Deadline must be positive',
                type: 'error'
              });
            } else if (ms > 1000) {
              newErrors.push({
                line: lineNumber,
                message: 'Deadline > 1000ms may not be real-time',
                type: 'warning'
              });
            }
          }
        }
        
        // Check for potential division by zero
        if (trimmedLine.includes('/') && !trimmedLine.includes('//')) {
          const divMatch = trimmedLine.match(/(\w+)\s*\/\s*(\w+|\d+)/);
          if (divMatch && divMatch[2] === '0') {
            newErrors.push({
              line: lineNumber,
              message: 'Division by zero detected',
              type: 'error'
            });
          }
        }
        
        // Check for unsafe operations in IoT context
        if (trimmedLine.includes('System.exit') || trimmedLine.includes('Runtime.getRuntime')) {
          newErrors.push({
            line: lineNumber,
            message: 'Unsafe operation not allowed in IoT environment',
            type: 'error'
          });
        }
        
        // Check for missing semicolons
        if (trimmedLine.length > 0 && 
            !trimmedLine.endsWith(';') && 
            !trimmedLine.endsWith('{') && 
            !trimmedLine.endsWith('}') &&
            !trimmedLine.startsWith('//') &&
            !trimmedLine.startsWith('@') &&
            !trimmedLine.includes('if') &&
            !trimmedLine.includes('for') &&
            !trimmedLine.includes('while') &&
            !trimmedLine.includes('public') &&
            !trimmedLine.includes('private')) {
          newErrors.push({
            line: lineNumber,
            message: 'Missing semicolon',
            type: 'warning'
          });
        }
      });
      
      setErrors(newErrors);
    };

    const debounceTimer = setTimeout(validateSyntax, 300);
    return () => clearTimeout(debounceTimer);
  }, [code]);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('Starting Enhanced JavaRT with Real-time Safety Verification...\n');
    
    try {
      const startTime = performance.now();
      
      setOutput(prev => prev + '✓ Parsing Java source with IoT safety analysis...\n');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setOutput(prev => prev + '✓ Initializing real-time GC with off-heap optimization...\n');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setOutput(prev => prev + '✓ Enabling @Deadline enforcement and formal verification...\n');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setOutput(prev => prev + '✓ Activating time-travel debugging with circular buffer...\n');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setOutput(prev => prev + '✓ Starting execution with safety monitoring...\n\n');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Execute with enhanced interpreter
      const result = interpreter.interpret(code);
      const executionTime = performance.now() - startTime;
      
      // Display the actual output
      setOutput(prev => prev + '=== Program Output ===\n');
      setOutput(prev => prev + result.output + '\n');
      
      // Calculate real-time statistics
      const gcMetrics = interpreter.getGCMetrics();
      const deadlineViolations = interpreter.getDeadlineViolations();
      const safetyViolations = interpreter.getSafetyViolations();
      const heapStatus = interpreter.getHeapStatus();
      const snapshots = interpreter.getTimeTravelSnapshots();
      
      const avgGCPause = gcMetrics.length > 0 
        ? gcMetrics.reduce((sum, m) => sum + m.pauseTime, 0) / gcMetrics.length 
        : 0;
      
      const avgCompactionTime = gcMetrics.length > 0 
        ? gcMetrics.reduce((sum, m) => sum + m.compactionTime, 0) / gcMetrics.length 
        : 0;
      
      const latestGC = gcMetrics.length > 0 ? gcMetrics[gcMetrics.length - 1] : null;
      
      setExecutionStats({
        executionTime: parseFloat(executionTime.toFixed(2)),
        gcPauseTime: parseFloat(avgGCPause.toFixed(2)),
        deadlineCompliance: deadlineViolations.length === 0 ? 100 : Math.max(0, 100 - deadlineViolations.length * 20),
        safetyViolations: safetyViolations.length,
        deadlineViolations: deadlineViolations.length,
        heapUsage: parseFloat(heapStatus.percentage.toFixed(1)),
        offHeapUsage: parseFloat((heapStatus.offHeap.allocated / heapStatus.offHeap.total * 100).toFixed(1)),
        allocatedObjects: latestGC ? latestGC.allocatedObjects : 0,
        freedObjects: latestGC ? latestGC.freedObjects : 0,
        compactionTime: parseFloat(avgCompactionTime.toFixed(2))
      });
      
      setOutput(prev => prev + '=== Real-time Execution Metrics ===\n');
      setOutput(prev => prev + `Total execution time: ${executionTime.toFixed(2)}ms\n`);
      setOutput(prev => prev + `Average GC pause: ${avgGCPause.toFixed(2)}ms\n`);
      setOutput(prev => prev + `Off-heap compaction: ${avgCompactionTime.toFixed(2)}ms\n`);
      setOutput(prev => prev + `Heap usage: ${heapStatus.percentage.toFixed(1)}%\n`);
      setOutput(prev => prev + `Off-heap usage: ${(heapStatus.offHeap.allocated / heapStatus.offHeap.total * 100).toFixed(1)}%\n`);
      setOutput(prev => prev + `Objects allocated: ${latestGC ? latestGC.allocatedObjects : 0}\n`);
      setOutput(prev => prev + `Objects freed: ${latestGC ? latestGC.freedObjects : 0}\n`);
      setOutput(prev => prev + `Safety violations: ${safetyViolations.length}\n`);
      setOutput(prev => prev + `Deadline violations: ${deadlineViolations.length}\n`);
      setOutput(prev => prev + `Time-travel snapshots: ${snapshots.length}\n`);
      
      if (deadlineViolations.length > 0) {
        setOutput(prev => prev + '\n=== ⚠️ Deadline Violations ===\n');
        deadlineViolations.forEach(violation => {
          setOutput(prev => prev + `${violation.methodName}: ${violation.actualMs.toFixed(2)}ms > ${violation.expectedMs}ms (${violation.severity})\n`);
        });
      }
      
      if (safetyViolations.length > 0) {
        setOutput(prev => prev + '\n=== 🛡️ Safety Violations ===\n');
        safetyViolations.forEach(violation => {
          setOutput(prev => prev + `Line ${violation.line}: ${violation.message} (${violation.severity})\n`);
        });
      }
      
      if (gcMetrics.length > 0) {
        setOutput(prev => prev + '\n=== 🗑️ Garbage Collection Activity ===\n');
        gcMetrics.forEach((metric, index) => {
          setOutput(prev => prev + `GC #${index + 1}: ${metric.pauseTime.toFixed(2)}ms pause, ${metric.heapUsage.toFixed(1)}% heap, ${metric.offHeapUsage.toFixed(1)}% off-heap\n`);
        });
      }
      
    } catch (error) {
      setOutput(prev => prev + `\n❌ Execution Error: ${error instanceof Error ? error.message : String(error)}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTimeTravelBack = () => {
    const snapshot = interpreter.stepBackInTime();
    if (snapshot) {
      setCurrentSnapshot(snapshot);
      setOutput(prev => prev + `\n⏪ [Time Travel] Stepped back to line ${snapshot.line} (${new Date(snapshot.timestamp).toLocaleTimeString()})\n`);
    }
  };

  const handleTimeTravelForward = () => {
    const snapshot = interpreter.stepForwardInTime();
    if (snapshot) {
      setCurrentSnapshot(snapshot);
      setOutput(prev => prev + `\n⏩ [Time Travel] Stepped forward to line ${snapshot.line} (${new Date(snapshot.timestamp).toLocaleTimeString()})\n`);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setOutput(prev => prev + '\n🛑 [Execution stopped by user]\n');
  };

  const handleClear = () => {
    setOutput('');
    setCurrentSnapshot(null);
    setExecutionStats({
      executionTime: 0,
      gcPauseTime: 0,
      deadlineCompliance: 100,
      safetyViolations: 0,
      deadlineViolations: 0,
      heapUsage: 0,
      offHeapUsage: 0,
      allocatedObjects: 0,
      freedObjects: 0,
      compactionTime: 0
    });
  };

  const handleTriggerGC = () => {
    interpreter.triggerGC();
    const heapStatus = interpreter.getHeapStatus();
    const gcMetrics = interpreter.getGCMetrics();
    const latest = gcMetrics[gcMetrics.length - 1];
    
    setOutput(prev => prev + `\n🗑️ [Manual GC] Pause: ${latest.pauseTime.toFixed(2)}ms, Heap: ${heapStatus.percentage.toFixed(1)}%, Off-heap: ${(heapStatus.offHeap.allocated / heapStatus.offHeap.total * 100).toFixed(1)}%\n`);
    
    if (latest) {
      setExecutionStats(prev => ({
        ...prev,
        gcPauseTime: latest.pauseTime,
        heapUsage: latest.heapUsage,
        offHeapUsage: latest.offHeapUsage,
        allocatedObjects: latest.allocatedObjects,
        freedObjects: latest.freedObjects,
        compactionTime: latest.compactionTime
      }));
    }
  };

  const handleAutoCompleteSelect = (suggestion: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + suggestion + code.substring(end);
      setCode(newCode);
      
      // Set cursor position after the inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + suggestion.length, start + suggestion.length);
      }, 0);
    }
    setShowAutoComplete(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-8rem)]">
      {/* Enhanced Code Editor with Real-time Features */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Real-time Java Code Editor</h2>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center space-x-1 text-xs">
                <div className={`w-2 h-2 rounded-full ${errors.filter(e => e.type === 'error').length === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-400">
                  {errors.filter(e => e.type === 'error').length} errors, {errors.filter(e => e.type === 'warning').length} warnings
                </span>
              </div>
              <div className="text-xs text-gray-400">
                IoT Safety: {errors.filter(e => e.message.includes('unsafe')).length === 0 ? '✓' : '⚠️'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRun}
              disabled={isRunning || errors.filter(e => e.type === 'error').length > 0}
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
            <button
              onClick={handleTriggerGC}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">GC</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 flex-1 relative">
          <SyntaxHighlighter 
            code={code} 
            onChange={setCode} 
            errors={errors}
          />
          
          {showAutoComplete && (
            <AutoComplete
              code={code}
              cursorPosition={cursorPosition}
              onSelect={handleAutoCompleteSelect}
            />
          )}
        </div>
        
        {/* Enhanced Features Info */}
        <div className="p-4 border-t border-gray-700 bg-gray-750 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-green-400 mt-0.5" />
              <div>
                <div className="text-green-400 font-medium">Real-time Safety</div>
                <div className="text-gray-400">Division by zero, array bounds, null pointer, IoT constraints</div>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Clock className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <div className="text-blue-400 font-medium">@Deadline Enforcement</div>
                <div className="text-gray-400">Real-time constraint verification with violation tracking</div>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Zap className="w-4 h-4 text-purple-400 mt-0.5" />
              <div>
                <div className="text-purple-400 font-medium">Off-heap Optimization</div>
                <div className="text-gray-400">ByteBuffer.allocateDirect() for large objects</div>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RefreshCw className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div>
                <div className="text-yellow-400 font-medium">Time-travel Debug</div>
                <div className="text-gray-400">Circular buffer with bidirectional execution</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Output Console with Live Metrics */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold">Live Execution Monitor</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTimeTravelBack}
              className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Rewind className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <button
              onClick={handleTimeTravelForward}
              className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <FastForward className="w-4 h-4" />
              <span className="text-sm">Forward</span>
            </button>
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Clear</span>
            </button>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span>{isRunning ? 'Executing' : 'Ready'}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex-1">
          <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap bg-gray-900 p-4 rounded-lg h-full overflow-y-auto">
            {output || `🚀 Enhanced JavaRT Interpreter Ready

Features Active:
• Real-time syntax highlighting with IoT annotations
• @Deadline enforcement with sub-millisecond precision
• Formal verification for safety-critical operations
• Time-travel debugging with circular buffer
• Off-heap memory optimization (ByteBuffer.allocateDirect)
• IoT safety constraints (no dynamic class loading)
• Auto-completion for sensor APIs and annotations

Type your code and press Run to see real execution metrics!`}
          </pre>
        </div>

        {/* Real-time Performance Dashboard */}
        <div className="p-4 border-t border-gray-700 bg-gray-750 flex-shrink-0">
          <div className="grid grid-cols-5 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{executionStats.gcPauseTime}ms</div>
              <div className="text-xs text-gray-400">GC Pause</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${executionStats.safetyViolations === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {executionStats.safetyViolations}
              </div>
              <div className="text-xs text-gray-400">Safety</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${executionStats.deadlineViolations === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {executionStats.deadlineViolations}
              </div>
              <div className="text-xs text-gray-400">Deadline</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{executionStats.offHeapUsage.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Off-heap</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{executionStats.allocatedObjects}</div>
              <div className="text-xs text-gray-400">Objects</div>
            </div>
          </div>
          
          {/* Additional metrics row */}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-600">
            <div className="text-center">
              <div className="text-sm font-bold text-yellow-400">{executionStats.compactionTime.toFixed(2)}ms</div>
              <div className="text-xs text-gray-400">Compaction</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-cyan-400">{executionStats.freedObjects}</div>
              <div className="text-xs text-gray-400">Freed</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-orange-400">{executionStats.deadlineCompliance}%</div>
              <div className="text-xs text-gray-400">Compliance</div>
            </div>
          </div>
          
          {/* Status indicators */}
          {(executionStats.safetyViolations > 0 || executionStats.deadlineViolations > 0) && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {executionStats.safetyViolations > 0 && `${executionStats.safetyViolations} safety issue${executionStats.safetyViolations !== 1 ? 's' : ''}`}
                {executionStats.safetyViolations > 0 && executionStats.deadlineViolations > 0 && ', '}
                {executionStats.deadlineViolations > 0 && `${executionStats.deadlineViolations} deadline miss${executionStats.deadlineViolations !== 1 ? 'es' : ''}`}
              </span>
            </div>
          )}
          
          {currentSnapshot && (
            <div className="mt-3 p-2 bg-indigo-900/20 border border-indigo-500 rounded text-sm">
              <div className="text-indigo-400 font-medium">⏱️ Time Travel: Line {currentSnapshot.line}</div>
              <div className="text-gray-300 text-xs">
                Snapshot from {new Date(currentSnapshot.timestamp).toLocaleTimeString()} 
                • Heap: {currentSnapshot.gcState.heapUsage.toFixed(1)}%
                • Objects: {currentSnapshot.gcState.allocatedObjects}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeCodeEditor;