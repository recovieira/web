# **Reginaldo Web Server** and **Web Downloader**
**Reginaldo Web Server** and **Reginaldo Web Downloader** are very simple Web Apps written by Reginaldo Coimbra Vieira for his Master Degree Program. They were practical activities by **Ph.D. Professor Flávio Luiz Schiavoni** for his Computer Network class.

Written in Node.js.

### TOC
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Running **Reginaldo Web Server**](#running-reginaldo-web-server)
  - [Running **Reginaldo Web Downloader**](#running-reginaldo-web-downloader)
- [Files/Folder Structure](#filesfolder-structure)
- [Built With](#built-with)
- [Changelog](#changelog)
- [Author](#author)
- [License](#license)


### Getting Started
In order to run **Reginaldo Web Server** (server.js) and **Reginaldo Web Downloader** (client.js), you need to have the prerequisites below installed on your machine.

#### Prerequisites
  - Node.js

#### Running **Reginaldo Web Server**
Type the following command:

```sh
$ git clone https://github.com/recovieira/web.git web
$ cd web
$ node server <path_to_the_document_root_folder> <port_number>
```

If the "port_number" parameter were not specified, it will be set to 80 by default.

Examples of valid commands are:

```sh
$ node server /var/www      # same as "node server /var/www 80"
```

```sh
$ node server ./ 8080       # current folder as document root and 8080 as HTTP port
```

```sh
$ node server ./wwwroot 80  # use "wwwroot" as document root and 80 as HTTP port
```

Stop it with both Ctrl+C keys whenever you want to.


#### Running **Reginaldo Web Downloader**
Type the following command, if you have not got the source code yet:

```sh
$ git clone https://github.com/recovieira/web.git web
$ cd web
```

Valid parameters are:

```sh
$ node client -h
Usage:
  node client [OPTION]

Options:
  -o file to save (default: standard output)
  -h show this help
  -x show received headers
```

Examples:

```sh
$ node client 127.0.0.1 -x
$
$ node client 127.0.0.1 -x > save_to_a_file
$ node client 127.0.0.1 -x -o or_save_it_this_way
$
$ node client 127.0.0.1 -x > /dev/null # to test transfering only
$
$ node client www.anydomain.whatevertld/whateverpath # default: port 80 and http protocol
$ node client www.anydomain.whatevertld:8080/whateverpath # default: http protocol
$ node client http://www.anydomain.whatevertld:8080/whateverpath
$ node client https://www.anydomain.whatevertld:8181/whateverpath
```

### Files/Folder Structure
Brief content structure:

```
├── client.js			# the **Reginaldo Web Downloader**
├── getopt.js			# extra lib (node-getopt)
├── lib.js			# extra functions written by Reginaldo
├── LICENSE
├── README.md			# this info :)
├── server.js			# the Reginaldo Web Server
└── wwwroot			# a document root folder sample
    └── index.html
```

### Built With
- [node-getopt](https://www.npmjs.com/package/node-getopt)

### Changelog
#### V 1.0.0
Initial Release

### Author
Reginaldo Coimbra Vieira (recovieira@gmail.com)

### License
**Reginaldo Web Server** and **Reginaldo Web Downloader** are licensed under The MIT License (MIT). You can use, copy, modify, merge, publish, distribute, sublicense and/or sell copies of the final products, but you always need to state that Reginaldo Coimbra Vieira (recovieira@gmail.com) is the original author of these simple codes and assign a link to https://github.com/recovieira/web.
