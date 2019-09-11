# Notes on Azure Functions
Gathering my notes etc on issues, gotchas and learnings on Azure Functions. 
## Issues
* https://github.com/Azure/azure-functions-core-tools/issues/352 solved by setting up deploy via push to repository, Azure DevOps Pipelines or VS Publish.
* https://github.com/Azure/azure-webjobs-sdk/issues/1199 Input validation
* https://twitter.com/nthonyChu/status/1115862054097887233 Azure SignalR Service authentication is only documented for use with App Service Authentication, any non-azure auth has to use imperative binding. My [gist](https://gist.github.com/ErikAndreas/72c94a0c8a9e6e632f44522c41be8ee7)
* https://github.com/Azure/azure-webjobs-sdk/issues/1240 My [workaround](https://github.com/ErikAndreas/AzureIoTHubCheckpointSetter)
* https://github.com/Azure/azure-functions-host/issues/3965 cold starts, keeping an eye on referenced issues here...
* https://github.com/Azure/Azure-Functions/issues/539 VS Code Analysis doesn't work with Functions project
* https://github.com/Azure/azure-webjobs-sdk/issues/2158 Storage Queues and Visibility
* https://github.com/Azure/azure-functions-signalrservice-extension/issues/54 Now working via Event Grid
* https://github.com/Azure/azure-sdk-for-net/issues/7208 Storage Emulator won't work for Storage SDK > 11
* https://github.com/MicrosoftDocs/azure-docs/issues/31910 App settings env confusion
* https://github.com/Azure/azure-webjobs-sdk/issues/1876 Dependency errors in App Insights

## Notes
* leverage input bindings
* output bindings are prolly a bad idea for http triggered functions
* offload work to queues if work output is not needed for http response
* 230 secs max timout on http triggered function https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale#timeout
* Update the runtime every once in a while 
```powershell
npm update -g azure-functions-core-tools
```

### Using Azure Key Vault transparently as App Settings
Key Vault (filed [issue on docs](https://github.com/MicrosoftDocs/azure-docs/issues/29869):
1. create a key vault
2. add one or more secrets
3. turn on managed identity for app  https://docs.microsoft.com/en-us/azure/app-service/overview-managed-identity#using-the-azure-portal
4. create access policy for key vault
```powershell
az keyvault set-policy --name <Key Vaul tName> --object-id <System assigned identity of func app> --secret-permissions get --subscription <Subscription name>
```
5. Set app setting value '@Microsoft.KeyVault(SecretUri=<uri of keyvault secret>)'
### Azure SignalR connection events
connected events from signal via eventgrid  https://github.com/aspnet/AzureSignalR-samples/tree/master/samples/EventGridIntegration#create-a-subscription
1. ngrok http -host-header=localhost 7071
2. (if not already done) Azure portal, subscription, resource provider, (search) register Microsoft.EventGrid
3. 
```powershell
az eventgrid event-subscription create --resource-id <signalr resource id from properties blade in portal> --name <event grid setup name> --endpoint https://<your id>.ngrok.io/runtime/webhooks/eventgrid?functionName=OnConnection
```

## Resources
* https://github.com/Azure/azure-webjobs-sdk-extensions
* https://dev.to/azure/threat-modelling-serverless-500k
* https://docs.microsoft.com/en-us/sandbox/functions-recipes/
* https://docs.microsoft.com/en-us/azure/azure-functions/manage-connections
* https://docs.microsoft.com/en-us/azure/azure-functions/functions-overview
* https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference
* https://docs.microsoft.com/en-us/azure/azure-functions/functions-app-settings
* https://docs.microsoft.com/en-us/azure/azure-functions/functions-host-json
* https://docs.microsoft.com/en-us/azure/azure-functions/functions-dotnet-class-library
* https://docs.microsoft.com/en-us/azure/azure-functions/functions-best-practices
* blob triggers https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale#how-the-consumption-plan-works
* https://docs.microsoft.com/en-us/sandbox/functions-recipes/routes?tabs=csharp#define-the-function-route-in-the-azure-portal
* ClaimsPrinicipal injected https://azure.microsoft.com/en-us/blog/simplifying-security-for-serverless-and-web-apps-with-azure-functions-and-app-service/
### Azure DevOps Pipelines
* https://medium.com/microsoftazure/serverless-devops-and-ci-cd-part-2-b6e0a6d05530
* https://www.forevolve.com/en/articles/2018/07/10/how-to-deploy-and-host-a-jekyll-website-in-azure-blob-storage-using-a-vsts-continuous-deployment-pipeline-part-2/
* https://docs.microsoft.com/en-us/azure/devops/pipelines/tasks/transforms-variable-substitution?view=azure-devops#json-variable-substitution
