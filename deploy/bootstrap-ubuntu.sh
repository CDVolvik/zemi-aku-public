#!/bin/sh
# Fresh isolated Ubuntu host only. Docker's official apt repository, no project credentials.
set -eu
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod 0644 /etc/apt/keyrings/docker.asc
. /etc/os-release
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
# Keep deployment, keys and signup caches private; containers still run as UID 1000.
install -d -m 0700 -o ubuntu -g ubuntu /opt/zemi-aku
printf '%s\n' 'PasswordAuthentication no' 'PermitRootLogin no' > /etc/ssh/sshd_config.d/60-zemi.conf
install -d -m 0755 /run/sshd
sshd -t
systemctl reload ssh
