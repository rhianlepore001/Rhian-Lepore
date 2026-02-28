const https = require('https');
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '.antigravity', 'rules', 'agents');

function fetchApi(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'node.js', 'Accept': 'application/vnd.github.v3+json' } }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    console.error('Failed to fetch', url, res.statusCode, data);
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log('Fetching directory contents from GitHub...');
    const contents = await fetchApi('https://api.github.com/repos/SynkraAI/aios-core/contents/.antigravity/rules/agents');
    if (!contents) {
        console.error('Could not fetch contents. Aborting.');
        return;
    }

    if (fs.existsSync(targetDir)) {
        console.log('Removing existing agents directory...');
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    let count = 0;
    for (const item of contents) {
        if (item.type === 'file') {
            console.log('Downloading', item.name);
            const fileData = await fetchApi(item.url);
            if (fileData && fileData.content) {
                const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
                fs.writeFileSync(path.join(targetDir, item.name), contentStr);
                count++;
            } else if (fileData && fileData.download_url) {
                // Fallback to download URL if content is missing (e.g. large file)
                await new Promise((res, rej) => {
                    https.get(fileData.download_url, { headers: { 'User-Agent': 'node.js' } }, response => {
                        const fileStream = fs.createWriteStream(path.join(targetDir, item.name));
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            count++;
                            res();
                        });
                    }).on('error', rej);
                });
            }
        }
    }
    console.log(`Successfully restored ${count} agents to ${targetDir}`);
}

run().catch(console.error);
