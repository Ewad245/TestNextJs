import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

// Define the folder where we'll create our folders
const FOLDERS_DIR = path.join(os.homedir(), 'generated-folders');
const SOURCE_FILES_DIR = path.join(os.homedir(), 'defaultSource'); // Directory containing files to copy
const MAX_FOLDERS = 10;

// Ensure the base directory exists
if (!fs.existsSync(FOLDERS_DIR)) {
    fs.mkdirSync(FOLDERS_DIR, { recursive: true });
}

// Helper function to get folder creation time
function getFolderCreationTime(folderPath: string): number {
    try {
        const stats = fs.statSync(folderPath);
        return stats.birthtimeMs || stats.ctimeMs; // Use creation time or fallback to change time
    } catch (error) {
        return 0;
    }
}

// Helper function to get all folders with their creation times
function getAllFolders(): Array<{ path: string; creationTime: number }> {
    try {
        const items = fs.readdirSync(FOLDERS_DIR);
        return items
            .map(item => {
                const itemPath = path.join(FOLDERS_DIR, item);
                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                    return {
                        path: itemPath,
                        creationTime: getFolderCreationTime(itemPath)
                    };
                }
                return null;
            })
            .filter(item => item !== null) as Array<{ path: string; creationTime: number }>;
    } catch (error) {
        console.error('Error reading folders:', error);
        return [];
    }
}

// Helper function to delete the oldest folder
function deleteOldestFolder() {
    const folders = getAllFolders();
    if (folders.length === 0) return;

    // Sort by creation time (oldest first)
    folders.sort((a, b) => a.creationTime - b.creationTime);

    // Delete the oldest folder
    try {
        fs.rmSync(folders[0].path, { recursive: true, force: true });
        console.log(`Deleted oldest folder: ${folders[0].path}`);
    } catch (error) {
        console.error(`Error deleting folder ${folders[0].path}:`, error);
    }
}

// Helper function to copy files from source directory to target directory
async function copyFilesToFolder(targetPath: string) {
    try {
        // Check if source directory exists
        if (!fs.existsSync(SOURCE_FILES_DIR)) {
            console.log(`Source directory ${SOURCE_FILES_DIR} does not exist. Creating it...`);
            fs.mkdirSync(SOURCE_FILES_DIR, { recursive: true });
            return { success: true, message: 'Source directory created, but no files to copy' };
        }

        // Get all files from source directory
        const files = fs.readdirSync(SOURCE_FILES_DIR);

        if (files.length === 0) {
            return { success: true, message: 'No files found in source directory' };
        }

        // Copy each file to the target directory
        const copyFilePromise = promisify(fs.copyFile);
        const copyPromises = files.map(file => {
            const sourcePath = path.join(SOURCE_FILES_DIR, file);
            const targetFilePath = path.join(targetPath, file);

            // Only copy files, not directories
            if (fs.statSync(sourcePath).isFile()) {
                return copyFilePromise(sourcePath, targetFilePath)
                    .then(() => ({ file, success: true }))
                    .catch(err => ({ file, success: false, error: err.message }));
            }
            return Promise.resolve({ file, success: false, message: 'Not a file' });
        });

        const results = await Promise.all(copyPromises);
        const copiedFiles = results.filter(r => r.success).map(r => r.file);

        return {
            success: copiedFiles.length > 0,
            message: `Copied ${copiedFiles.length} files to the new folder`,
            copiedFiles
        };
    } catch (error) {
        console.error('Error copying files:', error);
        return { success: false, message: `Failed to copy files: ${error}` };
    }
}

// Helper function to create program.c file with provided code
async function createProgramFile(folderPath: string, programCode: string) {
    try {
        const programFilePath = path.join(folderPath, 'main.c');
        await fs.promises.writeFile(programFilePath, programCode);
        return { success: true, message: 'Program file created successfully' };
    } catch (error) {
        console.error('Error creating program file:', error);
        return { success: false, message: `Failed to create program file: ${error}` };
    }
}

// Helper function to run make command in the folder
async function runMakeCommand(folderPath: string) {
    return new Promise<{ success: boolean; message: string; output?: string }>((resolve) => {
        exec('make', { cwd: folderPath }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running make command: ${error.message}`);
                resolve({ 
                    success: false, 
                    message: `Failed to run make command: ${error.message}`,
                    output: stderr || stdout 
                });
                return;
            }
            
            if (stderr) {
                console.warn(`Make command warnings: ${stderr}`);
            }
            
            console.log(`Make command output: ${stdout}`);
            resolve({ 
                success: true, 
                message: 'Make command executed successfully', 
                output: stdout 
            });
        });
    });
}

// POST handler to create a new folder
export async function POST(request: Request) {
    try {
        // Parse the request body to get the program code
        const { programCode } = await request.json();

        // Check if we need to delete the oldest folder
        const folders = getAllFolders();
        if (folders.length >= MAX_FOLDERS) {
            deleteOldestFolder();
        }

        // Generate a unique folder name with timestamp
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const folderName = `folder-${timestamp}-${randomStr}`;
        const folderPath = path.join(FOLDERS_DIR, folderName);

        // Create the new folder
        fs.mkdirSync(folderPath);

        // Copy files from source directory to the new folder
        const copyResult = await copyFilesToFolder(folderPath);

        // Create program.c file with the provided code
        const programResult = await createProgramFile(folderPath, programCode || '// Empty C program');
        
        // Run make command in the new folder
        const makeResult = await runMakeCommand(folderPath);

        // Return success response
        return NextResponse.json({
            success: true,
            message: 'Folder created successfully',
            folderName,
            totalFolders: folders.length + 1,
            filesCopied: copyResult.success,
            filesCopyMessage: copyResult.message,
            copiedFiles: copyResult.copiedFiles || [],
            programFile: programResult.success,
            programFileMessage: programResult.message,
            makeCommand: makeResult.success,
            makeCommandMessage: makeResult.message,
            makeOutput: makeResult.output || ''
        });
    } catch (error) {
        console.error('Error creating folder:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create folder', error: String(error) },
            { status: 500 }
        );
    }
}

// GET handler to list all folders
export async function GET() {
    try {
        const folders = getAllFolders();

        // Sort by creation time (newest first)
        folders.sort((a, b) => b.creationTime - a.creationTime);

        return NextResponse.json({
            success: true,
            folders: folders.map(folder => ({
                name: path.basename(folder.path),
                createdAt: new Date(folder.creationTime).toISOString()
            })),
            totalFolders: folders.length
        });
    } catch (error) {
        console.error('Error listing folders:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to list folders', error: String(error) },
            { status: 500 }
        );
    }
}