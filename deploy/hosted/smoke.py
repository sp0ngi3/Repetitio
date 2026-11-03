"""Run inside the broker container after starting the private stack."""

import json
import sys
import urllib.error
import urllib.request

origin = sys.argv[1]
base = "http://api:8080"


def request(path, body=None, request_origin=origin):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        base + path, data=data,
        headers={"Content-Type": "application/json", "Origin": request_origin},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, None


path = "/api/basics/matrix-read-and-update"
status, exercise = request(path)
assert status == 200 and exercise["referenceSolution"], (status, exercise)


def execute(code, request_origin=origin):
    return request(path + "/execute", {"sourceCode": code, "timeoutMs": 2000}, request_origin)


reference = exercise["referenceSolution"]
status, result = execute(reference, "https://wrong-origin.invalid")
assert status == 403, (status, result)
status, result = execute(reference)
assert status == 200 and result["passed"], (status, result)
status, result = execute("this is not C#")
assert status == 200 and not result["compiled"] and result["compilerOutput"], (status, result)

probe = """
public static class Solution
{
    public static int ReadAndUpdate(int[,] matrix, int row, int col, int newValue)
    {
        foreach (var path in new[] { "/data", "/backups", "/run/runner-docker.sock", "/var/run/docker.sock" })
            if (System.IO.Directory.Exists(path) || System.IO.File.Exists(path))
                throw new Exception("Application path exposed: " + path);
        if (System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
            .Any(device => device.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Loopback))
            throw new Exception("Unexpected network interface");
        var old = matrix[row, col];
        matrix[row, col] = newValue;
        return old;
    }
}
"""
status, result = execute(probe)
assert status == 200 and result["passed"], (status, result)
status, result = execute(probe.replace("return old;", "while (true) { }"))
assert status == 200 and result["timedOut"], (status, result)
status, result = execute(probe.replace("return old;", 'while (true) Console.WriteLine(new string(\'x\', 4096));'))
assert status == 200 and result["timedOut"], (status, result)
status, result = execute(reference)
assert status == 200 and result["passed"], (status, result)
print("Hosted runner passed origin, compilation, isolation, timeout, output flood and recovery checks.")
