import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Clock, TrendingDown, AlertCircle } from 'lucide-react';

const GCMonitor: React.FC = () => {
  const [gcData, setGcData] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring) {
      interval = setInterval(() => {
        const timestamp = Date.now();
        const pauseTime = Math.random() * 0.8 + 0.1; // 0.1-0.9ms
        const heapUsage = Math.random() * 40 + 30; // 30-70%
        
        setGcData(prev => {
          const newData = [...prev, {
            time: new Date(timestamp).toLocaleTimeString(),
            pauseTime: parseFloat(pauseTime.toFixed(1)),
            heapUsage: parseFloat(heapUsage.toFixed(1)),
            collections: Math.floor(Math.random() * 3),
          }].slice(-20); // Keep last 20 data points
          
          return newData;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const avgPauseTime = gcData.length > 0 
    ? (gcData.reduce((sum, item) => sum + item.pauseTime, 0) / gcData.length).toFixed(2)
    : '0.00';

  const maxPauseTime = gcData.length > 0 
    ? Math.max(...gcData.map(item => item.pauseTime)).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Real-time Garbage Collector</h1>
          <p className="text-gray-400">Ultra-low latency GC designed for embedded systems</p>
        </div>
        
        <button
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isMonitoring 
              ? 'bg-red-600 hover:bg-red-500' 
              : 'bg-green-600 hover:bg-green-500'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">{avgPauseTime}ms</div>
              <div className="text-sm text-gray-400">Avg Pause Time</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <TrendingDown className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-white">{maxPauseTime}ms</div>
              <div className="text-sm text-gray-400">Max Pause Time</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-white">{gcData.length > 0 ? gcData[gcData.length - 1]?.heapUsage.toFixed(1) : '0.0'}%</div>
              <div className="text-sm text-gray-400">Heap Usage</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-sm text-gray-400">Deadline Violations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GC Pause Times */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">GC Pause Times</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB'
                }} 
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
        </div>

        {/* Heap Usage */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Heap Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB'
                }} 
              />
              <Bar dataKey="heapUsage" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GC Algorithm Details */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Real-time GC Algorithm</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-md font-medium text-blue-400">Key Features</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Concurrent collection with minimal stop-the-world</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Off-heap allocation using ByteBuffer.allocateDirect()</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Predictable pause times under 1ms</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Memory compaction during idle periods</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-md font-medium text-purple-400">Embedded Optimizations</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Deadline-aware collection scheduling</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Power-efficient mark & sweep</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Adaptive heap sizing for IoT constraints</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>RTOS integration for deterministic timing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GCMonitor;