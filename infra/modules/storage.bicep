@description('Azure region.')
param location string

@description('Storage account name (3-24 lowercase alphanumerics).')
@minLength(3)
@maxLength(24)
param name string

@description('Public-read container for listing photos.')
param photosContainerName string = 'listing-photos'

@description('Private container holding Flex Consumption deployment packages.')
param deploymentContainerName string = 'deployments'

param tags object = {}

// Account-level public access must be allowed for the photos container to be anonymously readable.
// Only `listing-photos` opts in (publicAccess: 'Blob' = read individual blobs, no listing);
// every other container stays private. Shared-key auth is disabled: the app and the Functions host
// use Entra ID (managed identity), and uploads use *user-delegation* SAS.
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: true
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    publicNetworkAccess: 'Enabled'
    networkAcls: { defaultAction: 'Allow', bypass: 'AzureServices' }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          // Mobile clients PUT photo bytes straight to a short-lived SAS URL; Expo web/admin read images.
          allowedOrigins: [ '*' ]
          allowedMethods: [ 'GET', 'HEAD', 'PUT', 'OPTIONS' ]
          allowedHeaders: [ '*' ]
          exposedHeaders: [ '*' ]
          maxAgeInSeconds: 3600
        }
      ]
    }
    deleteRetentionPolicy: { enabled: true, days: 7 }
  }
}

resource photos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: photosContainerName
  properties: { publicAccess: 'Blob' }
}

resource deployments 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: deploymentContainerName
  properties: { publicAccess: 'None' }
}

output name string = storage.name
output id string = storage.id
output blobEndpoint string = storage.properties.primaryEndpoints.blob
output photosContainerName string = photos.name
output deploymentContainerUrl string = '${storage.properties.primaryEndpoints.blob}${deployments.name}'
