const _ = require('lodash');
const querystring = require('querystring');
const Token = require('../token');
const Please = require('@titanium/please');

export class Owner {
	constructor(params) {
		console.debug('🔒  you are here →   oauth.flows.owner.constructor');
		this.baseUrl = params.baseUrl || '';
		this.endpoint = this.baseUrl + params.tokenPath;
		this.client_id = params.client_id;
		this.client_secret = params.client_secret;
		this.default_headers = params.default_headers;
		this.key = params.key;

		// console.debug(`params: ${JSON.stringify(params, null, 2)}`);
		// console.debug(`this: ${JSON.stringify(this, null, 2)}`);
	}

	getToken(options = {}) {
		console.debug('🔒  you are here →   oauth.flows.owner.getToken');
		const login_info = {...options};
		const {username, password} = login_info;
		// console.debug(`options: ${JSON.stringify(options, null, 2)}`);

		const client_options = Object.assign({}, _.omit(options, ['username', 'password']), {
			timeout: 60000,
			auth: {
				username: this.client_id,
				password: this.client_secret,
			},
			validateStatus: function(status) {
				return status >= 200 && status <= 503;
			},
			headers: this.default_headers,
			url: this.endpoint,
			body: querystring.stringify({
				grant_type: 'password',
				username: username,
				password: password,
				device: Titanium.Platform.id,
				client_id: this.client_id,
			}),
		});

		const api = new Please(client_options);

		return api.post()
			.then(response => {
				console.debug('🔒  you are here → owner.getToken.response');

				const body = response.json;

				const authError = this.getAuthError(response);
				if (authError) {
					console.debug('🔒  you are here → owner.getToken.authError');
					return Promise.reject(authError);
				}

				const token = new Token(body, {key: this.key});

				return token;
			});
		// .catch(error => {
		// 	console.debug('you are here → owner.getToken error');
		// 	console.error(error);
		// 	console.debug(`typeof error: ${JSON.stringify(typeof error, null, 2)}`);
		// 	console.debug(`error: ${error.toJSON()}`);

	}

	getAuthError(response) {
		const message = ERROR_RESPONSES[response.body.error] || response.body.error_description || response.body.error;

		if (message) {
			const authErr = new Error(message);
			authErr.body = response.body;
			authErr.code = 'ERROR';
			//   return authErr;
			return authErr;
		}

		if (response.status === 401) {
			var statusErr = new Error('access_denied');
			statusErr.status = response.status;
			statusErr.body = response.body;
			statusErr.code = 'ERROR';
			return statusErr;
		}

		if (response.status < 200 || (response.status >= 399 && response.status >= 499)) {
			const statusErr = new Error(`HTTP status ${response.status}`);
			statusErr.status = response.status;
			statusErr.body = response.body;
			statusErr.code = 'ERROR';
			return statusErr;
		}

		if (response.status >= 500) {
			const statusErr = new Error('server_error');
			statusErr.status = response.status;
			statusErr.code = 'ERROR';
			return statusErr;
		}
	}
}

const ERROR_RESPONSES = {
	invalid_request: 'The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed.',
	invalid_client: 'Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method).',
	invalid_grant: 'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.',
	unauthorized_client: 'The client is not authorized to request an authorization code using this method.',
	unsupported_grant_type: 'The authorization grant type is not supported by the authorization server.',
	access_denied: 'The resource owner or authorization server denied the request.',
	unsupported_response_type: 'The authorization server does not support obtaining an authorization code using this method.',
	invalid_scope: 'The requested scope is invalid, unknown, or malformed.',
	server_error: 'The authorization server encountered an unexpected condition that prevented it from fulfilling the request. (This error code is needed because a 500 Internal Server Error HTTP status code cannot be returned to the client via an HTTP redirect.),
	temporarily_unavailable: 'The authorization server is currently unable to handle the request due to a temporary overloading or maintenance of the server.',
};

module.exports = Owner;
