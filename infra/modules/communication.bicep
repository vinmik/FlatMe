@description('Email Communication Service name.')
param emailServiceName string

@description('Communication Service name.')
param communicationServiceName string

@description('Data residency for ACS resources.')
param dataLocation string = 'India'

param tags object = {}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: emailServiceName
  location: 'global'
  tags: tags
  properties: { dataLocation: dataLocation }
}

// Free Azure-managed sender domain (xxxxxxxx.azurecomm.net). Swap for a custom domain later.
resource domain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  tags: tags
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource communication 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: dataLocation
    linkedDomains: [ domain.id ]
  }
}

output communicationServiceName string = communication.name
output communicationServiceId string = communication.id
output endpoint string = 'https://${communication.properties.hostName}'
output senderAddress string = 'DoNotReply@${domain.properties.mailFromSenderDomain}'
