"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import CodeMirrorEditor from "./components/CodeMirrorEditor";
import RegisterTable from "./components/RegisterTable";

export default function Home() {
  const [folderStatus, setFolderStatus] = useState<{
    message: string;
    success?: boolean;
  } | null>(null);
  const [makeOutput, setMakeOutput] = useState<string>("");
  const [programCode, setProgramCode] = useState<string>(
    '// hello_world - Minimal bare metal Hello World for RV32I emulator\n#include <stdint.h>\n// Memory-mapped UART registers\n#define UART_BASE     0x10000000  // Base address for UART\n#define UART_THR      0x00        // Transmitter Holding Register (write)\n#define UART_LSR      0x08        // Line Status Register\n#define UART_LSR_THRE 0x20        // Transmit Hold Register Empty bit\n// Write a byte to UART\nvoid uart_write_byte(uint8_t byte) {\n    volatile uint32_t *lsr = (volatile uint32_t *)(UART_BASE + UART_LSR);\n    volatile uint32_t *thr = (volatile uint32_t *)(UART_BASE + UART_THR);\n    \n    // Wait for transmit buffer to be empty\n    while ((*lsr & UART_LSR_THRE) == 0);\n    \n    // Write the byte\n    *thr = byte;\n}\n// Write a string to UART\nvoid uart_write_string(const char* str) {\n    while (*str) {\n        uart_write_byte(*str++);\n    }\n}\n// Entry point function\nvoid c_start(void) {\n    // Send Hello World message\n    uart_write_string("Hello, World!\\r\\n");\n    \n    // Loop forever - bare metal program never returns\n    while(1) {\n        // Do nothing\n    }\n}'
  );
  const [folderName, setFolderName] = useState<string | null>(null);
  const [makeSuccess, setMakeSuccess] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [cpuOutput, setCpuOutput] = useState<string | null>(null);
  let numOfcall = 0;

  // Handle code changes from the CodeMirror editor
  const handleCodeChange = (newCode: string) => {
    setProgramCode(newCode);
  };

  // Connect to WebSocket and send ELF file
  const connectAndSendElf = async () => {
    if (!folderName || !makeSuccess) return;

    try {
      // First, get the ELF file info from our API
      setFolderStatus((prev) => ({
        ...prev,
        message: "Fetching ELF file information...",
      }));

      const response = await fetch("/api/websocket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderName }),
      });

      const data = await response.json();

      if (!data.success) {
        setFolderStatus((prev) => ({
          ...prev,
          message: "Failed to get ELF file",
          success: false,
        }));
        return;
      }

      // Now connect to the WebSocket server
      setFolderStatus((prev) => ({
        ...prev,
        message: "Connecting to RV32I CPU...",
      }));

      const newSocket = io(data.wsUrl, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      setSocket(newSocket);

      newSocket.on("connected", () => {
        setConnected(true);
        setFolderStatus((prev) => ({
          ...prev,
          message: "Connected to RV32I CPU. Sending ELF file...",
          success: true,
        }));

        // Emit an event to send the ELF file with binary data
        // Convert the base64 string back to binary data for transmission
        // const binaryData = Buffer.from(data.elfData, "base64");
        const elfDataSend = data.elfData;

        // Test

        // Send the binary data along with file information
        newSocket.emit(
          "send_elf",
          elfDataSend // Send the actual binary data
        );
        console.log("ELF file sent");
      });

      newSocket.on("elf_received", () => {
        setFolderStatus((prev) => ({
          ...prev,
          message: "ELF file received by CPU. Executing program...",
        }));
      });

      newSocket.on("execution_result", (result) => {
        setFolderStatus((prev) => ({
          ...prev,
          message: "Execution completed",
        }));
        setCpuOutput(result.output || "No output from CPU");
      });

      // Listen for CPU output during execution
      newSocket.on("cpu_output", (data) => {
        setCpuOutput(data || "Output from CPU");
      });
      
      // Listen for register updates from CPU
      newSocket.on("register_update", (data) => {
        console.log("Register update received:", data);
      });

      // Listen for input request from CPU
      newSocket.on("input_request", () => {
        setFolderStatus((prev) => ({
          ...prev,
          message: "CPU is waiting for input...",
        }));
      });

      // Listen for input acknowledgment
      newSocket.on("input_received", () => {
        setFolderStatus((prev) => ({
          ...prev,
          message: "Input received by CPU, continuing execution...",
        }));
      });

      newSocket.on("error", (error) => {
        setFolderStatus((prev) => ({
          ...prev,
          message: "Error occurred",
          success: false,
        }));
      });

      newSocket.on("disconnect", () => {
        setConnected(false);
        setFolderStatus((prev) => ({
          ...prev,
          message: "Disconnected from RV32I CPU",
          success: false,
        }));
      });
    } catch (error) {
      setConnected(false);
      setFolderStatus({
        message: "Connection error",
        success: false,
      });
      console.error("Error connecting to WebSocket:", error);
    }
  };

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
  }, [folderName, makeSuccess]);

  const createFolder = async () => {
    try {
      setFolderStatus({ message: "Creating folder..." });
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ programCode }),
      });
      const data = await response.json();

      if (data.success) {
        setFolderStatus({
          message: `Folder ${data.folderName} created successfully! (${data.totalFolders}/10 folders)`,
          success: true,
        });
        setFolderName(data.folderName);
        if (data.makeCommand) {
          setMakeOutput(data.makeOutput || "No output from make command");
          setMakeSuccess(true);
        } else {
          setMakeOutput(`Make command failed: ${data.makeCommandMessage}`);
          setMakeSuccess(false);
        }
      } else {
        setFolderStatus({
          message: data.message || "Failed to create folder",
          success: false,
        });
      }
    } catch (error) {
      setFolderStatus({ message: "Error creating folder", success: false });
      console.error("Error creating folder:", error);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20">
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-2xl font-bold">RV32I CPU Simulator</h1>

        <div className="w-full max-w-4xl">
          <div className="w-full max-w-4xl mx-auto mb-6">
            <div className="mb-4">
              <label
                htmlFor="program-code"
                className="block text-sm font-medium mb-2"
              >
                C Program Code:
              </label>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <CodeMirrorEditor
                  socket={socket}
                  initialCode={programCode}
                  onCodeChange={handleCodeChange}
                  cpuOutput={cpuOutput}
                  connected={connected}
                />
              </div>
            </div>

            {!folderName && (
              <button
                onClick={createFolder}
                className="mt-4 rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 dark:hover:bg-blue-500 text-sm h-10 px-4 w-full max-w-xs mx-auto"
              >
                Compile and Run C Program
              </button>
            )}
          </div>

          {folderStatus && (
            <div
              className={`p-3 rounded-md text-sm mb-3 ${
                folderStatus.success === false
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                  : folderStatus.success === true
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
              }`}
            >
              <div className="font-medium">Status:</div>
              <div>{folderStatus.message}</div>
            </div>
          )}

          {makeOutput && folderStatus?.success && (
            <div className="p-3 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700 w-full mb-4">
              <h3 className="text-sm font-medium mb-2">Compilation Output:</h3>
              <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono p-2 bg-gray-100 dark:bg-gray-900 rounded">
                {makeOutput}
              </pre>
            </div>
          )}
          
          {/* Register Table */}
          {folderName && makeSuccess && (
            <div className="mt-6">
              <RegisterTable socket={socket} connected={connected} />
            </div>
          )}

          {folderName && makeSuccess && !connected && (
            <button
              onClick={connectAndSendElf}
              className="mt-3 rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-purple-600 text-white gap-2 hover:bg-purple-700 dark:hover:bg-purple-500 text-sm h-10 px-4 w-full max-w-xs mx-auto"
            >
              Reconnect to RV32I CPU
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
