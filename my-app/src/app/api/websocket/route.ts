import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// Define the folder where we'll look for the ELF file
const FOLDERS_DIR = path.join(os.homedir(), "generated-folders");

// WebSocket connection details
const RV32I_WS_URL = "ws://mypchost1812.ddns.net:9092"; // Update this with your actual RV32I CPU WebSocket URL

// Function to find the ELF file in a folder
async function findElfFile(folderPath: string): Promise<string | null> {
  try {
    const files = fs.readdirSync(folderPath);
    const elfFile = files.find((file) => file.endsWith(".elf"));

    if (elfFile) {
      return path.join(folderPath, elfFile);
    }

    return null;
  } catch (error) {
    console.error(`Error finding ELF file: ${error}`);
    return null;
  }
}

// Function to read the ELF file as binary data
async function readElfFile(filePath: string): Promise<Buffer | null> {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    console.error(`Error reading ELF file: ${error}`);
    return null;
  }
}

// POST handler to send ELF file to RV32I CPU via WebSocket
export async function POST(request: Request) {
  try {
    // Parse the request body to get the folder name
    const { folderName } = await request.json();

    if (!folderName) {
      return NextResponse.json(
        { success: false, message: "Folder name is required" },
        { status: 400 }
      );
    }

    // Construct the folder path
    const folderPath = path.join(FOLDERS_DIR, folderName);

    // Check if the folder exists
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json(
        { success: false, message: `Folder ${folderName} does not exist` },
        { status: 404 }
      );
    }

    // Find the ELF file in the folder
    const elfFilePath = await findElfFile(folderPath);

    if (!elfFilePath) {
      return NextResponse.json(
        { success: false, message: "No ELF file found in the folder" },
        { status: 404 }
      );
    }

    // Read the ELF file
    const elfData = await readElfFile(elfFilePath);

    if (!elfData) {
      return NextResponse.json(
        { success: false, message: "Failed to read ELF file" },
        { status: 500 }
      );
    }

    // This endpoint will be called from the client side
    // The actual WebSocket connection will be established from the client
    // We're returning the necessary information for the client to use, including the binary data

    // Convert the binary buffer to base64 string for safe transmission
    const elfBase64 = elfData.toString("base64");

    return NextResponse.json({
      success: true,
      message: "ELF file found and ready for WebSocket transmission",
      elfFileName: path.basename(elfFilePath),
      folderName: folderName,
      wsUrl: RV32I_WS_URL,
      elfData: elfBase64, // Send the binary data as base64 string
    });
  } catch (error) {
    console.error("Error processing WebSocket request:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process WebSocket request",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
