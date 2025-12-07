#!/usr/bin/env python3
"""
Patch the Arduino VS Code extension for Codespaces compatibility.

This script fixes URL construction in the Arduino extension's webview
so that Board Manager, Library Manager, and Examples work correctly
when VS Code is running in GitHub Codespaces with port forwarding.

Exit codes:
  0 - Already patched, no action needed
  1 - Could not patch (file not found or pattern changed)
  2 - Successfully patched, VS Code reload required
"""

import os
import sys
import glob

def find_extension_path():
    """Find the Arduino extension installation directory."""
    home = os.path.expanduser("~")
    extension_dirs = [
        os.path.join(home, ".vscode-remote/extensions"),
        os.path.join(home, ".vscode-server/extensions"),
    ]
    
    for ext_dir in extension_dirs:
        if os.path.isdir(ext_dir):
            # Find directory starting with the extension ID
            pattern = os.path.join(ext_dir, "vscode-arduino.vscode-arduino-community*")
            matches = glob.glob(pattern)
            if matches:
                return matches[0]
    return None


def main():
    ext_path = find_extension_path()
    
    if not ext_path:
        print("Arduino extension not found. Skipping patch.")
        sys.exit(0)
    
    target_file = os.path.join(
        ext_path,
        "out/src/arduino/arduinoContentProvider.js"
    )
    
    if not os.path.isfile(target_file):
        print(f"Target file not found at {target_file}. Skipping patch.")
        sys.exit(0)
    
    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    # Pattern 1: Original unpatched code (older versions)
    old_line_v1 = 'var url = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(type))).toString()}?" +'
    
    # Pattern 2: Alternative unpatched code (newer versions with different query string handling)
    old_line_v2 = 'var url = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(type))).toString()}"; url += (url.indexOf("?") === -1 ? "?" : String.fromCharCode(38)) +'
    
    # The patched replacement
    new_line_v1 = 'var baseUrl = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(""))).toString()}"; if (baseUrl.slice(-1) !== "/") baseUrl += "/"; var url = baseUrl + "${type}?" +'
    
    new_line_v2 = 'var baseUrl = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(""))).toString()}"; if (baseUrl.slice(-1) !== "/") baseUrl += "/"; var url = baseUrl + "${type}"; url += (url.indexOf("?") === -1 ? "?" : String.fromCharCode(38)) +'
    
    # Check if already patched
    if 'var baseUrl = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(""))).toString()}"' in content:
        print("arduinoContentProvider.js is already patched.")
        sys.exit(0)
    
    # Try to patch
    new_content = None
    if old_line_v1 in content:
        new_content = content.replace(old_line_v1, new_line_v1)
        print("Found pattern v1 (older extension version)")
    elif old_line_v2 in content:
        new_content = content.replace(old_line_v2, new_line_v2)
        print("Found pattern v2 (newer extension version)")
    
    if new_content:
        try:
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Successfully patched arduinoContentProvider.js")
            print("")
            print("⚠️  IMPORTANT: Reload VS Code window for patch to take effect!")
            print("   Press Ctrl+Shift+P → 'Developer: Reload Window'")
            sys.exit(2)  # Exit code 2 = patched, reload needed
        except Exception as e:
            print(f"Error writing patched file: {e}")
            sys.exit(1)
    else:
        print("Could not find target string to replace in arduinoContentProvider.js.")
        print("The extension might have been updated to a new version.")
        print("")
        # Debug: try to find the relevant section
        if "window.onload = function()" in content:
            start = content.find("window.onload = function()")
            end = content.find("document.getElementById('frame').src = url;")
            if start != -1 and end != -1:
                print("Relevant section in file:")
                print(content[start:end + 50])
        sys.exit(1)


if __name__ == "__main__":
    main()
