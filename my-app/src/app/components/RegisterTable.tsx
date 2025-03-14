"use client";

import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";

interface RegisterTableProps {
  socket: Socket | null;
  connected: boolean;
}

// Define the structure for register data
interface RegisterData {
  [key: string]: number; // Register name (x0-x31) to value mapping
}

export default function RegisterTable({ socket, connected }: RegisterTableProps) {
  // State to store register values
  const [registers, setRegisters] = useState<RegisterData>({});

  // Register names and descriptions
  const registerInfo = [
    { reg: "x0", name: "zero", description: "Hard-wired zero" },
    { reg: "x1", name: "ra", description: "Return address" },
    { reg: "x2", name: "sp", description: "Stack pointer" },
    { reg: "x3", name: "gp", description: "Global pointer" },
    { reg: "x4", name: "tp", description: "Thread pointer" },
    { reg: "x5", name: "t0", description: "Temporary/alternate link register" },
    { reg: "x6", name: "t1", description: "Temporary" },
    { reg: "x7", name: "t2", description: "Temporary" },
    { reg: "x8", name: "s0/fp", description: "Saved register/frame pointer" },
    { reg: "x9", name: "s1", description: "Saved register" },
    { reg: "x10", name: "a0", description: "Function argument/return value" },
    { reg: "x11", name: "a1", description: "Function argument/return value" },
    { reg: "x12", name: "a2", description: "Function argument" },
    { reg: "x13", name: "a3", description: "Function argument" },
    { reg: "x14", name: "a4", description: "Function argument" },
    { reg: "x15", name: "a5", description: "Function argument" },
    { reg: "x16", name: "a6", description: "Function argument" },
    { reg: "x17", name: "a7", description: "Function argument" },
    { reg: "x18", name: "s2", description: "Saved register" },
    { reg: "x19", name: "s3", description: "Saved register" },
    { reg: "x20", name: "s4", description: "Saved register" },
    { reg: "x21", name: "s5", description: "Saved register" },
    { reg: "x22", name: "s6", description: "Saved register" },
    { reg: "x23", name: "s7", description: "Saved register" },
    { reg: "x24", name: "s8", description: "Saved register" },
    { reg: "x25", name: "s9", description: "Saved register" },
    { reg: "x26", name: "s10", description: "Saved register" },
    { reg: "x27", name: "s11", description: "Saved register" },
    { reg: "x28", name: "t3", description: "Temporary" },
    { reg: "x29", name: "t4", description: "Temporary" },
    { reg: "x30", name: "t5", description: "Temporary" },
    { reg: "x31", name: "t6", description: "Temporary" },
  ];

  // Listen for register updates from the WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    // Handler for register update events
    const handleRegisterUpdate = (data: RegisterData) => {
      setRegisters(data);
    };

    // Subscribe to register update events
    socket.on("register_update", handleRegisterUpdate);

    // Cleanup function to remove event listener
    return () => {
      socket.off("register_update", handleRegisterUpdate);
    };
  }, [socket, connected]);

  // Format register value as hexadecimal
  const formatRegValue = (value: number | undefined): string => {
    if (value === undefined) return "0x00000000";

    // Handle 32-bit values properly by using unsigned right shift
    // This ensures correct representation of negative numbers
    const unsignedValue = value >>> 0; // Convert to unsigned 32-bit integer
    return `0x${unsignedValue.toString(16).padStart(8, '0').toUpperCase()}`;
  };

  // Render the register table
  return (
    <div className="w-full">
      <h3 className="text-sm font-medium mb-2">RV32I CPU Registers</h3>
      <div className="border border-gray-300 rounded-md overflow-hidden">
        {!connected ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Connect to the CPU to view register values
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Register</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ABI Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value (Hex)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {registerInfo.map((info, index) => (
                  <tr key={info.reg} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-mono">{info.reg}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-mono">{info.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{info.description}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-mono">
                      {formatRegValue(registers[info.reg])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}