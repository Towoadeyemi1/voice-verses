# Azure Functions Deployment Guide

## Prerequisites

1. **Azure Account**: Create a free account at [azure.microsoft.com](https://azure.microsoft.com)
2. **Azure CLI**: Install from [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Azure Functions Core Tools**: Install from [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local)
4. **Node.js**: Version 18.x or higher
5. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)

## Local Development

1. Navigate to the azure-functions folder:
```bash
cd azure-functions
```

2. Install dependencies:
```bash
npm install
```

3. Update `local.settings.json` with your OpenAI API key:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "OPENAI_API_KEY": "sk-your-actual-key-here"
  }
}
```

4. Build and start the function locally:
```bash
npm run build
npm start
```

5. Test locally at `http://localhost:7071/api/realtime-token`

## Azure Deployment

### Step 1: Login to Azure
```bash
az login
```

### Step 2: Create Resource Group
```bash
az group create --name bible-verse-detector-rg --location eastus
```

### Step 3: Create Storage Account
```bash
az storage account create \
  --name bibleversestorage \
  --location eastus \
  --resource-group bible-verse-detector-rg \
  --sku Standard_LRS
```

### Step 4: Create Function App
```bash
az functionapp create \
  --resource-group bible-verse-detector-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name bible-verse-detector-func \
  --storage-account bibleversestorage
```

### Step 5: Configure Application Settings (Add your OpenAI API Key)
```bash
az functionapp config appsettings set \
  --name bible-verse-detector-func \
  --resource-group bible-verse-detector-rg \
  --settings "OPENAI_API_KEY=sk-your-actual-key-here"
```

### Step 6: Deploy the Function
```bash
cd azure-functions
func azure functionapp publish bible-verse-detector-func
```

### Step 7: Get Your Function URL
After deployment, you'll see output like:
```
Functions in bible-verse-detector-func:
    realtime-token - [httpTrigger]
        Invoke url: https://bible-verse-detector-func.azurewebsites.net/api/realtime-token
```

**Copy this URL** - you'll need it to update your frontend code.

## Update Frontend

After deployment, update the `AZURE_FUNCTION_URL` in your frontend code:

1. Open `src/lib/realtimeWebRTC.ts`
2. Replace `'YOUR_AZURE_FUNCTION_URL_HERE'` with your actual Azure Function URL

Example:
```typescript
const AZURE_FUNCTION_URL = 'https://bible-verse-detector-func.azurewebsites.net/api/realtime-token';
```

## Verify Deployment

Test your deployed function:
```bash
curl -X POST https://bible-verse-detector-func.azurewebsites.net/api/realtime-token
```

You should receive a JSON response with an ephemeral token.

## Monitoring

View logs in real-time:
```bash
func azure functionapp logstream bible-verse-detector-func
```

Or view logs in Azure Portal:
1. Go to [portal.azure.com](https://portal.azure.com)
2. Navigate to your Function App
3. Click "Log stream" in the left menu

## Costs

Azure Functions on Consumption Plan pricing:
- **Free Grant**: 1 million requests and 400,000 GB-s per month
- **After Free Grant**: $0.20 per million executions
- For this application, you'll likely stay within the free tier

## Troubleshooting

### Function not responding
- Check if OPENAI_API_KEY is set correctly in Application Settings
- View logs using `func azure functionapp logstream`

### CORS errors
- The function is configured with `Access-Control-Allow-Origin: *`
- If issues persist, configure CORS in Azure Portal under Function App → CORS

### Build errors
- Ensure Node.js version is 18.x or higher
- Run `npm install` in azure-functions folder
- Check TypeScript compilation with `npm run build`

## Clean Up (Optional)

To delete all Azure resources:
```bash
az group delete --name bible-verse-detector-rg --yes
```

## Additional Resources

- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Functions Pricing](https://azure.microsoft.com/en-us/pricing/details/functions/)
- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
