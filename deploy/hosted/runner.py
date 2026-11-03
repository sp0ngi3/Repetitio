"""Private broker. Only this service has access to the dedicated runner engine."""

import json
import os
import re
import selectors
import socketserver
import sys
import subprocess
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

MAX_REQUEST = 128 * 1024
MAX_OUTPUT = 256 * 1024
DOCKER = ["docker", "--host", "unix:///run/runner-docker.sock"]
IMAGE_TAG = "repetitio-basics-sandbox:latest"


def run_submission(body, image_id):
    name = f"repetitio-job-{uuid.uuid4().hex}"
    options = [
        "--name", name, "--rm", "--interactive", "--pull=never",
        "--runtime=runsc", "--network=none", "--read-only", "--user=1654:1654",
        "--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777",
        "--cap-drop=ALL", "--security-opt=no-new-privileges",
        "--pids-limit=64", "--memory=384m", "--memory-swap=384m", "--cpus=1",
        "--log-driver=none", "--env=HOME=/tmp", "--env=DOTNET_CLI_HOME=/tmp",
        "--env=DOTNET_EnableDiagnostics=0",
    ]
    try:
        # Create before attaching so the job has a known cleanup target even when the client disconnects.
        subprocess.run(DOCKER + ["create", *options, image_id], check=True, timeout=5,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with subprocess.Popen(DOCKER + ["start", "-ai", name], stdin=subprocess.PIPE,
                              stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as process:
            try:
                output = exchange(process, body + b"\n")
                if process.wait(timeout=1) != 0:
                    raise RuntimeError("Sandbox exited before returning a result")
                return json.loads(output)
            finally:
                if process.poll() is None:
                    process.kill()
    finally:
        subprocess.run(DOCKER + ["rm", "-f", name], timeout=3,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def exchange(process, body):
    deadline = time.monotonic() + 14
    remaining = memoryview(body)
    output = bytearray()
    with selectors.DefaultSelector() as selector:
        for stream, event in [(process.stdin, selectors.EVENT_WRITE), (process.stdout, selectors.EVENT_READ)]:
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, event)
        while selector.get_map():
            budget = deadline - time.monotonic()
            if budget <= 0:
                raise TimeoutError("Sandbox deadline exceeded")
            for key, event in selector.select(budget):
                stream = key.fileobj
                if event == selectors.EVENT_WRITE:
                    remaining = remaining[os.write(stream.fileno(), remaining):]
                    if not remaining:
                        selector.unregister(stream)
                        stream.close()
                else:
                    chunk = os.read(stream.fileno(), 8192)
                    if not chunk:
                        selector.unregister(stream)
                        continue
                    output.extend(chunk)
                    if len(output) > MAX_OUTPUT:
                        raise ValueError("Sandbox output limit exceeded")
    return output


class RunnerHandler(BaseHTTPRequestHandler):
    image_id: str

    def address_string(self):
        return super().address_string() if isinstance(self.client_address, tuple) else "local"

    def setup(self):
        self.request.settimeout(3)
        super().setup()

    def do_POST(self):
        if self.path != "/execute":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_REQUEST:
                self.send_error(413)
                return
            body = self.rfile.read(length)
            if len(body) != length:
                self.send_error(400)
                return
            submission = json.loads(body)
            if not isinstance(submission, dict) or not isinstance(submission.get("slug"), str) or not re.fullmatch(
                r"[a-z0-9-]{1,100}", submission["slug"]
            ):
                self.send_error(400)
                return
            request = submission.get("request")
            if not isinstance(request, dict) or not isinstance(request.get("sourceCode"), str) or not (
                0 < len(request["sourceCode"]) <= 20_000
            ):
                self.send_error(400)
                return
        except (ValueError, TimeoutError, UnicodeError):
            self.send_error(400)
            return

        try:
            result = run_submission(body, self.image_id)
            response = json.dumps(result, ensure_ascii=False).encode("utf-8")
            if not isinstance(result, dict) or len(response) > MAX_OUTPUT:
                raise ValueError("Invalid sandbox response")
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
            self.log_error("Sandbox request failed (%s)", type(error).__name__)
            self.send_error(503, "Sandbox unavailable")
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


if __name__ == "__main__":
    host_service = sys.argv[1:] == ["--host-service"]
    if sys.argv[1:] and not host_service:
        raise SystemExit("Unknown runner arguments")
    if host_service:
        DOCKER = ["docker", "--host", "unix:///var/run/docker.sock"]
    elif os.getuid() == 0:
        raise SystemExit("Run the broker as the dedicated socket owner, not root")
    info = json.loads(subprocess.check_output(DOCKER + ["info", "--format", "{{json .}}"], timeout=10))
    rootless = any("name=rootless" in option for option in info.get("SecurityOptions") or [])
    if (
        rootless == host_service
        or info.get("CgroupDriver") != "systemd"
        or str(info.get("CgroupVersion")) != "2"
        or "runsc" not in info.get("Runtimes", {})
        or not all(info.get(key) for key in ("MemoryLimit", "SwapLimit", "CPUCfsQuota", "PidsLimit"))
    ):
        raise SystemExit("Runner requires the configured Docker engine with runsc and systemd cgroup v2 limits")
    image_id = subprocess.check_output(
        DOCKER + ["image", "inspect", "--format", "{{.Id}}", IMAGE_TAG], timeout=10, text=True
    ).strip()
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", image_id):
        raise SystemExit("Expected a local sandbox image ID")
    RunnerHandler.image_id = image_id
    # One job at a time. The public API rejects additional concurrent submissions.
    if host_service:
        os.umask(0o077)
        with socketserver.UnixStreamServer("/var/lib/repetitio-basics/execute.sock", RunnerHandler) as server:
            server.serve_forever()
    else:
        HTTPServer(("0.0.0.0", 8090), RunnerHandler).serve_forever()
