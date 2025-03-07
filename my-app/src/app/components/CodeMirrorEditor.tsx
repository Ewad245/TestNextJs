'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Socket } from 'socket.io-client';

interface CodeMirrorEditorProps {
  socket: Socket | null;
  initialCode: string;
  onCodeChange: (code: string) => void;
  cpuOutput: string | null;
  connected: boolean;
}

export default function CodeMirrorEditor({
  socket,
  initialCode,
  onCodeChange,
  cpuOutput,
  connected
}: CodeMirrorEditorProps) {
  const [code, setCode] = useState<string>(initialCode);
  const [userInput, setUserInput] = useState<string>('');
  const [outputHistory, setOutputHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local code state and propagate changes to parent
  const handleCodeChange = (value: string) => {
    setCode(value);
    onCodeChange(value);
  };

  // Handle user input submission
  const handleInputSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && userInput.trim() && socket && connected) {
      // Send the input to the CPU via WebSocket
      socket.emit('user_input', { input: userInput });
      
      // Add the input to the output history
      setOutputHistory(prev => [...prev, `> ${userInput}`]);
      
      // Clear the input field
      setUserInput('');
    }
  };

  // Update output history when CPU output changes
  useEffect(() => {
    if (cpuOutput && !outputHistory.includes(cpuOutput)) {
      setOutputHistory(prev => [...prev, cpuOutput]);
    }
  }, [cpuOutput, outputHistory]);

  // Focus the input field when connected
  useEffect(() => {
    if (connected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [connected]);

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-4xl">
      {/* Left side - Code Editor */}
      <div className="w-full md:w-1/2">
        <div className="mb-2 text-sm font-medium">C Code Editor</div>
        <div className="border border-gray-300 rounded-md overflow-hidden">
          <CodeMirror
            value={code}
            height="400px"
            onChange={handleCodeChange}
            extensions={[cpp()]}
            theme={vscodeDark}
          />
        </div>
      </div>

      {/* Right side - CPU Output and Input */}
      <div className="w-full md:w-1/2">
        <div className="mb-2 text-sm font-medium">RV32I CPU Output</div>
        <div className="h-[350px] border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700 p-3 overflow-y-auto font-mono text-xs">
          {outputHistory.length > 0 ? (
            outputHistory.map((output, index) => (
              <div key={index} className={output.startsWith('> ') ? 'text-blue-600 dark:text-blue-400' : ''}>
                {output}
              </div>
            ))
          ) : (
            <div className="text-gray-500 dark:text-gray-400">No output yet. Run your code to see results here.</div>
          )}
        </div>

        {/* Input field */}
        <div className="mt-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleInputSubmit}
            placeholder="Type input and press Enter to send to CPU..."
            disabled={!connected}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs"
          />
          <div className="absolute right-2 top-2 text-xs text-gray-500">
            {connected ? 'Press Enter to send' : 'Connect to CPU first'}
          </div>
        </div>
      </div>
    </div>
  );
}