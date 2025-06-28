import React, { useState, useEffect } from 'react';

interface AutoCompleteProps {
  code: string;
  cursorPosition: number;
  onSelect: (suggestion: string) => void;
}

interface Suggestion {
  text: string;
  type: 'keyword' | 'annotation' | 'method' | 'variable';
  description: string;
}

export const AutoComplete: React.FC<AutoCompleteProps> = ({ code, cursorPosition, onSelect }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const iotSuggestions: Suggestion[] = [
    { text: '@Deadline(ms=)', type: 'annotation', description: 'Real-time deadline constraint' },
    { text: '@Sensor(type="temperature")', type: 'annotation', description: 'Sensor data annotation' },
    { text: '@SafetyCheck', type: 'annotation', description: 'Enable safety verification' },
    { text: '@RealTime', type: 'annotation', description: 'Real-time execution requirement' },
    { text: 'sensorRead()', type: 'method', description: 'Read sensor data with deadline' },
    { text: 'dataTransmit()', type: 'method', description: 'Transmit data with timing constraints' },
    { text: 'processData()', type: 'method', description: 'Process sensor data' },
    { text: 'System.out.println()', type: 'method', description: 'Print output to console' },
    { text: 'Math.random()', type: 'method', description: 'Generate random number' },
    { text: 'Math.floor()', type: 'method', description: 'Floor function' },
    { text: 'int temperature', type: 'variable', description: 'Temperature sensor variable' },
    { text: 'int humidity', type: 'variable', description: 'Humidity sensor variable' },
    { text: 'boolean isActive', type: 'variable', description: 'System active status' },
    { text: 'String message', type: 'variable', description: 'Message string variable' }
  ];

  useEffect(() => {
    const currentWord = getCurrentWord(code, cursorPosition);
    if (currentWord.length > 0) {
      const filtered = iotSuggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(currentWord.toLowerCase())
      );
      setSuggestions(filtered);
      setIsVisible(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setIsVisible(false);
    }
  }, [code, cursorPosition]);

  const getCurrentWord = (text: string, position: number): string => {
    const beforeCursor = text.substring(0, position);
    const match = beforeCursor.match(/[@\w]*$/);
    return match ? match[0] : '';
  };

  const handleSelect = (suggestion: Suggestion) => {
    onSelect(suggestion.text);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-w-sm">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`p-3 cursor-pointer border-b border-gray-700 last:border-b-0 ${
            index === selectedIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
          }`}
          onClick={() => handleSelect(suggestion)}
        >
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded ${
              suggestion.type === 'annotation' ? 'bg-purple-600' :
              suggestion.type === 'method' ? 'bg-blue-600' :
              suggestion.type === 'keyword' ? 'bg-green-600' : 'bg-yellow-600'
            }`}>
              {suggestion.type}
            </span>
            <span className="font-mono text-sm text-white">{suggestion.text}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">{suggestion.description}</div>
        </div>
      ))}
    </div>
  );
};