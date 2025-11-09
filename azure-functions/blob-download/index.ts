import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers: corsHeaders,
    };
    return;
  }

  try {
    const filename = req.query.filename;

    if (!filename) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: { error: "filename query parameter is required" },
      };
      return;
    }

    context.log(`Downloading ${filename} from blob storage`);

    // Get connection string from environment
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured");
    }

    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Get container
    const containerName = "cornerstone-bible-data";
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Download blob
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    const downloadResponse = await blockBlobClient.download();
    
    // Read stream to buffer
    const downloaded = await streamToBuffer(downloadResponse.readableStreamBody!);
    const data = JSON.parse(downloaded.toString());

    context.log(`Successfully downloaded ${filename} (${downloaded.length} bytes)`);

    context.res = {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: data,
    };
  } catch (error) {
    context.log.error("Download error:", error);
    
    // Check if blob doesn't exist
    if (error.statusCode === 404) {
      context.res = {
        status: 404,
        headers: corsHeaders,
        body: { error: "File not found" },
      };
    } else {
      context.res = {
        status: 500,
        headers: corsHeaders,
        body: { error: error.message },
      };
    }
  }
};

// Helper function to convert stream to buffer
async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

export default httpTrigger;
