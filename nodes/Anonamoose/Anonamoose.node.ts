import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class Anonamoose implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Anonamoose',
		name: 'anonamoose',
		icon: 'file:anonamoose.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Redact PII from text',
		description: 'Detect and redact personally identifiable information using Anonamoose',
		defaults: {
			name: 'Anonamoose',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'anonamooseApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'The text to scan for PII and redact',
				placeholder: 'e.g. Call John Smith at john@example.com',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Locale',
						name: 'locale',
						type: 'options',
						default: '',
						description: 'Restrict regex patterns to a specific locale. Leave empty to use the server default.',
						options: [
							{
								name: 'Server Default',
								value: '',
							},
							{
								name: 'Australia',
								value: 'AU',
							},
							{
								name: 'New Zealand',
								value: 'NZ',
							},
							{
								name: 'United Kingdom',
								value: 'UK',
							},
							{
								name: 'United States',
								value: 'US',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('anonamooseApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

		for (let i = 0; i < items.length; i++) {
			try {
				const text = this.getNodeParameter('text', i) as string;
				const options = this.getNodeParameter('options', i) as {
					locale?: string;
				};

				const body: Record<string, string> = { text };
				if (options.locale) {
					body.locale = options.locale;
				}

				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: `${baseUrl}/api/v1/redact`,
					headers: {
						Authorization: `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
					body,
					json: true,
				});

				returnData.push({
					json: response as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message } as IDataObject,
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
