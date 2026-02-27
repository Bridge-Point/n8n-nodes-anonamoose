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
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Detect and redact PII, or rehydrate redacted text, using Anonamoose',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'redact',
				options: [
					{
						name: 'Redact',
						value: 'redact',
						action: 'Redact PII from text',
						description: 'Detect and replace PII with tokens',
					},
					{
						name: 'Rehydrate',
						value: 'rehydrate',
						action: 'Rehydrate redacted text',
						description: 'Restore original values using a session ID',
					},
					{
						name: 'Dictionary Add',
						value: 'dictionaryAdd',
						action: 'Add terms to the dictionary',
						description: 'Add terms for guaranteed redaction',
					},
					{
						name: 'Dictionary Delete',
						value: 'dictionaryDelete',
						action: 'Delete terms from the dictionary',
						description: 'Remove terms from the dictionary by name',
					},
				],
			},
			// -- Redact & Rehydrate fields --
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'The text to redact or rehydrate',
				placeholder: 'e.g. Call John Smith at john@example.com',
				displayOptions: {
					show: {
						operation: ['redact', 'rehydrate'],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				required: true,
				description: 'The session ID returned by a previous redact operation',
				displayOptions: {
					show: {
						operation: ['rehydrate'],
					},
				},
			},
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'options',
				default: '',
				description: 'Restrict regex patterns to a specific locale',
				displayOptions: {
					show: {
						operation: ['redact'],
					},
				},
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
			// -- Dictionary Add fields --
			{
				displayName: 'Terms',
				name: 'terms',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Terms to add, one per line',
				placeholder: 'Project Apollo\nJohn Smith\nACME Corp',
				displayOptions: {
					show: {
						operation: ['dictionaryAdd'],
					},
				},
			},
			{
				displayName: 'Case Sensitive',
				name: 'caseSensitive',
				type: 'boolean',
				default: false,
				description: 'Whether matching should be case-sensitive',
				displayOptions: {
					show: {
						operation: ['dictionaryAdd'],
					},
				},
			},
			{
				displayName: 'Whole Word',
				name: 'wholeWord',
				type: 'boolean',
				default: false,
				description: 'Whether to match whole words only',
				displayOptions: {
					show: {
						operation: ['dictionaryAdd'],
					},
				},
			},
			// -- Dictionary Delete fields --
			{
				displayName: 'Terms',
				name: 'deleteTerms',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Terms to delete, one per line (exact match, case-insensitive)',
				placeholder: 'Project Apollo\nJohn Smith',
				displayOptions: {
					show: {
						operation: ['dictionaryDelete'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('anonamooseApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
		const headers: Record<string, string> = {
			Authorization: `Bearer ${credentials.apiToken}`,
			'Content-Type': 'application/json',
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let response: IDataObject;

				if (operation === 'redact') {
					const text = this.getNodeParameter('text', i) as string;
					const locale = this.getNodeParameter('locale', i, '') as string;
					const body: Record<string, string> = { text };
					if (locale) {
						body.locale = locale;
					}

					response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseUrl}/api/v1/redact`,
						headers,
						body,
						json: true,
					});
				} else if (operation === 'rehydrate') {
					const text = this.getNodeParameter('text', i) as string;
					const sessionId = this.getNodeParameter('sessionId', i) as string;

					response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}/hydrate`,
						headers,
						body: { text },
						json: true,
					});
				} else if (operation === 'dictionaryAdd') {
					const termsRaw = this.getNodeParameter('terms', i) as string;
					const caseSensitive = this.getNodeParameter('caseSensitive', i, false) as boolean;
					const wholeWord = this.getNodeParameter('wholeWord', i, false) as boolean;

					const terms = termsRaw
						.split('\n')
						.map((t) => t.trim())
						.filter((t) => t.length > 0);

					response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseUrl}/api/v1/dictionary`,
						headers,
						body: {
							entries: terms.map((term) => ({
								term,
								caseSensitive,
								wholeWord,
							})),
						},
						json: true,
					});
				} else {
					// dictionaryDelete — delete by term via server-side lookup
					const deleteTermsRaw = this.getNodeParameter('deleteTerms', i) as string;
					const terms = deleteTermsRaw
						.split('\n')
						.map((t) => t.trim())
						.filter((t) => t.length > 0);

					response = await this.helpers.httpRequest({
						method: 'DELETE',
						url: `${baseUrl}/api/v1/dictionary/by-terms`,
						headers,
						body: { terms },
						json: true,
					});
				}

				returnData.push({
					json: response,
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
