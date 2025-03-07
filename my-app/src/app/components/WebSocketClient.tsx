'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import CodeMirrorEditor from './CodeMirrorEditor';

interface WebSocketClientProps {
  folderName: string | null;
  makeSuccess: boolean;
}

interface WebSocketStatus {
  connected: boolean;
  message: string;
  cpuOutput: string | null;
  error: string | null;
};

export default function WebSocketClient({ folderName, makeSuccess }: WebSocketClientProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    message: 'Not connected',
    cpuOutput: null,
    error: null
  });
  const [code, setCode] = useState<string>('// Enter your C code here\n\nint main() {\n  printf("Hello, RV32I CPU!\n");\n  return 0;\n}');

  // Connect to WebSocket and send ELF file
  const connectAndSendElf = useCallback(async () => {
    if (!folderName || !makeSuccess) return;

    try {
      // First, get the ELF file info from our API
      setStatus(prev => ({ ...prev, message: 'Fetching ELF file information...' }));
      
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folderName })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setStatus(prev => ({
          ...prev,
          message: 'Failed to get ELF file',
          error: data.message
        }));
        return;
      }
      
      // Now connect to the WebSocket server
      setStatus(prev => ({ ...prev, message: 'Connecting to RV32I CPU...' }));
      
      const newSocket = io(data.wsUrl);
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
        setStatus(prev => ({
          ...prev,
          connected: true,
          message: 'Connected to RV32I CPU. Sending ELF file...'
        }));
        
        // Emit an event to send the ELF file with binary data
        // Convert the base64 string back to binary data for transmission
        const binaryData = Buffer.from(data.elfData, 'base64');
        
        // Send the binary data along with file information
        newSocket.emit('send_elf', { 
          folderName: data.folderName, 
          fileName: data.elfFileName,
          elfData: binaryData // Send the actual binary data
        });
      });
      
      newSocket.on('elf_received', () => {
        setStatus(prev => ({
          ...prev,
          message: 'ELF file received by CPU. Executing program...'
        }));
      });
      
      newSocket.on('execution_result', (result) => {
        setStatus(prev => ({
          ...prev,
          message: 'Execution completed',
          cpuOutput: result.output || 'No output from CPU'
        }));
      });
      
      // Listen for CPU output during execution
      newSocket.on('cpu_output', (data) => {
        setStatus(prev => ({
          ...prev,
          cpuOutput: data.output || 'Output from CPU'
        }));
      });
      
      // Listen for input request from CPU
      newSocket.on('input_request', () => {
        setStatus(prev => ({
          ...prev,
          message: 'CPU is waiting for input...'
        }));
      });
      
      // Listen for input acknowledgment
      newSocket.on('input_received', () => {
        setStatus(prev => ({
          ...prev,
          message: 'Input received by CPU, continuing execution...'
        }));
      });
      
      
      newSocket.on('error', (error) => {
        setStatus(prev => ({
          ...prev,
          message: 'Error occurred',
          error: error.message || 'Unknown error'
        }));
      });
      
      newSocket.on('disconnect', () => {
        setStatus(prev => ({
          ...prev,
          connected: false,
          message: 'Disconnected from RV32I CPU'
        }));
      });
      
    } catch (error) {
      setStatus({
        connected: false,
        message: 'Connection error',
        cpuOutput: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [folderName, makeSuccess]);

  // Connect when folder name and make success status change
  useEffect(() => {
    if (folderName && makeSuccess) {
      connectAndSendElf();
    }
    
    // Cleanup function to disconnect socket when component unmounts
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [folderName, makeSuccess, connectAndSendElf, socket]);

  // Handle code changes from the CodeMirror editor
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  // Render the WebSocket status and CodeMirror editor
  return (
    <div className="mt-4 w-full max-w-4xl">
      <div className={`p-3 rounded-md text-sm mb-3 ${status.error ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : status.connected ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'}`}>
        <div className="font-medium">RV32I CPU Connection Status:</div>
        <div>{status.message}</div>
        {status.error && <div className="text-red-600 dark:text-red-400 mt-1">{status.error}</div>}
      </div>
      
      {/* CodeMirror Editor with split-pane layout */}
      <CodeMirrorEditor 
        socket={socket}
        initialCode={code}
        onCodeChange={handleCodeChange}
        cpuOutput={status.cpuOutput}
        connected={status.connected}
      />
      
      {!status.connected && folderName && makeSuccess && (
        <button
          onClick={connectAndSendElf}
          className="mt-3 rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-purple-600 text-white gap-2 hover:bg-purple-700 dark:hover:bg-purple-500 text-sm h-10 px-4 w-full"
        >
          Reconnect to RV32I CPU
        </button>
      )}
    </div>
  );
}