import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { guardRequest } from "../shared/guard";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const corsHeaders = guardRequest(context, req, "POST");
  if (!corsHeaders) return;

  try {
    const { filename, data } = req.body;

    if (!filename || !data) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: { error: "filename and data are required" },
      };
      return;
    }

    context.log(`Uploading ${filename} to blob storage`);

    // Get connection string from environment
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured");
    }

    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Get container (create if doesn't exist)
    const containerName = "cornerstone-bible-data";
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    // Upload blob
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.upload(data, Buffer.byteLength(data), {
      blobHTTPHeaders: {
        blobContentType: "application/json",
      },
    });

    context.log(`Successfully uploaded ${filename} (${Buffer.byteLength(data)} bytes)`);

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: { success: true, filename, size: Buffer.byteLength(data) },
    };
  } catch (error) {
    context.log.error("Upload error:", error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: { error: error.message },
    };
  }
};

export default httpTrigger;
