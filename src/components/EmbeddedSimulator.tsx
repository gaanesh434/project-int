import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Thermometer, 
  Gauge, 
  Activity, 
  Wifi, 
  Battery, 
  AlertTriangle,
  CheckCircle,
  Cpu
} from 'lucide-react';

interface SensorReading {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  cpuUsage: number;
  memoryUsage: number;
}

const EmbeddedSimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [deadlineViolations, setDeadlineViolations] = useState(0);
  const [systemStatus, setSystemStatus] = useState('idle');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        const now = new Date();
        const newReading: SensorReading = {
          timestamp: now.toLocaleTimeString(),
          temperature: 20 + Math.sin(Date.now() / 10000) * 15 + Math.random() * 5,
          humidity: 50 + Math.cos(Date.now() / 8000) * 20 + Math.random() * 3,
          pressure: 1013 + Math.sin(Date.now() / 15000) * 10 + Math.random() * 2,
          cpuUsage: 15 + Math.random() * 25,
          memoryUsage: 30 + Math.random() * 15,
        };

        setSensorData(prev => [...prev.slice(-19), newReading]);
        
        // Simulate deadline checks
        if (Math.random() < 0.05) { // 5% chance of violation
          setDeadlineViolations(prev => prev + 1);
        }

        setSystemStatus('running');
      }, 1000);
    } else {
      setSystemStatus('idle');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const currentReading = sensorData[sensorData.length - 1];

  const deviceSpecs = [
    { name: 'Raspberry Pi 4', cpu: 'ARM Cortex-A72', memory: '4GB', storage: '32GB SD' },
    { name: 'Arduino ESP32', cpu: 'Xtensa LX6', memory: '520KB', storage: '4MB Flash' },
    { name: 'BeagleBone Black', cpu: 'ARM Cortex-A8', memory: '512MB', storage: '4GB eMMC' },
    { name: 'Jetson Nano', cpu: 'ARM Cortex-A57', memory: '4GB', storage: '16GB eMMC' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IoT Embedded Simulator</h1>
          <p className="text-gray-400">Real-time Java execution on embedded systems</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-gray-300">{systemStatus}</span>
          </div>
          
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isRunning 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isRunning ? 'Stop Simulation' : 'Start Simulation'}
          </button>
        </div>
      </div>

      {/* Current Sensor Readings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Thermometer className="w-8 h-8 text-red-400" />
            <div>
              <div className="text-2xl font-bold text-white">
                {currentReading ? `${currentReading.temperature.toFixed(1)}°C` : '--'}
              </div>
              <div className="text-sm text-gray-400">Temperature</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Gauge className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">
                {currentReading ? `${currentReading.humidity.toFixed(1)}%` : '--'}
              </div>
              <div className="text-sm text-gray-400">Humidity</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-white">
                {currentReading ? `${currentReading.pressure.toFixed(0)} hPa` : '--'}
              </div>
              <div className="text-sm text-gray-400">Pressure</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Cpu className="w-6 h-6 text-purple-400" />
            <div>
              <div className="text-lg font-bold text-white">
                {currentReading ? `${currentReading.cpuUsage.toFixed(1)}%` : '0%'}
              </div>
              <div className="text-sm text-gray-400">CPU Usage</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Battery className="w-6 h-6 text-green-400" />
            <div>
              <div className="text-lg font-bold text-white">
                {currentReading ? `${currentReading.memoryUsage.toFixed(1)}%` : '0%'}
              </div>
              <div className="text-sm text-gray-400">Memory</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-lg font-bold text-white">0.3ms</div>
              <div className="text-sm text-gray-400">Avg Latency</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <AlertTriangle className={`w-6 h-6 ${deadlineViolations > 0 ? 'text-red-400' : 'text-green-400'}`} />
            <div>
              <div className="text-lg font-bold text-white">{deadlineViolations}</div>
              <div className="text-sm text-gray-400">Violations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Environmental Sensors</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB'
                }} 
              />
              <Line type="monotone" dataKey="temperature" stroke="#EF4444" strokeWidth={2} name="Temperature" />
              <Line type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={2} name="Humidity" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">System Resources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB'
                }} 
              />
              <Line type="monotone" dataKey="cpuUsage" stroke="#8B5CF6" strokeWidth={2} name="CPU %" />
              <Line type="monotone" dataKey="memoryUsage" stroke="#10B981" strokeWidth={2} name="Memory %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Specifications */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Supported Embedded Platforms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {deviceSpecs.map((device, index) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">{device.name}</h4>
              <div className="space-y-1 text-sm text-gray-300">
                <div>CPU: {device.cpu}</div>
                <div>Memory: {device.memory}</div>
                <div>Storage: {device.storage}</div>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-400">Compatible</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Example */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Embedded Java Code</h3>
        <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`@Deadline(ms=5)
public class IoTSensorNode {
    private SensorArray sensors;
    private NetworkInterface network;
    
    @Deadline(ms=2)
    public SensorReading[] collectData() {
        SensorReading[] readings = new SensorReading[3];
        readings[0] = sensors.readTemperature();
        readings[1] = sensors.readHumidity();
        readings[2] = sensors.readPressure();
        return readings;
    }
    
    @Deadline(ms=3)
    public void transmitData(SensorReading[] readings) {
        for (SensorReading reading : readings) {
            if (reading.isAbnormal()) {
                network.sendAlert(reading);
            } else {
                network.sendData(reading);
            }
        }
    }
    
    // Main sensor loop with real-time constraints
    public void run() {
        while (true) {
            SensorReading[] data = collectData();
            transmitData(data);
            sleep(1000); // 1Hz sampling
        }
    }
}`}
        </pre>
      </div>
    </div>
  );
};

export default EmbeddedSimulator;