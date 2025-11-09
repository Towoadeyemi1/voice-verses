# Azure Blob Storage Endpoints for Cornerstone Bible

This document explains how to add blob storage endpoints to your existing Azure Function App.

## Overview

You need to add two new endpoints to your Azure Function App:
- `POST /api/blob-upload` - Upload data to Azure Blob Storage
- `GET /api/blob-download` - Download data from Azure Blob Storage

## Prerequisites

1. Your existing Azure Function App is already running
2. You have an Azure Storage Account (you mentioned you already have one)
3. You have the Storage Account connection string

## Configuration

Add the following to your Azure Function App settings:

```bash
# In Azure Portal -> Function App -> Configuration -> Application Settings
AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
```

Or via Azure CLI:
```bash
az functionapp config appsettings set \
  --name <your-function-app-name> \
  --resource-group <your-resource-group> \
  --settings AZURE_STORAGE_CONNECTION_STRING="<your-connection-string>"
```

## Implementation

### 1. Add Azure Storage SDK

In your `azure-functions` folder:

```bash
cd azure-functions
npm install @azure/storage-blob
```

### 2. Create blob-upload endpoint

Create `azure-functions/blob-upload/function.json`:

```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post", "options"],
      "route": "blob-upload"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

Create `azure-functions/blob-upload/index.ts`:

```typescript
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { filename, data } = req.body;

    if (!filename || !data) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: { error: "filename and data are required" },
      };
      return;
    }

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

    context.log(`Uploaded ${filename} to blob storage`);

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: { success: true, filename },
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
```

### 3. Create blob-download endpoint

Create `azure-functions/blob-download/function.json`:

```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "blob-download"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

Create `azure-functions/blob-download/index.ts`:

```typescript
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

    context.log(`Downloaded ${filename} from blob storage`);

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
```

## Deployment

Build and deploy your functions:

```bash
cd azure-functions
npm run build
func azure functionapp publish <your-function-app-name>
```

## Frontend Configuration

In the Cornerstone Bible app:

1. Go to **Settings** → **Storage & Backup** tab
2. Enter your Azure Function URL: `https://<your-function-app-name>.azurewebsites.net/api`
3. Enable Azure Sync
4. Click Save Configuration

Your app will now automatically sync to Azure Blob Storage!

## Testing

Test the endpoints:

```bash
# Upload
curl -X POST https://<your-function-app>.azurewebsites.net/api/blob-upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.json","data":"{\"test\":true}"}'

# Download
curl https://<your-function-app>.azurewebsites.net/api/blob-download?filename=test.json
```

## Storage Structure

Data is stored in Azure Blob Storage under:
- Container: `cornerstone-bible-data`
- Blobs:
  - `services.json` - All services/liturgies
  - `media.json` - All media items
  - `app-state.json` - Complete app state

## Cost Considerations

- Azure Blob Storage is very cheap (~$0.02/GB/month)
- Each sync uploads ~1-10MB typically
- Automatic sync happens every 5 minutes when online
- Total monthly cost should be under $1 for typical church usage
