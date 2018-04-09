// The name of the server (returned by "Server" header)
const serverName = 'Reginaldo Web Server';

// The order to look for indexes file
const indexesOrder = ['index.html', 'index.htm'];

// Is it to do cache?
const doCache = true;


// Check if the document root parameter were supplied
if (!process.argv[2]) {
	console.error('Deve-se informar o caminho para a pasta que será o "Document Root" no primeiro parâmetro.');
	process.exit(2)
}

// Set port 80 as default and fix path for relative or absolute
var count = 0, documentRoot = /^\s*\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2], port = 80;

const fs = require('fs');

// Check if the document root path parameter is a folder and translate it into an absolute path
try {
	documentRoot = fs.realpathSync(/^\s*\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2]);
	if (!fs.statSync(documentRoot).isDirectory()) {
		console.error('O caminho informado para "Document Root" (' + process.argv[2] + ') deve ser uma pasta.');
		process.exit(3)
	}
} catch (x) {
	console.error('O caminho informado para "Document Root" (' + process.argv[2] + ') não foi encontrado.');
	process.exit(4)
}

// Validate port if it were supplied
if (process.argv[3]) {
	port = parseInt(process.argv[3]);
	if (!/^\d+$/.test(process.argv[3]) || port < 1 || port > 65535) {
		console.error('A porta deve ser um número entre 1 e 65535. O valor "' + process.argv[3] + '" foi informado.');
		process.exit(5)
	}
}

const net = require('net');
const lib = require('./lib');
const knownStatuses = {
	200: 'OK',
	301: 'Moved Permanently',
	304: 'Not Modified',
	400: 'Bad Request',
	403: 'Forbidden',
	404: 'Not Found',
	500: 'Internal Server Error'
};
const mimeByExtension = {};

// Define the class for the HTTP standard reply
function Reply() {
	var
		set = {Date: lib.formatDate(), Server: serverName, 'Content-Type': 'text/plain;charset=UTF-8', Connection: 'close'},
		code = '200 OK',
		data = '';

	this.setHeader = function(name, value){
		set[name] = value;
		return this
	};

	this.setReplyType = function(vcode, description){
		code = vcode + (description ? ' ' + description : (knownStatuses[vcode] ? ' ' + knownStatuses[vcode] : ''));
		return this
	};

	this.setData = function(vdata){
		data = vdata;
		return this
	};

	// Makes the HTTP standard reply
	this.toString = function(output){
		var r = 'HTTP/1.1 ' + code, i;
		for (i in set)
			r += "\r\n" + i + ': ' + set[i];
		if (!!data && !('Content-Length' in set))
			r += "\r\nContent-Length: " + data.length;

		// Is it to output log in console?
		// Output defines the user reply id
		if (output)
			console.log(output + ": cabeçalhos enviados:\n" + output + ':    ' + r.replace(/[\r\n]+/g, "\n" + output + ':    '));

		r += "\r\n\r\n";
		if (data instanceof Buffer) {
			var buffer = new Buffer(r);
			return Buffer.concat([buffer, data], buffer.length + data.length);
		}
		return r + data
	}
}

// Call it when user sends a bad request
function badRequest(replyid, socket) {
	socket.write(new Reply().setReplyType(400).setData('Requisição mal formada').toString(replyid));
	socket.end()
}

// Call it when a resource is not found
function notFound(replyid, socket) {
	serverMessage(replyid, socket, 404, 'Recurso não encontrado')
}

// Call it when a resource is forbidden
function forbidden(replyid, socket) {
	serverMessage(replyid, socket, 403, 'Acesso proibido')
}

// Call it when move permanently redirection is required
function movePermanently(replyid, socket, uri) {
	serverMessage(replyid, socket, getDefaultReply(301, 'Alteração permanente de localização para "' + uri + '"').setHeader('Location', uri))
}

// Call it whenever identified an unknown error
function internalServerError(replyid, socket) {
	serverMessage(replyid, socket, 500, 'Erro interno no servidor')
}

// The default server information page
function getDefaultReply(code, title, data) {
	return new Reply().setHeader('Content-Type', 'text/html;charset=UTF-8').setReplyType(code).setData('<!DOCTYPE html><html lang="pt-br"><head><title>' + title + '</title></head><body><img src="data:image/png;base64,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" style="display:inline-block;vertical-align:middle"><span style="margin-left:10px;font-size:14pt;vertical-align:middle">' + title + '</span>' + (data || '') + '</body></html>')
}

// Sets the web server status reply page
function serverMessage(replyid, socket, code, title, data) {
	socket.write((code instanceof Reply ? code : getDefaultReply(code, title, data)).toString(replyid));
	socket.end()
}

function parseQueries(string) {
	var queries = {}, parts;
	string.split('&').forEach(function(query){
		parts = query.split('=');
		queries[parts[0]] = parts[1] ? decodeURIComponent(parts[1]) : undefined
	});
	return queries
}

// Import known MIME from "/etc/mime.types"
function parseMime() {
	try {
		var i, tokens;
		(fs.readFileSync('/etc/mime.types') + '').split(/[\r\n]+/).forEach(function(line){
			if (!/^\s*#/.test(line) && (tokens = line.split(/\s+/)).length > 1)
				for (i = 1; i <= tokens.length; ++i)
					mimeByExtension[tokens[i]] = tokens[0]
		});
		console.log('MIMEs conhecidos importados com sucesso.')
	} catch (e) {
		console.log('Falha ao realizar o parse dos MIMEs conhecidos.')
	}
}

// Creates callee support in order to reply user agent request
net.createServer((socket) => {
	// Gets next request id
	var replyid = ++count;

	// If the calling IPv4 address is in the "::ffff:000.000.000.000"
	// format, remove the first characters till ":" and print it.
	console.log(replyid + ': conexão estabelecida com o dispositivo em "' + (/\d+(\.\d+){3}$/.test(socket.remoteAddress) ? socket.remoteAddress.replace(/.*:/, '') : socket.remoteAddress) + '"...');

	socket.on('end', () => {
		console.log(replyid + ': conexão encerrada.')
	}).on('error', function(){
		console.log(replyid + ': falha na conexão do usuário.')
	}).on('data', (data) => {
		// Split request lines
		var lines = (data + '').split(/[\r\n]+/), dumpheaders;
		if (lines.length < 2) return badRequest(replyid, socket);

		var tokensrequest = lines[0].split(/\s+/), headers = {};
		// Check first line tokens counting and HTTP version
		if (tokensrequest.length != 3 || !/HTTP\/1\.[01]/.test(tokensrequest[2])) return badRequest(replyid, socket);

		// Check request method
		switch (tokensrequest[0]) {
			case 'GET':
			case 'POST':
				console.log(replyid + ": requisição HTTP válida.");
				break;

			default:
				console.log(replyid + ": requisição HTTP inválida.");
				return badRequest(replyid, socket);
		}

		// Get request headers and print them out
		console.log(replyid + ": cabeçalho(s) recebido(s):");
		dumpheaders = replyid + ':    ' + lines[0];
		lines.slice(1).some(function(header){
			if (header.length) {
				dumpheaders += "\n" + replyid + ':    ' + header;
				var parts = header.split(':');
				headers[parts[0].replace(/\s+$/, '').toUpperCase()] = parts.slice(1).join(':').replace(/^\s+/, '')
			} else
				return true
		});
		console.log(dumpheaders);

		// Clean URL query and fragment parts to get the requested file path
		var uri = tokensrequest[1].replace(/[#\?].*$/g, ''), queries = {};
		console.log(replyid + ': acesso à URL "' + uri + '" pelo método "' + tokensrequest[0] + '".');

		// Remove URL request fragment and parse query (from # on, it is exists)
		if (/\?.+(#|$)/.test(tokensrequest[1]))
			queries = parseQueries(tokensrequest[1].replace(/^.*\?|#.*$/g, ''));

		fs.stat(documentRoot + '/' + uri, function(error, stats){
			if (error)
				return notFound(replyid, socket);

			// Check if the requested file is in document root only. Otherwise, forbid its access
			try {
				if (fs.realpathSync(documentRoot + '/' + uri).indexOf(documentRoot) != 0)
					return forbidden(replyid, socket)
			} catch (x) {
				return notFound(replyid, socket)
			}

			if (stats.isDirectory())
				// If the folder URI does not trail slash bar,
				// redirect permanently into the fixed one
				if (!/\/$/.test(uri))
					return movePermanently(replyid, socket, uri + '/');
				else {
					var index;

					// Remove trailing slash bars from URI
					uri = uri.replace(/\/+$/, '');

					// Try to find out index file
					indexesOrder.some(function(e, x){
						try {
							if ((stats = fs.statSync(documentRoot + '/' + uri + '/' + e)).isFile())
								return uri += '/' + (index = e)
						} catch (x) {}
					});

					// If there is no index file in folder, then show its files
					if (!index) {
						fs.readdir(documentRoot + '/' + uri, function(error, files){
							var title, list, size;

							if (files.length) {
								title = 'Arquivo(s) da pasta na URI "' + (!uri ? '/' : uri) + '"';
								list = '<style type="text/css">.icon{display:inline-block;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAgCAYAAAAbifjMAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4gQJBCMIqKuu7AAAAmZJREFUSMfFlc1OU1EQx39z7rm9/VCwNSBFk6bVssIFC7c+gk/gDuLOlVsTXwC3Jm6IryCsWLMyJiSs3IEKLSEXEGMt0Ht7xkVr00s/tLJwkrO6c2b+8zszc+GaJn/jlJ8y8vjRjXQmkFzvjuI+7V6eynzBSrWYklGRZmes9/rV/Ops3ltBCPq/RZGuy96bB6u3b9rngDdMn70jYmcFEaSbRQBUUUDtdLr9NI7afvdrQoiXNdgZCyiooDqYwrZaLU88Aem7LOBPWfySh6pDEDoJB/nZzH1fgoIdgVNR1bGsbapg8opLCBgIM0R7LwCo/MlpnFlVles0klV11+pE65zTLtKJlCidZ7Gu7VQE+RcCqqjdren7mTxPJgWhwMkZ61IqWinfswXATBjDfanHp/x365W+ubn5rFqtvnUu+azGGH42GqwsL6c/fPx4OaQTO9Zut++WSiWiKEo4eJ7H57091jc2LpaWljL1w8OLRIJ+sHEco6qJ45yjFUWkgoDt7e3z+WIxPTyAdMYpDENOjo97JwxDPGNoNptkMhl2dnbO362t5QdKkE4Z5Kenk5CMoR3HHIchh/U6xvMolcsvgJeJAL+b4+vBAcaYAdK+72OMoVypsLW1FQ8o6CzJiIWFhZGjLSI0m83hryAiqCrfz87GT5/v97brYAnO8aPRSDhc3Uy3rjBKBGg7RyoIRs61dn1GlgBQGwKxNz3OUalURpfQarV4uLiIGwHRiPDtCiPb3/NGhKOjo7EQ0+l0QqEFsoA9qNUuinNzxHEMo/6Uqlhr2d/fbwF5IALwcrlcMOFC8bLZbADYX98u9R8ompeYAAAAAElFTkSuQmCC") no-repeat 0 0;width:16px;height:16px}.icon.file{background-position:0 -16px}table{margin-top:20px}td{padding:2px 20px}table a{text-decoration:none}</style><table><tr><th>Nome</th><th>Tamanho</th></tr>';
								files.forEach(function(file){
									var stat;
									try {
										size = (stat = fs.statSync(documentRoot + '/' + uri + '/' + file)).size
									} catch (x) {
										// If an error prevents from getting file size,
										// then show a dash sign
										size = '&#65293;'
									}
									list += '<tr><td><a href="' + encodeURIComponent(file) + '"><i class="icon' + (stat && stat.isDirectory() ? '' : ' file') + '"></i> ' + file + '</a></td><td>' + lib.humanSizeFormat(size) + '</td></tr>'
								});
								list += '</table>'
							} else
								title = 'A pasta requisitada em "' + (!uri ? '/' : uri) + '" não tem arquivo(s)';

							socket.write(getDefaultReply(200, title, list).toString(replyid), null);
							socket.end()
						});
						return
					}
				}

			// If cache is allowed, then check client "If-Modified-Since" header.
			// If it's set and the client cached content is updated, then
			// do not send the file content again and reply to the client
			// its data is ok.
			if (doCache && headers['IF-MODIFIED-SINCE'])
				if (lib.formatDate(new Date(headers['IF-MODIFIED-SINCE'])) == lib.formatDate(new Date(stats.mtime))) {
					socket.write(new Reply().setReplyType(304).toString(replyid));
					socket.end();
					return
				}


			// Creates a stream for the requested file and gets
			// MIME based on file name extension
			var readstream = fs.createReadStream(documentRoot + '/' + uri).on('error', function(error){
				switch (error.code) {
					case 'ENOENT':
						return notFound(replyid, socket);
					default:
						return internalServerError(replyid, socket)
				}
			}), mime = mimeByExtension[uri.replace(/.*\./, '').toLowerCase()], reply = new Reply().setHeader('Content-Length', stats.size);

			// If a MIME for the file name extension were found, set it in header.
			if (mime) reply.setHeader('Content-Type', mime);

			// Send "Last-Modified" header, if cache is allowed
			if (doCache)
				try {
					reply.setHeader('Last-Modified', lib.formatDate(fs.statSync(documentRoot + '/' + uri).mtime))
				} catch (x) {}

			// Send headers
			socket.write(reply.toString(replyid), null);
			// Send file using memory efficiently by pipe between streams
			readstream.pipe(socket)
		})
	})
}).on('error', (error) => {
	console.log('Não foi possível ouvir na porta ' + port + '.');
	process.exit(1)
}).listen(port, () => {
	parseMime();
	console.log('Servidor ouvindo na porta ' + port + '.\nServindo "' + documentRoot + '" como Document Root.');
})
