import os from "os";
import fs from "fs";
import path from "path";
import { downloadFile } from "../utils/request.js";
import { execProcess } from "../utils/exec.js";

const OutputDir = path.join(__dirname, "..", ".bin", "CredentialProvider.Microsoft");
const CredentialProviderVersion = "1.4.1";

interface CredentialProviderResponse {
    Username: string;
    Password: string;
}

export async function credentialProviderPat(registry: string): Promise<CredentialProviderResponse> {
    const nugetFeedUrl = toNugetUrl(registry);
    const toolPath = await getCredentialProvider();
    return await invokeCredentialProvider(toolPath, nugetFeedUrl);
}

function toNugetUrl(registry: string): string {
    return "https://" + registry.replace("/npm/registry/", "/nuget/v3/index.json")
}

async function invokeCredentialProvider(toolPath: string, nugetFeedUrl: string): Promise<CredentialProviderResponse> {
    let response = "";
    await execProcess(toolPath, ["-U", nugetFeedUrl, "-I", "-F", "Json"], {
        stdio: "pipe",
        processStdOut: (data: string) => {
            response += data;
        },
        processStdErr: (data: string) => {
            console.error(data);
        }
    });
    try {
        let value = JSON.parse(response);
        return value as CredentialProviderResponse
    } catch (error) {
        throw new Error(`Failed to parse CredentialProvider output: ${response}`);
    }
}


async function getCredentialProvider(): Promise<string> {
    let toolPath = path.join(os.homedir(), ".nuget", "plugins", "netcore", "CredentialProvider.Microsoft", "CredentialProvider.Microsoft.exe");
    if (!fs.existsSync(toolPath)) {
        let toolPath = path.join(OutputDir, "plugins", "netcore", "CredentialProvider.Microsoft", "CredentialProvider.Microsoft");
        if (!fs.existsSync(toolPath)) {
            await downloadCredentialProvider();
            fs.chmodSync(toolPath, 0o755);
        }
    }
    return toolPath;
}

async function downloadCredentialProvider(): Promise<void> {
    const downloadUrl = `https://github.com/microsoft/artifacts-credprovider/releases/download/v${CredentialProviderVersion}/Microsoft.Net8.${os.platform()}-${os.arch()}.NuGet.CredentialProvider.tar.gz`
    const downloadPath = path.join(OutputDir, "CredentialProvider.Microsoft.tar.gz");

    console.log(`🌐 Downloading ${downloadUrl}`);
    await downloadFile(downloadUrl, downloadPath);
    await execProcess("tar", ["-xzf", downloadPath, "-C", OutputDir], { stdio: "inherit" });
}

