@description('Azure region.')
param location string

@description('Cosmos DB account name.')
param accountName string

@description('SQL database name.')
param databaseName string = 'flatme'

@description('TTL (seconds) applied to audit entries by default; the app also sets a per-item ttl.')
param auditTtlSeconds int = 31536000

param tags object = {}

func pk(path string) object => { paths: [ path ], kind: 'Hash', version: 2 }

resource account 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [ { name: 'EnableServerless' } ]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [ { locationName: location, failoverPriority: 0, isZoneRedundant: false } ]
    // RBAC only - no account keys. The app authenticates with its managed identity.
    disableLocalAuth: true
    disableKeyBasedMetadataWriteAccess: true
    minimalTlsVersion: 'Tls12'
    publicNetworkAccess: 'Enabled'
    enableFreeTier: false
    backupPolicy: { type: 'Continuous', continuousModeProperties: { tier: 'Continuous7Days' } }
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: account
  name: databaseName
  properties: { resource: { id: databaseName } }
}

resource users 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'users'
  properties: { resource: { id: 'users', partitionKey: pk('/id') } }
}

resource listings 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'listings'
  properties: {
    resource: {
      id: 'listings'
      partitionKey: pk('/id')
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [ { path: '/*' } ]
        excludedPaths: [ { path: '/description/?' }, { path: '/photos/*' }, { path: '/"_etag"/?' } ]
        spatialIndexes: [ { path: '/geo/?', types: [ 'Point' ] } ]
        // Required by ORDER BY rent ASC|DESC, createdAt DESC (search sorts).
        compositeIndexes: [
          [ { path: '/rent', order: 'ascending' }, { path: '/createdAt', order: 'descending' } ]
          [ { path: '/rent', order: 'descending' }, { path: '/createdAt', order: 'descending' } ]
        ]
      }
    }
  }
}

resource otps 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'otps'
  // defaultTtl -1 = TTL enabled, no default expiry; every OTP doc carries its own `ttl`.
  properties: { resource: { id: 'otps', partitionKey: pk('/email'), defaultTtl: -1 } }
}

resource inquiries 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'inquiries'
  properties: { resource: { id: 'inquiries', partitionKey: pk('/listingId') } }
}

resource reports 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'reports'
  properties: { resource: { id: 'reports', partitionKey: pk('/listingId') } }
}

resource audit 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'audit'
  properties: { resource: { id: 'audit', partitionKey: pk('/id'), defaultTtl: auditTtlSeconds } }
}

output accountName string = account.name
output accountId string = account.id
output endpoint string = account.properties.documentEndpoint
output databaseName string = database.name
