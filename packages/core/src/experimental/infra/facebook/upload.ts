import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Readable } from "node:stream";

// --- TYPE DEFINITIONS ---

interface FacebookUploaderConfig {
  appId: string;
  accessToken: string;
}

interface StartSessionParams {
  fileName: string;
  fileLength: number;
  fileType: string; // MIME type
}

interface UploadSessionResponse {
  id: string; // The upload session ID, e.g., "upload:<UPLOAD_SESSION_ID>"
}

interface UploadSuccessResponse {
  h: string; // The uploaded file handle.
}

interface UploadStatusResponse {
  id: string;
  file_offset: string; // The number of bytes already uploaded.
}

export interface UploadResult {
  fileHandle: string;
  uploadSessionId: string;
}

export class FacebookUploader {
  private readonly appId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: FacebookUploaderConfig) {
    if (!config.appId || !config.accessToken) {
      throw new Error("Meta App ID and User Access Token are required.");
    }
    this.appId = config.appId;
    this.accessToken = config.accessToken;
    const apiVersion = "v24.0";
    this.baseUrl = `https://graph.facebook.com/${apiVersion}`;
  }

  private async startUploadSession(
    params: StartSessionParams,
  ): Promise<string> {
    const { fileName, fileLength, fileType } = params;
    const url = new URL(`${this.baseUrl}/${this.appId}/uploads`);
    url.searchParams.append("file_name", fileName);
    url.searchParams.append("file_length", fileLength.toString());
    url.searchParams.append("file_type", fileType);
    url.searchParams.append("access_token", this.accessToken);

    console.log("Starting upload session...");
    try {
      const response = await fetch(url.toString(), { method: "POST" });
      const data = (await response.json()) as UploadSessionResponse;

      if (!response.ok) {
        throw new Error(
          `Failed to start upload session: ${JSON.stringify(data)}`,
        );
      }

      console.log("Upload session started:", data.id);
      return data.id;
    } catch (error) {
      console.error("Error in startUploadSession:", error);
      throw error;
    }
  }

  private async transferFileData(
    uploadSessionId: string,
    fileData: Buffer | Readable,
    offset: number,
  ): Promise<string> {
    const numericSessionId = uploadSessionId.replace("upload:", "");
    const url = `${this.baseUrl}/${numericSessionId}`;

    console.log(`Uploading file data at offset ${offset}...`);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `OAuth ${this.accessToken}`,
          file_offset: offset.toString(),
        },
        // @ts-expect-error
        body: fileData,
      });

      const data = (await response.json()) as UploadSuccessResponse;

      if (!response.ok || !data.h) {
        throw new Error(`File transfer failed: ${JSON.stringify(data)}`);
      }

      console.log("File transfer successful. Handle:", data.h);
      return data.h;
    } catch (error) {
      console.error("Error in transferFileData:", error);
      throw error;
    }
  }

  public async getUploadStatus(uploadSessionId: string): Promise<number> {
    const numericSessionId = uploadSessionId.replace("upload:", "");
    const url = `${this.baseUrl}/${numericSessionId}`;

    console.log(`Checking status for session: ${uploadSessionId}`);
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `OAuth ${this.accessToken}`,
        },
      });

      const data = (await response.json()) as UploadStatusResponse;

      if (!response.ok) {
        throw new Error(`Failed to get upload status: ${JSON.stringify(data)}`);
      }

      const offset = parseInt(data.file_offset, 10);
      console.log(`Current file offset is ${offset} bytes.`);
      return offset;
    } catch (error) {
      console.error("Error in getUploadStatus:", error);
      throw error;
    }
  }

  public async upload(
    filePath: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const stats = await fs.stat(filePath);
    const fileData = await fs.readFile(filePath);

    const sessionParams: StartSessionParams = {
      fileName: path.basename(filePath),
      fileLength: stats.size,
      fileType: mimeType,
    };

    const uploadSessionId = await this.startUploadSession(sessionParams);
    const fileHandle = await this.transferFileData(
      uploadSessionId,
      fileData,
      0,
    );

    return { fileHandle, uploadSessionId };
  }

  public async resume(
    uploadSessionId: string,
    filePath: string,
  ): Promise<UploadResult> {
    const offset = await this.getUploadStatus(uploadSessionId);
    const stats = await fs.stat(filePath);

    if (offset >= stats.size) {
      console.log("Upload already completed.");
      throw new Error(
        "Cannot resume, upload is already complete. Please start a new upload.",
      );
    }

    // Create a readable stream starting from the offset.
    const remainingFileStream = fsSync.createReadStream(filePath, {
      start: offset,
    });
    const fileHandle = await this.transferFileData(
      uploadSessionId,
      remainingFileStream,
      offset,
    );

    return { fileHandle, uploadSessionId };
  }
}
