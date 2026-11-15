targetScope = 'resourceGroup'

@description('Primary region for all regional resources.')
param location string = 'centralindia'

@description('Short name prefix for resources.')
@minLength(2)
@maxLength(12)
param namePrefix string = 'flatme'

@description('Environment name (e.g. prod, staging).')
@minLength(2)
@maxLength(8)
param environmentName string = 'prod'

@description('Region for the admin portal Static Web App (SWA is not available in centralindia).')
@allowed([ 'eastasia', 'centralus', 'eastus2', 'westus2', 'westeurope' ])
param staticWebAppLocation string = 'eastasia'

@secure()
@minLength(32)
@description('JWT HS256 signing secret (>= 32 chars). Stored in Key Vault as JWT-SECRET.')
param jwtSecret string

@secure()
@minLength(16)
@description('Pepper for OTP hashes. Stored in Key Vault as OTP-PEPPER.')
param otpPepper string

@description('Comma-separated admin email allowlist (granted the admin role on sign-in).')
param adminEmails string = ''

@description('DANGER: when true, every admin API route skips authentication and runs as a synthetic system admin. Admin APIs become publicly writable. Turn off before real users.')
param adminAuthDisabled bool = false

@description('Optional store-review/demo account email that accepts DEMO_OTP without sending email.')
param demoEmail string = ''

@secure()
@description('Optional fixed 6-digit OTP for demoEmail.')
param demoOtp string = ''

@description('Session lifetime in days.')
@minValue(1)
@maxValue(365)
param jwtTtlDays int = 30

@description('Optional object ID of a user/SP to grant Cosmos data + blob access (for seeding from a dev box).')
param deployerPrincipalId string = ''

@allowed([ 'User', 'ServicePrincipal', 'Group' ])
param deployerPrincipalType string = 'User'

@description('Extra browser origins allowed by the API CORS policy.')
param extraCorsOrigins array = [ 'http://localhost:5173', 'http://localhost:8081' ]

var suffix = uniqueString(subscription().id, resourceGroup().id, namePrefix, environmentName)
var base = '${namePrefix}-${environmentName}'
var compact = toLower(replace('${namePrefix}${environmentName}', '-', ''))
var tags = { app: 'flatme', environment: environmentName }
var photosContainer = 'listing-photos'
var databaseName = 'flatme'

var names = {
  workspace: 'log-${base}'
  appInsights: 'appi-${base}'
  storage: take('st${compact}${suffix}', 24)
  cosmos: take('cosmos-${base}-${suffix}', 44)
  keyVault: take('kv-${compact}-${suffix}', 24)
  emailService: 'acs-email-${base}-${suffix}'
  communication: 'acs-${base}-${suffix}'
  plan: 'plan-${base}'
  functionApp: 'func-${base}-${suffix}'
  staticWebApp: 'swa-${base}-admin-${suffix}'
  webSite: 'swa-${base}-web-${suffix}'
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: { location: location, workspaceName: names.workspace, appInsightsName: names.appInsights, tags: tags }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: { location: location, name: names.storage, photosContainerName: photosContainer, tags: tags }
}

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: { location: location, accountName: names.cosmos, databaseName: databaseName, tags: tags }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: { location: location, name: names.keyVault, jwtSecret: jwtSecret, otpPepper: otpPepper, tags: tags }
}

module communication 'modules/communication.bicep' = {
  name: 'communication'
  params: { emailServiceName: names.emailService, communicationServiceName: names.communication, tags: tags }
}

module adminPortal 'modules/staticwebapp.bicep' = {
  name: 'admin-portal'
  params: { location: staticWebAppLocation, name: names.staticWebApp, tags: tags }
}

module webSite 'modules/staticwebapp.bicep' = {
  name: 'web-site'
  params: { location: staticWebAppLocation, name: names.webSite, tags: tags }
}

module functionApp 'modules/functionapp.bicep' = {
  name: 'function-app'
  params: {
    location: location
    planName: names.plan
    name: names.functionApp
    storageAccountName: storage.outputs.name
    deploymentContainerUrl: storage.outputs.deploymentContainerUrl
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    corsAllowedOrigins: concat([ 'https://${adminPortal.outputs.defaultHostname}', 'https://${webSite.outputs.defaultHostname}' ], extraCorsOrigins)
    tags: tags
    appSettings: {
      COSMOS_ENDPOINT: cosmos.outputs.endpoint
      COSMOS_DATABASE: databaseName
      STORAGE_ACCOUNT_URL: storage.outputs.blobEndpoint
      PHOTOS_CONTAINER: photosContainer
      ACS_ENDPOINT: communication.outputs.endpoint
      EMAIL_SENDER: communication.outputs.senderAddress
      JWT_SECRET: '@Microsoft.KeyVault(SecretUri=${keyVault.outputs.jwtSecretUri})'
      OTP_PEPPER: '@Microsoft.KeyVault(SecretUri=${keyVault.outputs.otpPepperUri})'
      JWT_TTL_DAYS: string(jwtTtlDays)
      OTP_DEV_MODE: 'false'
      DEMO_EMAIL: demoEmail
      DEMO_OTP: demoOtp
      ADMIN_EMAILS: adminEmails
      ADMIN_AUTH_DISABLED: string(adminAuthDisabled)
      SEED_MEMORY: 'false'
    }
  }
}

module roles 'modules/roles.bicep' = {
  name: 'role-assignments'
  params: {
    functionPrincipalId: functionApp.outputs.principalId
    deployerPrincipalId: deployerPrincipalId
    deployerPrincipalType: deployerPrincipalType
    storageAccountName: storage.outputs.name
    cosmosAccountName: cosmos.outputs.accountName
    keyVaultName: keyVault.outputs.name
    communicationServiceName: communication.outputs.communicationServiceName
  }
}

output resourceGroup string = resourceGroup().name
output functionAppName string = functionApp.outputs.name
output functionAppHostname string = functionApp.outputs.defaultHostname
output apiBaseUrl string = 'https://${functionApp.outputs.defaultHostname}/api'
output cosmosEndpoint string = cosmos.outputs.endpoint
output cosmosAccountName string = cosmos.outputs.accountName
output storageAccountName string = storage.outputs.name
output storageBlobEndpoint string = storage.outputs.blobEndpoint
output photosContainerUrl string = '${storage.outputs.blobEndpoint}${photosContainer}'
output emailSender string = communication.outputs.senderAddress
output keyVaultName string = keyVault.outputs.name
output adminPortalName string = adminPortal.outputs.name
output adminPortalHostname string = adminPortal.outputs.defaultHostname
output adminPortalUrl string = 'https://${adminPortal.outputs.defaultHostname}'
output webSiteName string = webSite.outputs.name
output webSiteUrl string = 'https://${webSite.outputs.defaultHostname}'
