@description('Static Web Apps region (SWA is not offered in centralindia).')
@allowed([ 'eastasia', 'centralus', 'eastus2', 'westus2', 'westeurope' ])
param location string = 'eastasia'

@description('Static Web App name.')
param name string

param tags object = {}

// Admin portal (apps/admin). Content is deployed out-of-band with the SWA CLI / deployment token.
resource site 'Microsoft.Web/staticSites@2024-04-01' = {
  name: name
  location: location
  tags: tags
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

output name string = site.name
output defaultHostname string = site.properties.defaultHostname
