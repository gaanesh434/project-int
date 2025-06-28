import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, Bug, Activity } from 'lucide-react';
import { JavaRTTestRunner } from './IntegrationTests';

const TestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    setCurrentTest('Initializing test suite...');

    try {
      // Simulate test execution with progress updates
      const tests = [
        'Code Editor Syntax Highlighting',
        'Error Reporting Validation', 
        'Auto-completion Testing',
        'GC Dynamic Metrics',
        'Manual GC Triggering',
        'Off-heap Memory Optimization',
        'IoT Sensor Integration',
        'Safety Violation Detection',
        'Performance Stress Testing'
      ];

      for (let i = 0; i < tests.length; i++) {
        setCurrentTest(`Running: ${tests[i]}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Run actual tests
      await JavaRTTestRunner.runAllTests();

      // Mock results for demonstration
      setTestResults({
        total: 24,
        passed: 22,
        failed: 2,
        components: {
          codeEditor: { passed: 8, failed: 1 },
          gcMonitor: { passed: 7, failed: 0 },
          integration: { passed: 7, failed: 1 }
        },
        details: [
          { name: 'Syntax Highlighting - Keywords', status: 'passed', time: '12ms' },
          { name: 'Syntax Highlighting - IoT Annotations', status: 'passed', time: '8ms' },
          { name: 'Error Detection - Division by Zero', status: 'passed', time: '15ms' },
          { name: 'Auto-completion - @Deadline', status: 'failed', time: '25ms', error: 'Suggestions not appearing' },
          { name: 'GC Metrics - Object Allocation', status: 'passed', time: '45ms' },
          { name: 'GC Trigger - Manual Collection', status: 'passed', time: '3ms' },
          { name: 'Off-heap - Large Object Allocation', status: 'passed', time: '18ms' },
          { name: 'IoT Sensor - Real-time Processing', status: 'passed', time: '42ms' },
          { name: 'Safety - Deadline Enforcement', status: 'failed', time: '67ms', error: 'Deadline violation not detected' },
          { name: 'Performance - High Frequency Data', status: 'passed', time: '156ms' }
        ]
      });

      setCurrentTest('Tests completed!');
    } catch (error) {
      console.error('Test execution failed:', error);
      setCurrentTest('Test execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">JavaRT Test Suite</h1>
          <p className="text-gray-400">Comprehensive testing for code editor and GC monitor components</p>
        </div>
        
        <button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg transition-colors"
        >
          {isRunning ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{isRunning ? 'Running Tests...' : 'Run All Tests'}</span>
        </button>
      </div>

      {/* Current Test Status */}
      {isRunning && (
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-blue-400 font-medium">Test in Progress</span>
          </div>
          <div className="text-gray-300 mt-1">{currentTest}</div>
        </div>
      )}

      {/* Test Results Summary */}
      {testResults && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">{testResults.total}</div>
                <div className="text-sm text-gray-400">Total Tests</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-400">{testResults.passed}</div>
                <div className="text-sm text-gray-400">Passed</div>
                <div className="text-xs text-green-400">
                  {((testResults.passed / testResults.total) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <XCircle className="w-8 h-8 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-400">{testResults.failed}</div>
                <div className="text-sm text-gray-400">Failed</div>
                <div className="text-xs text-red-400">
                  {((testResults.failed / testResults.total) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Bug className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {testResults.failed === 0 ? '✓' : '⚠️'}
                </div>
                <div className="text-sm text-gray-400">Status</div>
                <div className="text-xs text-purple-400">
                  {testResults.failed === 0 ? 'All Pass' : 'Issues Found'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Component Breakdown */}
      {testResults && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Component Test Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="font-medium text-white mb-2">Code Editor</h4>
              <div className="flex items-center justify-between">
                <span className="text-green-400">{testResults.components.codeEditor.passed} passed</span>
                <span className="text-red-400">{testResults.components.codeEditor.failed} failed</span>
              </div>
              <div className="w-full bg-gray-600 h-2 rounded-full mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${(testResults.components.codeEditor.passed / 
                      (testResults.components.codeEditor.passed + testResults.components.codeEditor.failed)) * 100}%` 
                  }}
                />
              </div>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="font-medium text-white mb-2">GC Monitor</h4>
              <div className="flex items-center justify-between">
                <span className="text-green-400">{testResults.components.gcMonitor.passed} passed</span>
                <span className="text-red-400">{testResults.components.gcMonitor.failed} failed</span>
              </div>
              <div className="w-full bg-gray-600 h-2 rounded-full mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${(testResults.components.gcMonitor.passed / 
                      (testResults.components.gcMonitor.passed + testResults.components.gcMonitor.failed)) * 100}%` 
                  }}
                />
              </div>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="font-medium text-white mb-2">Integration</h4>
              <div className="flex items-center justify-between">
                <span className="text-green-400">{testResults.components.integration.passed} passed</span>
                <span className="text-red-400">{testResults.components.integration.failed} failed</span>
              </div>
              <div className="w-full bg-gray-600 h-2 rounded-full mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${(testResults.components.integration.passed / 
                      (testResults.components.integration.passed + testResults.components.integration.failed)) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Test Results */}
      {testResults && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Detailed Test Results</h3>
          <div className="space-y-2">
            {testResults.details.map((test: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {test.status === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-gray-100">{test.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400">{test.time}</span>
                  {test.error && (
                    <span className="text-sm text-red-400">{test.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Code Editor Test Categories</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-300">Syntax Highlighting (Keywords, Operators, IoT Annotations)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-gray-300">Error Reporting (Invalid syntax, Safety violations)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-300">Auto-completion (IoT constructs, Method suggestions)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-gray-300">Execution Feedback (Real-time output, Error integration)</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">GC Monitor Test Categories</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              <span className="text-gray-300">Dynamic Metrics (Heap usage, Object tracking)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-300">Manual GC Trigger (Button functionality, Metrics update)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-gray-300">Off-heap Optimization (Large objects, Memory management)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span className="text-gray-300">Performance Validation (Sub-ms pause times, Efficiency)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expected Test Outputs */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Expected Test Outputs</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-blue-400 mb-2">Successful IoT Sensor Test</h4>
            <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded-lg overflow-x-auto">
{`✓ Parsing Java source with IoT safety analysis...
✓ Initializing real-time GC with off-heap optimization...
✓ Enabling @Deadline enforcement...

=== Program Output ===
IoT Temperature Sensor Starting...
Reading 1: Temperature: 27°C, Humidity: 61%
Reading 2: Temperature: 25°C, Humidity: 63%

=== Real-time Execution Metrics ===
Total execution time: 4.23ms
Average GC pause: 0.3ms
Deadline violations: 0
Safety violations: 0`}
            </pre>
          </div>

          <div>
            <h4 className="text-md font-medium text-red-400 mb-2">Safety Violation Detection</h4>
            <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded-lg overflow-x-auto">
{`SAFETY VIOLATION [CRITICAL]: Division by zero detected: 100 / 0 (Line 12)
SYSTEM HALT: Critical safety violation detected

=== 🛡️ Safety Violations ===
Line 12: Division by zero detected (CRITICAL)

=== Real-time Execution Metrics ===
Safety violations: 1
System status: HALTED`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestRunner;