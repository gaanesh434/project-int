import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Clock, TrendingDown, AlertCircle, Play, Pause, Trash2 } from 'lucide-react';
import { JavaInterpreter } from '../interpreter/JavaInterpreter';

interface GCData {
  time: string;
  pauseTime: number;
  heapUsage: number;
  collections: number;
  allocatedObjects: number;
  freedObjects: number;
}

const GCMonitor: React.FC = () => {
  const [gcData, setGcData] = useState<GCData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [interpreter] = useState(() => new JavaInterpreter());
  const [totalCollections, setTotalCollections] = useState(0);
  const [currentHeapUsage, setCurrentHeapUsage] = useState(0);

  // Test code that generates real memory allocation
  const testCode = `
// Memory allocation test
String[] data = new String[100];
int counter = 0;

for (int i = 0; i < 50; i++) {
    String temp = "Memory test " + i + " with data " + (i * 2);
    counter = counter + 1;
    
    int[] numbers = new int[10];
    for (int j = 0; j < 10; j++) {
        numbers[j] = i + j;
    }
    
    if (i % 10 == 0) {
        System.out.println("Allocated " + counter + " objects");
    }
}

System.out.println("Memory allocation test completed");
System.out.println("Total iterations: " + counter);
`;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring) {
      interval = setInterval(() => {
        try {
          interpreter.interpret(testCode);
          
          const metrics = interpreter.getGCMetrics();
          const heapStatus = interpreter.getHeapStatus();
          
          if (metrics.length > 0) {
            const latestMetric = metrics[metrics.length - 1];
            
            const newData: GCData = {
              time: new Date().toLocaleTimeString(),
              pauseTime: parseFloat(latestMetric.pauseTime.toFixed(2)),
              heapUsage: parseFloat(latestMetric.heapUsage.toFixed(1)),
              collections: latestMetric.collections,
              allocatedObjects: latestMetric.allocatedObjects,
              freedObjects: latestMetric.freedObjects,
            };
            
            setGcData(prev => {
              const updated = [...prev, newData].slice(-20);
              return updated;
            });
            
            setTotalCollections(prev => prev + latestMetric.collections);
            setCurrentHeapUsage(heapStatus.percentage);
          }
        } catch (error) {
          console.error('GC monitoring error:', error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, interpreter]);

  const avgPauseTime = gcData.length > 0 
    ? (gcData.reduce((sum, item) => sum + item.pauseTime, 0) / gcData.length).toFixed(2)
    : '0.00';

  const maxPauseTime = gcData.length > 0 
    ? Math.max(...gcData.map(item => item.pauseTime)).toFixed(2)
    : '0.00';

  const totalAllocated = gcData.length > 0 
    ? gcData[gcData.length - 1].allocatedObjects
    : 0;

  const totalFreed = gcData.length > 0 
    ? gcData[gcData.length - 1].freedObjects
    : 0;

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      setGcData([]);
      setTotalCollections(0);
      setCurrentHeapUsage(0);
    }
  };

  const handleManualGC = () => {
    interpreter.triggerGC();
    const metrics = interpreter.getGCMetrics();
    const heapStatus = interpreter.getHeapStatus();
    
    if (metrics.length > 0) {
      const latestMetric = metrics[metrics.length - 1];
      
      const newData: GCData = {
        time: new Date().toLocaleTimeString(),
        pauseTime: parseFloat(latestMetric.pauseTime.toFixed(2)),
        heapUsage: parseFloat(latestMetric.heapUsage.toFixed(1)),
        collections: 1,
        allocatedObjects: latestMetric.allocatedObjects,
        freedObjects: latestMetric.freedObjects,
      };
      
      setGcData(prev => [...prev, newData].slice(-20));
      setTotalCollections(prev => prev + 1);
      setCurrentHeapUsage(heapStatus.percentage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Real-time Garbage Collector</h1>
          <p className="text-gray-400">Live monitoring of JavaRT interpreter GC performance</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualGC}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Trigger GC</span>
          </button>
          
          <button
            onClick={handleToggleMonitoring}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isMonitoring 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">{avgPauseTime}ms</div>
              <div className="text-sm text-gray-400">Avg Pause Time</div>
              <div className="text-xs text-blue-400">Real measurements</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <TrendingDown className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-white">{currentHeapUsage.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Current Heap</div>
              <div className="text-xs text-green-400">Live tracking</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-white">{totalAllocated}</div>
              <div className="text-sm text-gray-400">Objects Allocated</div>
              <div className="text-xs text-purple-400">Runtime count</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-white">{totalCollections}</div>
              <div className="text-sm text-gray-400">GC Collections</div>
              <div className="text-xs text-yellow-400">Total runs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Separate Charts to Fix Overlay Issue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GC Pause Times - Separate Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">GC Pause Times (Real Data)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" label={{ value: 'Pause Time (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB'
                }} 
                formatter={(value) => [`${value}ms`, 'Pause Time']}
              />
              <Line 
                type="monotone" 
                dataKey="pauseTime" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-sm text-gray-400 mt-2">
            {isMonitoring ? 'Live data from JavaRT interpreter execution' : 'Start monitoring to see real GC metrics'}
          </div>
        </div>

        {/* Heap Usage - Separate Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Heap Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" label={{ value: 'Heap Usage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB'
                }} 
                formatter={(value) => [`${value}%`, 'Heap Usage']}
              />
              <Bar dataKey="heapUsage" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-sm text-gray-400 mt-2">
            Memory usage tracked during actual code execution
          </div>
        </div>
      </div>

      {/* Object Allocation Stats */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Memory Allocation Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-green-400">{totalAllocated}</div>
            <div className="text-sm text-gray-400">Total Objects Allocated</div>
            <div className="text-xs text-green-400 mt-1">During monitoring session</div>
          </div>
          
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-red-400">{totalFreed}</div>
            <div className="text-sm text-gray-400">Objects Freed by GC</div>
            <div className="text-xs text-red-400 mt-1">Garbage collected</div>
          </div>
          
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-blue-400">{totalAllocated - totalFreed}</div>
            <div className="text-sm text-gray-400">Live Objects</div>
            <div className="text-xs text-blue-400 mt-1">Currently in memory</div>
          </div>
        </div>
      </div>

      {/* GC Algorithm Details */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Real-time GC Implementation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-md font-medium text-blue-400">Active Features</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real object allocation tracking</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Mark and sweep garbage collection</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Heap usage monitoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Automatic GC triggering at 70% heap</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-md font-medium text-purple-400">Monitoring Capabilities</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Live pause time measurement</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Real-time heap usage tracking</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Object lifecycle monitoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Manual GC triggering for testing</span>
              </li>
            </ul>
          </div>
        </div>
        
        {isMonitoring && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-medium">Live GC Monitoring Active</span>
            </div>
            <div className="text-sm text-gray-300">
              Running memory allocation tests every 2 seconds to generate real GC activity and metrics
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GCMonitor;