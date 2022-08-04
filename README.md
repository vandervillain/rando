# rando 
A WebRTC voice client for those who don't want some rando hanging around on their chat app.
 
## To run backend locally:  
  
Prerequisites:  
1. [.NET SDK](https://dotnet.microsoft.com/download) (Version 6.0, required for Functions extensions)
1. [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v4%2Cwindows%2Ccsharp%2Cportal%2Cbash#install-the-azure-functions-core-tools) (Version 4)
Azure CLI
1. Install Azurite storage emulator (in dev dependencies but you may want it global):  
`npm install -g azurite`
1. Install the SignalR Service emulator:  
`dotnet tool install  -g Microsoft.Azure.SignalR.Emulator --version 1.0.0-preview1-10809`  
`dotnet tool update -g Microsoft.Azure.SignalR.Emulator --version 1.0.0-preview1-10809`  
in azure-function:  
`asrs-emulator upstream init`
1. Create local.settings.json in azure-function with the following content (connection strings are emulator defaults, but may vary):  
```json
{
    "IsEncrypted": false,
    "Values": {
      "FUNCTIONS_WORKER_RUNTIME": "dotnet",
      "AzureWebJobsStorage": "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;",
      "AzureSignalRConnectionString":"Endpoint=http://localhost;Port=8888;AccessKey=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGH;Version=1.0;",
      "AzureSignalRServiceTransportType": "Transient"
    },
    "Host": {
      "CORS": "http://localhost:3000",
      "CORSCredentials": true
    }
  }
```
Steps:  
1. `yarn start:storage-emulator`
1. `yarn start:signalr-emulator`
1. `yarn start:function`  

## To run client app locally:

1. `cd client`
1. `yarn install`
1. `yarn start`
  
