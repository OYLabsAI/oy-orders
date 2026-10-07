#!/usr/bin/env bash
set -euo pipefail
# Official vendor binaries, pinned and verified. The private glibc loader is
# needed by CRE 1.37 on the Sandbox image; it does not replace system libraries.
mkdir -p /data/bin /data/cre-libc
curl -fsSL https://github.com/smartcontractkit/cre-cli/releases/download/v1.37.0/cre_linux_amd64.tar.gz -o /tmp/cre.tar.gz
echo '1e660e955be607bca3ae683d5f264bb354252f6af657f0d86e56108438536503  /tmp/cre.tar.gz' | sha256sum -c -
tar -xzf /tmp/cre.tar.gz -C /data/bin
mv /data/bin/cre_v1.37.0_linux_amd64 /data/bin/cre.real
curl -fsSL https://archive.ubuntu.com/ubuntu/pool/main/g/glibc/libc6_2.39-0ubuntu8.9_amd64.deb -o /tmp/libc.deb
echo 'ff5557d99b51f761c4b7c92368b9cc45565eda17df9bf9eb4b134d09825008be  /tmp/libc.deb' | sha256sum -c -
node --input-type=commonjs -e 'const fs=require("fs"),b=fs.readFileSync("/tmp/libc.deb");if(b.subarray(0,8).toString()!=="!<arch>\n")throw Error("INVALID_DEB");for(let p=8;p<b.length;){const name=b.subarray(p,p+16).toString().trim(),len=Number(b.subarray(p+48,p+58).toString());if(name.startsWith("data.tar"))fs.writeFileSync("/tmp/libc-data.tar.zst",b.subarray(p+60,p+60+len));p+=60+len+(len%2)}'
tar --zstd -xf /tmp/libc-data.tar.zst -C /data/cre-libc
cat > /data/bin/cre <<'CRE'
#!/usr/bin/env bash
exec /data/cre-libc/usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 --library-path /data/cre-libc/usr/lib/x86_64-linux-gnu /data/bin/cre.real "$@"
CRE
curl -fsSL https://github.com/oven-sh/bun/releases/download/bun-v1.4.2/bun-linux-x64.zip -o /tmp/bun.zip
echo '36368faef7527875d5ffa52e53cd48021741f2a83eb6208a8dd64068d422a913  /tmp/bun.zip' | sha256sum -c -
unzip -o -q /tmp/bun.zip -d /tmp/oy-bun
cp /tmp/oy-bun/bun-linux-x64/bun /data/bin/bun
chmod 700 /data/bin/cre /data/bin/cre.real /data/bin/bun
