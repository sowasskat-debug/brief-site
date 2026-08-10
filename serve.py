import http.server, functools
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory='/Users/pacio/Documents/brief-site')
http.server.test(HandlerClass=Handler, port=8765, bind='127.0.0.1')
