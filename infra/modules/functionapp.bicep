@description('Azure region.')
param location string

@description('Flex Consumption plan name.')
param planName string

@description('Function App name (globally unique).')
param name string

@description('Host/deployment storage account name (identity-based connection).')
param storageAccountName string

@description('Blob container URL holding deployment packages.')
param deploymentContainerUrl string

@description('Application settings (name -> value) merged after the host settings.')
param appSettings object

@description('Allowed browser origins (admin portal, local dev). Native mobile clients need no CORS.')
param corsAllowedOrigins array

@description('Application Insights connection string.')
@secure()
param appInsightsConnectionString string

@minValue(40)
@maxValue(1000)
param maximumInstanceCount int = 40

@allowed([ 512, 2048, 4096 ])
param instanceMemoryMB int = 2048

param tags object = {}

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: planName
  location: location
  tags: tags
  kind: 'functionapp'
  sku: { name: 'FC1', tier: 'FlexConsumption' }
  properties: { reserved: true }
}

// Flex Consumption manages the runtime itself: FUNCTIONS_WORKER_RUNTIME, FUNCTIONS_EXTENSION_VERSION
// and WEBSITE_RUN_FROM_PACKAGE must NOT be set as app settings.
var hostSettings = {
  AzureWebJobsStorage__accountName: storageAccountName
  APPLICATIONINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
}

resource site 'Microsoft.Web/sites@2024-04-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'api' })
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientCertEnabled: false
    publicNetworkAccess: 'Enabled'
    siteConfig: {
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      cors: { allowedOrigins: corsAllowedOrigins, supportCredentials: false }
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: deploymentContainerUrl
          authentication: { type: 'SystemAssignedIdentity' }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: maximumInstanceCount
        instanceMemoryMB: instanceMemoryMB
      }
      runtime: { name: 'node', version: '22' }
    }
  }
}

resource settings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: site
  name: 'appsettings'
  properties: union(hostSettings, appSettings)
}

output name string = site.name
output id string = site.id
output principalId string = site.identity.principalId
output defaultHostname string = site.properties.defaultHostName
