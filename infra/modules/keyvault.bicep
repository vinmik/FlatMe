@description('Azure region.')
param location string

@description('Key Vault name (3-24 chars).')
@maxLength(24)
param name string

@secure()
@description('HS256 signing secret for session JWTs (>= 32 chars).')
param jwtSecret string

@secure()
@description('Pepper for OTP HMAC hashes.')
param otpPepper string

param tags object = {}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
    publicNetworkAccess: 'Enabled'
  }
}

resource jwt 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'JWT-SECRET'
  properties: { value: jwtSecret, contentType: 'text/plain' }
}

resource pepper 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'OTP-PEPPER'
  properties: { value: otpPepper, contentType: 'text/plain' }
}

output name string = vault.name
output id string = vault.id
// Versionless URIs so rotated secrets are picked up automatically by Key Vault references.
output jwtSecretUri string = '${vault.properties.vaultUri}secrets/${jwt.name}'
output otpPepperUri string = '${vault.properties.vaultUri}secrets/${pepper.name}'
