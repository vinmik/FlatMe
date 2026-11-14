@description('Principal ID of the Function App system-assigned identity.')
param functionPrincipalId string

@description('Optional principal (user / CI service principal) granted data-plane access for seeding & ops.')
param deployerPrincipalId string = ''

@allowed([ 'User', 'ServicePrincipal', 'Group' ])
param deployerPrincipalType string = 'User'

param storageAccountName string
param cosmosAccountName string
param keyVaultName string
param communicationServiceName string

var roles = {
  storageBlobDataOwner: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
  storageBlobDataContributor: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
  storageQueueDataContributor: '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
  storageTableDataContributor: '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
  keyVaultSecretsUser: '4633458b-17de-408a-b874-0445c86b69e6'
  contributor: 'b24988ac-6180-42a0-ab88-20f7382dd24c'
}
// Cosmos DB Built-in Data Contributor (data plane, SQL RBAC - not an ARM role).
var cosmosDataContributor = '00000000-0000-0000-0000-000000000002'
var hasDeployer = !empty(deployerPrincipalId)

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' existing = {
  name: cosmosAccountName
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource communication 'Microsoft.Communication/communicationServices@2023-04-01' existing = {
  name: communicationServiceName
}

// Host storage (AzureWebJobsStorage + Flex deployment container) and photo uploads.
// Blob Data Owner also covers `getUserDelegationKey` (generateUserDelegationKey action) for upload SAS.
var functionStorageRoles = [
  roles.storageBlobDataOwner
  roles.storageQueueDataContributor
  roles.storageTableDataContributor
]

resource functionStorage 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for roleId in functionStorageRoles: {
    scope: storage
    name: guid(storage.id, functionPrincipalId, roleId)
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleId)
      principalId: functionPrincipalId
      principalType: 'ServicePrincipal'
    }
  }
]

resource functionKeyVault 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vault
  name: guid(vault.id, functionPrincipalId, roles.keyVaultSecretsUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.keyVaultSecretsUser)
    principalId: functionPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Entra ID auth for ACS Email requires an RBAC role on the Communication Service; Contributor is the
// documented minimum built-in role (scoped to this single resource).
resource functionAcs 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: communication
  name: guid(communication.id, functionPrincipalId, roles.contributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.contributor)
    principalId: functionPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource functionCosmos 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-11-15' = {
  parent: cosmos
  name: guid(cosmos.id, functionPrincipalId, cosmosDataContributor)
  properties: {
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/${cosmosDataContributor}'
    principalId: functionPrincipalId
    scope: cosmos.id
  }
}

resource deployerCosmos 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-11-15' = if (hasDeployer) {
  parent: cosmos
  name: guid(cosmos.id, deployerPrincipalId, cosmosDataContributor)
  properties: {
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/${cosmosDataContributor}'
    principalId: deployerPrincipalId
    scope: cosmos.id
  }
}

resource deployerStorage 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (hasDeployer) {
  scope: storage
  name: guid(storage.id, deployerPrincipalId, roles.storageBlobDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.storageBlobDataContributor)
    principalId: deployerPrincipalId
    principalType: deployerPrincipalType
  }
}
