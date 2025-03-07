"use client";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [folderStatus, setFolderStatus] = useState<{ message: string; success?: boolean } | null>(null);
  const [makeOutput, setMakeOutput] = useState<string>('');
  const [programCode, setProgramCode] = useState<string>('');

  const createFolder = async () => {
    try {
      setFolderStatus({ message: "Creating folder..." });
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ programCode })
      });
      const data = await response.json();

      if (data.success) {
        setFolderStatus({ message: `Folder ${data.folderName} created successfully! (${data.totalFolders}/10 folders)`, success: true });
        if (data.makeCommand) {
          setMakeOutput(data.makeOutput || 'No output from make command');
        } else {
          setMakeOutput(`Make command failed: ${data.makeCommandMessage}`);
        }
      } else {
        setFolderStatus({ message: data.message || 'Failed to create folder', success: false });
      }
    } catch (error) {
      setFolderStatus({ message: 'Error creating folder', success: false });
      console.error('Error creating folder:', error);
    }
  };
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
              src/app/page.tsx
            </code>
            .
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>

        <div className="w-full max-w-md">
          <label htmlFor="program-code" className="block text-sm font-medium mb-2">Enter C Program Code:</label>
          <textarea
            id="program-code"
            value={programCode}
            onChange={(e) => setProgramCode(e.target.value)}
            placeholder="Enter your C code here..."
            className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        {folderStatus && (
          <div className={`p-3 rounded-md text-sm ${folderStatus.success === false ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : folderStatus.success === true ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'}`}>
            {folderStatus.message}
          </div>
        )}
        
        {makeOutput && folderStatus?.success && (
          <div className="p-3 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700 w-full max-w-md">
            <h3 className="text-sm font-medium mb-2">Make Command Output:</h3>
            <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono p-2 bg-gray-100 dark:bg-gray-900 rounded">
              {makeOutput}
            </pre>
          </div>
        )}

        <button
          onClick={createFolder}
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 dark:hover:bg-blue-500 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
        >
          Create New Folder with C Program
        </button>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
