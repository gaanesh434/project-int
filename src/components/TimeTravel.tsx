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
import { JavaInterpreter, ExecutionState } from '../interpreter/JavaInterpreter';

const TimeTravelDebugger: React.FC = () => {
  const [states, setStates] = useState<ExecutionState[]>([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [checkpoints, setCheckpoints] = useState<number[]>([]);
  const [interpreter] = useState(() => new JavaInterpreter());

  const debugCode = `
public class DebugExample {
    private int counter = 0;
    private boolean flag = true;
    
    public void debugMethod() {
        for (int i = 0; i < 5; i++) {
            counter = counter + i;
            if (counter > 6) {
                flag = false;
                System.out.println("Counter exceeded: " + counter);
            }
        }
        
        if (flag) {
            System.out.println("Flag is still true");
        } else {
            System.out.println("Flag was set to false");
        }
    }
}`;

  useEffect(() => {
    if (isRecording && !isReplaying) {
      const interval = setInterval(() => {
        // Execute the debug code to generate execution states
        const result = interpreter.interpret(debugCode);
        const newStates = interpreter.getExecutionStates();
        
        if (newStates.length > states.length) {
          setStates([...newStates]);
          setCurrentStateIndex(newStates.length - 1);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isRecording, isReplaying, interpreter, states.length]);

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
    const startIndex = currentStateIndex;
    
    const replayInterval = setInterval(() => {
      if (step < steps && startIndex + step < states.length - 1) {
        setCurrentStateIndex(startIndex + step + 1);
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

  const handleStartRecording = () => {
    setIsRecording(true);
    setStates([]);
    setCurrentStateIndex(0);
    setCheckpoints([]);
    
    // Start with initial execution
    const result = interpreter.interpret(debugCode);
    const initialStates = interpreter.getExecutionStates();
    setStates(initialStates);
    if (initialStates.length > 0) {
      setCurrentStateIndex(0);
    }
  };

  const formatVariables = (variables: Map<string, any>) => {
    const obj: { [key: string]: any } = {};
    variables.forEach((value, key) => {
      obj[key] = value.value !== undefined ? value.value : value;
    });
    return obj;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Time-travel Debugger</h1>
          <p className="text-gray-400">Debug with real execution state capture and replay</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (isRecording) {
                setIsRecording(false);
              } else {
                handleStartRecording();
              }
            }}
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
            disabled={currentStateIndex === 0 || states.length === 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <Rewind className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleStepBack}
            disabled={currentStateIndex === 0 || states.length === 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => handleReplay(3)}
            disabled={isReplaying || currentStateIndex >= states.length - 1 || states.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Replay 3</span>
          </button>
          
          <button
            onClick={handleStepForward}
            disabled={currentStateIndex >= states.length - 1 || states.length === 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setCurrentStateIndex(states.length - 1)}
            disabled={currentStateIndex >= states.length - 1 || states.length === 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            <FastForward className="w-5 h-5" />
          </button>
          
          <button
            onClick={addCheckpoint}
            disabled={states.length === 0}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg transition-colors"
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
                style={{ left: `${states.length > 0 ? ((checkpoint + 1) / states.length) * 100 : 0}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Current State */}
      {currentState ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variables & Stack */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Variables</h3>
              <div className="space-y-2">
                {Object.entries(formatVariables(currentState.variables)).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded-lg">
                    <span className="text-blue-400 font-mono">{key}</span>
                    <span className="text-gray-100 font-mono">{JSON.stringify(value)}</span>
                  </div>
                ))}
                {Object.keys(formatVariables(currentState.variables)).length === 0 && (
                  <div className="text-gray-400 text-sm">No variables in current scope</div>
                )}
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
                {currentState.stackTrace.length === 0 && (
                  <div className="text-gray-400 text-sm">No stack frames</div>
                )}
              </div>
            </div>
          </div>

          {/* State Info */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">State Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Timestamp</div>
                  <div className="text-lg font-mono text-white">
                    {new Date(currentState.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Current Line</div>
                  <div className="text-lg font-mono text-white">Line {currentState.line}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Debug Code</h3>
              <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-64">
                {debugCode}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-center text-gray-400">
            <Bug className="w-12 h-12 mx-auto mb-4" />
            <p>No execution states captured yet.</p>
            <p className="text-sm mt-2">Click "Start Recording" to begin capturing execution states.</p>
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
            <div className="font-mono text-blue-400">replay 3</div>
            <div className="text-gray-400">Replay next 3 steps automatically</div>
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