import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Rewind, 
  FastForward,
  Bookmark,
  Clock,
  Bug
} from 'lucide-react';

interface DebugState {
  id: number;
  timestamp: string;
  line: number;
  variables: Record<string, any>;
  stackTrace: string[];
  heap: { allocated: number; used: number };
}

const TimeTravelDebugger: React.FC = () => {
  const [states, setStates] = useState<DebugState[]>([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [checkpoints, setCheckpoints] = useState<number[]>([]);

  // Mock execution states
  const mockStates: DebugState[] = [
    {
      id: 0,
      timestamp: '14:32:10.001',
      line: 8,
      variables: { temperature: 0, isActive: true },
      stackTrace: ['IoTSensor.readTemperature():8', 'IoTSensor.processData():15'],
      heap: { allocated: 1024, used: 256 }
    },
    {
      id: 1,
      timestamp: '14:32:10.003',
      line: 10,
      variables: { temperature: 42, isActive: true },
      stackTrace: ['IoTSensor.simulateReading():10', 'IoTSensor.readTemperature():8'],
      heap: { allocated: 1024, used: 312 }
    },
    {
      id: 2,
      timestamp: '14:32:10.004',
      line: 8,
      variables: { temperature: 42, isActive: true },
      stackTrace: ['IoTSensor.readTemperature():8', 'IoTSensor.processData():15'],
      heap: { allocated: 1024, used: 298 }
    },
    {
      id: 3,
      timestamp: '14:32:10.006',
      line: 16,
      variables: { temperature: 87, isActive: true, temp: 87 },
      stackTrace: ['IoTSensor.processData():16'],
      heap: { allocated: 1024, used: 345 }
    },
    {
      id: 4,
      timestamp: '14:32:10.007',
      line: 18,
      variables: { temperature: 87, isActive: true, temp: 87 },
      stackTrace: ['IoTSensor.triggerAlert():18', 'IoTSensor.processData():16'],
      heap: { allocated: 1024, used: 378 }
    }
  ];

  useEffect(() => {
    if (isRecording && !isReplaying) {
      const interval = setInterval(() => {
        const nextState = mockStates[states.length % mockStates.length];
        if (nextState) {
          const newState = {
            ...nextState,
            id: states.length,
            timestamp: new Date().toLocaleTimeString()
          };
          setStates(prev => [...prev, newState]);
          setCurrentStateIndex(states.length);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isRecording, isReplaying, states.length]);

  const currentState = states[currentStateIndex];

  const handleStepBack = () => {
    if (currentStateIndex > 0) {
      setCurrentStateIndex(currentStateIndex - 1);
    }
  };

  const handleStepForward = () => {
    if (currentStateIndex < states.length - 1) {
      setCurrentStateIndex(currentStateIndex + 1);
    }
  };

  const handleReplay = (steps: number) => {
    setIsReplaying(true);
    let step = 0;
    const replayInterval = setInterval(() => {
      if (step < steps && currentStateIndex + step < states.length - 1) {
        setCurrentStateIndex(prev => prev + 1);
        step++;
      } else {
        clearInterval(replayInterval);
        setIsReplaying(false);
      }
    }, 800);
  };

  const addCheckpoint = () => {
    if (!checkpoints.includes(currentStateIndex)) {
      setCheckpoints([...checkpoints, currentStateIndex]);
    }
  };

  const jumpToCheckpoint = (checkpointIndex: number) => {
    setCurrentStateIndex(checkpointIndex);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Time-travel Debugger</h1>
          <p className="text-gray-400">Debug race conditions with time-travel capabilities</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
          </button>
        </div>
      </div>

      {/* Debug Controls */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Debug Controls</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>State {currentStateIndex + 1} of {states.length}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button
            onClick={() => setCurrentStateIndex(0)}
            disabled={currentStateIndex === 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <Rewind className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleStepBack}
            disabled={currentStateIndex === 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => handleReplay(3)}
            disabled={isReplaying || currentStateIndex >= states.length - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Replay 3</span>
          </button>
          
          <button
            onClick={handleStepForward}
            disabled={currentStateIndex >= states.length - 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setCurrentStateIndex(states.length - 1)}
            disabled={currentStateIndex >= states.length - 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <FastForward className="w-5 h-5" />
          </button>
          
          <button
            onClick={addCheckpoint}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          >
            <Bookmark className="w-4 h-4" />
            <span>Checkpoint</span>
          </button>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="w-full bg-gray-700 h-2 rounded-full">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${states.length > 0 ? ((currentStateIndex + 1) / states.length) * 100 : 0}%` }}
            />
          </div>
          
          {/* Checkpoints */}
          <div className="absolute top-0 w-full h-2">
            {checkpoints.map((checkpoint) => (
              <button
                key={checkpoint}
                onClick={() => jumpToCheckpoint(checkpoint)}
                className="absolute w-4 h-4 bg-purple-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-1 hover:bg-purple-400 transition-colors"
                style={{ left: `${((checkpoint + 1) / states.length) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Current State */}
      {currentState && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variables & Stack */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Variables</h3>
              <div className="space-y-2">
                {Object.entries(currentState.variables).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded-lg">
                    <span className="text-blue-400 font-mono">{key}</span>
                    <span className="text-gray-100 font-mono">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Stack Trace</h3>
              <div className="space-y-2">
                {currentState.stackTrace.map((frame, index) => (
                  <div key={index} className="py-2 px-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-100 font-mono text-sm">{frame}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* State Info & Heap */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">State Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Timestamp</div>
                  <div className="text-lg font-mono text-white">{currentState.timestamp}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Current Line</div>
                  <div className="text-lg font-mono text-white">Line {currentState.line}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Heap Status</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Memory Usage</span>
                    <span className="text-white">{currentState.heap.used}/{currentState.heap.allocated} bytes</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentState.heap.used / currentState.heap.allocated) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-sm text-gray-400">
                  Real-time GC maintaining sub-millisecond pauses
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commands */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Debug Commands</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-mono text-blue-400">step_back</div>
            <div className="text-gray-400">Go back one execution step</div>
          </div>
          <div className="space-y-2">
            <div className="font-mono text-blue-400">replay 5</div>
            <div className="text-gray-400">Replay next 5 steps automatically</div>
          </div>
          <div className="space-y-2">
            <div className="font-mono text-blue-400">checkpoint</div>
            <div className="text-gray-400">Mark current state for quick return</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTravelDebugger;