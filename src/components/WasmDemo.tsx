import React, { useState, useEffect } from 'react';
import { Zap, Play, DownloadCloud, CheckCircle, Clock, Code } from 'lucide-react';

const WasmDemo: React.FC = () => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationComplete, setCompilationComplete] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
  const [wasmSize, setWasmSize] = useState('0 KB');

  const javaCode = `public class MatrixMultiply {
    @Deadline(ms=100)
    public static double[][] multiply(double[][] a, double[][] b) {
        int n = a.length;
        double[][] result = new double[n][n];
        
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                for (int k = 0; k < n; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }
        return result;
    }
}`;

  const handleCompileToWasm = () => {
    setIsCompiling(true);
    setCompilationComplete(false);
    
    // Simulate compilation process
    setTimeout(() => {
      setWasmSize('24.5 KB');
      setTimeout(() => {
        setIsCompiling(false);
        setCompilationComplete(true);
        setBenchmarkResults({
          javaWasm: 1.2,
          javascript: 1.6,
          hotspot: 0.8,
          wasmSize: '24.5 KB'
        });
      }, 1000);
    }, 2000);
  };

  const handleRunBenchmark = () => {
    // Simulate benchmark execution
    setBenchmarkResults({
      javaWasm: 1.2 + (Math.random() - 0.5) * 0.1,
      javascript: 1.6 + (Math.random() - 0.5) * 0.2,
      hotspot: 0.8 + (Math.random() - 0.5) * 0.05,
      wasmSize: '24.5 KB'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">WebAssembly Compilation</h1>
          <p className="text-gray-400">Compile Java to WebAssembly for browser execution</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCompileToWasm}
            disabled={isCompiling}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            {isCompiling ? <DownloadCloud className="w-4 h-4 animate-bounce" /> : <Zap className="w-4 h-4" />}
            <span>{isCompiling ? 'Compiling...' : 'Compile to WASM'}</span>
          </button>
        </div>
      </div>

      {/* Code & Compilation Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Java Source */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Java Source Code</h3>
          <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap bg-gray-900 p-4 rounded-lg overflow-x-auto">
            {javaCode}
          </pre>
        </div>

        {/* Compilation Status */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Compilation Status</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isCompiling ? 'bg-yellow-500 animate-pulse' : compilationComplete ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span className="text-gray-300">TeaVM Java → WASM</span>
              {compilationComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${compilationComplete ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span className="text-gray-300">WASM Optimization</span>
              {compilationComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${compilationComplete ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span className="text-gray-300">Browser Integration</span>
              {compilationComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
          </div>

          {compilationComplete && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-400 font-medium">Compilation Successful</span>
              </div>
              <div className="text-sm text-gray-300">
                Generated WASM module: {wasmSize}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Results */}
      {benchmarkResults && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Performance Benchmarks</h3>
            <button
              onClick={handleRunBenchmark}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Run Benchmark</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{benchmarkResults.javaWasm.toFixed(1)}s</div>
              <div className="text-sm text-gray-400">Java → WASM</div>
              <div className="text-xs text-green-400 mt-1">25% faster than JS</div>
            </div>
            
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{benchmarkResults.javascript.toFixed(1)}s</div>
              <div className="text-sm text-gray-400">Pure JavaScript</div>
              <div className="text-xs text-gray-400 mt-1">Baseline performance</div>
            </div>
            
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{benchmarkResults.hotspot.toFixed(1)}s</div>
              <div className="text-sm text-gray-400">HotSpot JVM</div>
              <div className="text-xs text-green-400 mt-1">50% faster (native)</div>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            Matrix multiplication (1000×1000) - Lower is better. Benchmark run in Chrome on desktop.
          </div>
        </div>
      )}

      {/* WASM Integration Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Browser Integration</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Code className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-400">JavaScript Bridge</div>
                <div className="text-xs text-gray-400 mt-1">
                  Seamless interop between WASM and browser APIs
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-green-400">Real-time Performance</div>
                <div className="text-xs text-gray-400 mt-1">
                  @Deadline annotations enforced in browser environment
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-purple-400">Memory Management</div>
                <div className="text-xs text-gray-400 mt-1">
                  Shared memory between WASM and JavaScript heap
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Use Cases</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="font-medium text-white">Edge Computing</div>
              <div className="text-gray-400">Run Java algorithms in CDN edge nodes</div>
            </div>
            
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="font-medium text-white">Scientific Computing</div>
              <div className="text-gray-400">Matrix operations and numerical analysis</div>
            </div>
            
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="font-medium text-white">Game Development</div>
              <div className="text-gray-400">High-performance game logic in browsers</div>
            </div>
            
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="font-medium text-white">IoT Dashboards</div>
              <div className="text-gray-400">Real-time data processing in web interfaces</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WasmDemo;