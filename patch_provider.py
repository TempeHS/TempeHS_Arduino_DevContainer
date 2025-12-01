
import sys
file_path = '/home/vscode/.vscode-remote/extensions/vscode-arduino.vscode-arduino-community-0.7.2-linux-x64/out/src/arduino/arduinoContentProvider.js'
with open(file_path, 'r') as f:
    content = f.read()

old_line = 'var url = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(type))).toString()}"; url += (url.indexOf("?") === -1 ? "?" : String.fromCharCode(38)) +'
new_line = 'var baseUrl = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(""))).toString()}"; if (baseUrl.slice(-1) !== "/") baseUrl += "/"; var url = baseUrl + "${type}"; url += (url.indexOf("?") === -1 ? "?" : String.fromCharCode(38)) +'

if old_line in content:
    new_content = content.replace(old_line, new_line)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print('Successfully patched arduinoContentProvider.js')
else:
    print('Could not find target string to replace')
