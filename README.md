# rando 
A WebRTC voice client for those who don't want some rando hanging around on their chat app.
 
## To run backend locally:  
  
Prerequisites:  
1. [.NET SDK](https://dotnet.microsoft.com/download) (Version 3.1, required for Functions extensions)
1. [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#install-the-azure-functions-core-tools) (Version 3)
Azure CLI
1. Install Azurite storage emulator:  
`npm install -g azurite`
1. Install the SignalR Service emulator:  
`dotnet tool install  -g Microsoft.Azure.SignalR.Emulator --version 1.0.0-preview1-10809`  
`dotnet tool update -g Microsoft.Azure.SignalR.Emulator --version 1.0.0-preview1-10809`  
`cd signalr-function && asrs-emulator upstream init`
1. Create env.list (vs .env file so we can have '=' in variables) in signalr-function with the following content (connection strings are emulator defaults, but may vary):  
  `AzureWebJobsStorage="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/`  `KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10005/devstoreaccount1;"`  
  `FUNCTIONS_WORKER_RUNTIME=dotnet`  
  `AzureSignalRConnectionString="Endpoint=http://localhost;Port=8888;AccessKey=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGH;Version=1.0;"`  
  `AzureSignalRServiceTransportType=Transient`  
  
Steps:  
1. `yarn start:storage-emulator`
1. `yarn start:signalr-emulator`
1. `yarn start:function`  

## To run client app locally:

1. `cd client`
1. `yarn install`
1. `yarn dev`
  
