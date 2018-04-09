// User-Agent header and software name
const userAgent = 'Reginaldo Web Downloader';
// Expected content type
const acceptContent = 'text/plain;q=0.9,text/html,application/xhtml+xml,application/xml;q=0.8,*/*;q=0.7';
// Expected languages
const acceptLanguage = 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3';
// Maximum of redirections accepted to avoid infinite loop
const maxRedirects = 3;

// Sets the parameters expected
const opt = require('./getopt').create([
	['o', '=',	'arquivo para salvar (padrão: saída padrão)'],
	['h', '',	'mostra esta ajuda'],
	['x', '',	'mostrar cabeçalhos recebidos']
]).parseSystem();

// If help parameter were requested, show it and quit
if (opt.options.h) {
	opt.showHelp();
	process.exit(0)
}

const net = require('net');
const tls = require('tls');
const fs = require('fs');
const lib = require('./lib');

var request = process.argv[2], urlparts = request ? parseurl(request) : false, countredirects = 0, output;

// Requires a URL as a parameter from console
if (!urlparts) {
	console.error('Você deve especificar a URL.');
	process.exit(1)
}

// If a host is not set in the URL, quit
if (!urlparts.host) {
	console.error('Você deve especificar um host para estabelecer conexão.');
	process.exit(1)
}

// If a file is set to output stream, try to create the file.
// If there is no file set, use standard output.
try {
	output = opt.options.o ? fs.createWriteStream(/^\s*\//.test(opt.options.o) ? opt.options.o : './' + opt.options.o) : process.stdout
} catch (x) {
	console.error('O arquivo não pode ser criado ou modificado.');
	process.exit(5)
}

// Defines the class for HTTP standard request
function Request() {
	var
		set = {Host: '', 'User-Agent': userAgent, Accept: acceptContent, 'Accept-Language': acceptLanguage, Connection: 'close'},
		method = 'GET',
		uri = '/',
		data = '';

	this.setHeader = function(name, value){
		set[name] = value;
		return this
	};

	this.setMethod = function(m){
		method = m.toUpperCase()
	};

	this.setData = function(vdata){
		data = vdata;
		return this
	};

	this.setURI = function(u){
		uri = u;
		return this
	};

	// Sets the HTTP request
	this.toString = function(){
		var r = method + ' ' + uri + ' HTTP/1.1', i;
		for (i in set)
			r += "\r\n" + i + ': ' + set[i];
		if (!'Content-Length' in set)
			r += "\r\nContent-Length: " + data.length;
		r += "\r\n\r\n";
		if (data instanceof Buffer) {
			var buffer = new Buffer(r);
			return Buffer.concat([buffer, data], buffer.length + data.length);
		}
		return r + data
	}
}

// Segments URL string into separated components. Returns false when bad.
function parseurl(url) {
	var matches = url.match(/^((.*?):\/\/)?(.*?)(:(\d+))?(\/.*?)?(\?(.*?))?(#(.*))?$/);
	return matches ? {
		protocol: (matches[2] || 'http').toLowerCase(),
		host: matches[3] ? matches[3].toLowerCase() : undefined,
		port: matches[5],
		uri: matches[6] || '/',
		query: matches[8],
		hash: matches[10]
	} : false
}

function fetch(urlparts) {
	// Opens a SSL/TLS stream when "https" is used. Otherwise, use clear text stream.
	(urlparts.protocol == 'https' ? tls.connect : net.createConnection)(urlparts.port || (urlparts.protocol == 'https' ? 443 : 80), urlparts.host, function(){
		var socket = this, buffer = new Buffer(''), pos = 4, headers, matches, location, size = 0;

		// Forward data received into the output set
		function writedata(){
			size += buffer.length - pos;
			output.write(pos ? buffer.slice(pos) : buffer)
		}

		socket.on('data', (data) => {
			// If all headers were already read, all buffer is remaining data only.
			// Then, forward socket data into output efficiently.
			if (headers) {
				pos = 0;
				buffer = data;
				writedata()
			} else {
				// Otherwise, read till headers are over
				// by concatenating next received data into buffer.
				buffer = Buffer.concat([buffer, data]);

				// Loops till finding out empty line that separates
				// headers from requested content.
				while (pos < buffer.length) {
					if (/(\r\n|\n\r|\n){2}$/.test(buffer.slice(pos - 3, pos + 1) + '')) {
						// Get headers and format them in order to easy handling
						(matches = (buffer.slice(0, pos) + '').split(/[\r\n]+/)).splice(-1, 1);
						headers = {};
						matches.forEach((header) => {
							if (header.length) {
								var parts = header.split(':');
								headers[parts[0].replace(/\s+$/, '').toUpperCase()] = parts.slice(1).join(':').replace(/^\s+/, '')
							}
						});

						// Check if first line matches HTTP standard
						if (matches = matches[0].match(/^HTTP\/1\.[01]\s+(\d+)\s+(.+)/)) {
							// If the header "Location" is set, format the received
							// URL for redirection.
							if (location = headers['LOCATION'] ? parseurl(headers['LOCATION']) : false) {
								location.protocol = location.protocol || urlparts.protocol;
								location.host = location.host || urlparts.host;
								location.port = location.port || urlparts.port
							}

							// Check HTTP status
							switch (parseInt(matches[1])) {
								case 200:
									console.error('Recurso obtido com sucesso.');
									break;

								case 301:
								case 302:
								case 303:
									break;

								case 403:
									console.error('Acesso proibido.');
									process.exit(3);

								case 404:
									console.error('Recurso não encontrado.');
									process.exit(3);

								default:
									console.error('O servidor retornou o estado ' + matches[1] + ' com a informação "' + matches[2] + '" para o recurso solicitado.');
									process.exit(3)
							}

							// If the "Location" header were set,
							// prepare for redirection.
							if (location) {
								socket.destroy();

								// If the maximum redirections count were
								// reached, quit. Otherwise, redirect.
								if (countredirects++ < maxRedirects) {
									console.error('Redirecionamento ' + (matches[1] == 301 ? 'permanente' : 'temporário') + ' para "' + (location.protocol != urlparts.protocol || location.host != urlparts.host || location.port != urlparts.port ? location.protocol + '://' + location.host + (location.port && location.port != 80 ? ':' + location.port : '') : '') + location.uri + (location.query ? '?' + location.query : '') + '"...');

									return fetch(location)
								} else {
									console.error('Tentativa de redirecionamento ' + (matches[1] == 301 ? 'permanente' : 'temporário') + ' para "' + (location.protocol != urlparts.protocol || location.host != urlparts.host || location.port != urlparts.port ? location.protocol + '://' + location.host + (location.port && location.port != 80 ? ':' + location.port : '') : '') + location.uri + (location.query ? '?' + location.query : '') + '" bloqueado, porque excedeu o número de ' + maxRedirects + ' tentativa(s).');
									process.exit(4)
								}
							}

							++pos;

							// Print the received headers, if the
							// parameter "x" were set.
							if (opt.options.x)
								console.error("\nCabeçalho da resposta:\n" + (buffer.slice(0, pos) + '').replace(/(\r|[\r\n]+$)/g, '') + "\n");

							// Forward stream from socket into output
							writedata()
						} else {
							console.error('A resposta não corresponde ao protocolo HTTP.');
							process.exit(2)
						}

						break
					}
					++pos
				}
			}
		}).on('end', function(){
			// At the end of transmission, print statistics out.
			console.error('Recebido ' + lib.formatNumber(size) + ' bytes' + (size >= 1000 ? ' (≈ ' + lib.humanSizeFormat(size) + ')' : '') + '.')
		});

		// Send HTTP request into the socket to the Web Server
		socket.write(new Request().setURI(urlparts.uri + (!(urlparts.query || '') ? '' : '?' + urlparts.query)).setHeader('Host', urlparts.host).toString())
	}).on('error', function(){
		console.error('Falha ao conexão em "' + urlparts.host + ':' + (urlparts.port || (urlparts.protocol == 'https' ? 443 : 80)) + '".')
	})
}

fetch(urlparts)
