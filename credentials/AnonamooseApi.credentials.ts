import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class AnonamooseApi implements ICredentialType {
  name = 'anonamooseApi';
  displayName = 'Anonamoose API';
  documentationUrl = 'https://docs.anonamoose.net';
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'http://localhost:3001',
      placeholder: 'https://anonamoose.example.com:3001',
      description: 'The base URL of your Anonamoose management API',
    },
    {
      displayName: 'API Token',
      name: 'apiToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'The API token for authentication (API_TOKEN env var on the server)',
    },
  ];
}
