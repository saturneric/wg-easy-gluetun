# WireGuard Easy & Gluetun

**Personal VPN Gateway with Commercial VPN Protection** - Build your own WireGuard VPN server that routes all traffic through a commercial VPN provider via Gluetun. Connect unlimited devices securely and enjoy the benefits of both self-hosted and commercial VPN services.

> **📖 Want to learn more?** Check out this [detailed introduction article](https://blog.bktus.com/en/archives/2918/) explaining the principles and architecture of this VPN chaining setup.

## 📑 Table of Contents

- [WireGuard Easy \& Gluetun](#wireguard-easy--gluetun)
  - [📑 Table of Contents](#-table-of-contents)
  - [📋 Prerequisites](#-prerequisites)
  - [🌟 Features](#-features)
  - [🏗️ Architecture](#️-architecture)
  - [🔄 About This Project](#-about-this-project)
    - [Synchronization with wg-easy](#synchronization-with-wg-easy)
  - [🚀 Quick Start](#-quick-start)
    - [1. Clone the Repository](#1-clone-the-repository)
    - [2. Configure Environment Variables](#2-configure-environment-variables)
    - [3. Start Services](#3-start-services)
    - [4. Access Web Interface](#4-access-web-interface)
  - [⚙️ Configuration](#️-configuration)
    - [Adding Clients](#adding-clients)
    - [Port Forwarding](#port-forwarding)
    - [Advanced Network Configuration](#advanced-network-configuration)
      - [Hooks for WireGuard Easy](#hooks-for-wireguard-easy)
      - [iptables Rules for Gluetun](#iptables-rules-for-gluetun)
    - [DNS (Optional)](#dns-optional)
      - [Option 1: Use VPN Provider's DNS (Basic)](#option-1-use-vpn-providers-dns-basic)
      - [Option 2: Self-hosted DNS Server (Recommended)](#option-2-self-hosted-dns-server-recommended)
      - [Verifying DNS Configuration](#verifying-dns-configuration)
  - [🔧 Management](#-management)
    - [View Logs](#view-logs)
    - [Stop Services](#stop-services)
    - [Restart Services](#restart-services)
    - [Update Services](#update-services)
    - [Complete Cleanup](#complete-cleanup)
  - [🛠️ Troubleshooting](#️-troubleshooting)
    - [Connection Issues](#connection-issues)
    - [Logs](#logs)
  - [📚 Additional Resources](#-additional-resources)
  - [🤝 Contributing](#-contributing)
    - [Ways to Contribute](#ways-to-contribute)
  - [📄 License](#-license)
  - [⚠️ Disclaimer](#️-disclaimer)


## 📋 Prerequisites

- Docker Engine 20.10 or later
- Docker Compose V2
- A VPN provider account (for Gluetun)
- Root/sudo access on the host machine

✅ Tested on: Raspberry Pi 5 / Kernel 6.16.0 / Docker 28.0.4 / Docker Compose v2.34.0

## 🌟 Features

- **Easy WireGuard Management**: Simple web interface for managing WireGuard VPN
- **VPN Chaining**: Your devices → WireGuard Server → Gluetun → Commercial VPN → Internet
- **Multi-Device Support**: Connect unlimited devices to your VPN network
- **Remote Access**: Secure access to your home network from anywhere
- **Docker-Based**: Easy deployment with Docker Compose

## 🏗️ Architecture

```
┌─────────────────┐
│  Your Devices   │
│ (Phone/Laptop)  │
└────────┬────────┘
         │ 
         │ WireGuard Tunnel (Encrypted)
         │
         ▼
┌──────────────────────────────────────┐
│      Home Server / VPS               │
│                                      │
│  ┌──────────────┐   ┌──────────────┐ │
│  │   wg-easy    │   │   Gluetun    │ │
│  │  (WireGuard  │──▶│ (VPN Client) │ │
│  │   Server)    │   │              │ │
│  └──────────────┘   └──────┬───────┘ │
│                            │         │
└────────────────────────────┼─────────┘
                             │ 
                             │ Commercial VPN Tunnel
                             │ 
                             ▼
                    ┌─────────────────┐
                    │  VPN Provider   │
                    │   (NordVPN,     │
                    │  ExpressVPN,    │
                    │   Mullvad...)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Internet     │
                    └─────────────────┘
```

**Traffic Flow:**
1. Your device connects to wg-easy via WireGuard (encrypted)
2. wg-easy forwards traffic to Gluetun container
3. Gluetun routes traffic through commercial VPN provider (encrypted again)
4. Traffic reaches the internet with VPN provider's IP address

## 🔄 About This Project

This project is based on [wg-easy](https://github.com/wg-easy/wg-easy) with the following modifications:

- **Optimized for Gluetun Integration**: Pre-configured network settings for seamless VPN chaining
- **Simplified Configuration**: Reduced configuration steps to minimize setup errors
- **Docker Compose Ready**: Out-of-the-box Docker Compose configuration for quick deployment
- **Contributing Back**: Usability improvements are contributed back to the wg-easy project

### Synchronization with wg-easy

This project maintains compatibility with wg-easy by:
- Regularly syncing with the latest wg-easy releases
- Testing all updates for compatibility with Gluetun integration
- Contributing usability improvements and bug fixes back to the upstream project

## 🚀 Quick Start

### 1. Clone the Repository

```shell
git clone https://github.com/saturneric/wg-easy-gluetun.git
cd wg-easy-gluetun
```

### 2. Configure Environment Variables

```shell
cp .env.example .env
```

Edit `.env` file with your settings.

### 3. Start Services

```shell
sudo docker compose up -d
```

### 4. Access Web Interface

Open your browser and navigate to:
```
http://YOUR_SERVER_IP:51821
```

## ⚙️ Configuration

### Adding Clients

1. Access the web interface (Logged In)
2. Click "New Client"
3. Enter a name for the device
4. Scan the QR code with WireGuard app or download the config file

### Port Forwarding

Make sure to forward the following ports on your router:
- `51820/udp` - WireGuard VPN
- `51821/tcp` - Web UI (optional, for remote management)

### Advanced Network Configuration

#### Hooks for WireGuard Easy

You can customize WireGuard Easy's network behavior by modifying scripts in the `hooks/` directory. The hooks are automatically built into the wg-easy container and executed at the appropriate times.

#### iptables Rules for Gluetun

Gluetun's firewall and routing behavior by modifying the `iptables/` directory.

### DNS (Optional)

By default, your devices may use ISP DNS servers, which can expose your browsing activity. To prevent this:

#### Option 1: Use VPN Provider's DNS (Basic)

Configure Gluetun to use your VPN provider's DNS servers. This is usually handled automatically by Gluetun.

#### Option 2: Self-hosted DNS Server (Recommended)

For maximum privacy and ad-blocking capabilities, run your own DNS server:

**Using AdGuard Home:**

1. Add AdGuard Home to your `docker-compose.yml`:

```yaml
services:
  adguardhome:
    image: adguard/adguardhome
    container_name: adguardhome
    restart: unless-stopped
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "3000:3000/tcp"  # Web UI
    volumes:
      - ./data/adguardhome/data:/opt/adguardhome/work
      - ./data/adguardhome/conf:/opt/adguardhome/conf
    networks:
      vpn:
        ipv4_address: 172.31.0.2 # Fixed IPv4 address
        ipv6_address: "fd01:beee:beee::2" # Fixed IPv6 address
```

2. Configure Gluetun to use AdGuard Home DNS:

```yaml
services:
  gluetun:
    environment:
      - DOT=off
      - DNS_ADDRESS=172.31.0.2 # AdGuard Home container IP
```

3. Configure WireGuard Easy DNS settings:

```yaml
services:
  wg-easy:
    environment:
      - INIT_DNS=172.18.0.2  # AdGuard Home container IP
```

**Alternative DNS Servers:**
- **Pi-hole**: Lightweight DNS with ad-blocking
- **Unbound**: Recursive DNS server for maximum privacy
- **dnscrypt-proxy**: DNS over HTTPS/TLS

#### Verifying DNS Configuration

After setup, test for DNS leaks:

1. Connect to your WireGuard VPN
2. Visit [DNSLeakTest.com](https://www.dnsleaktest.com/)
3. Verify that only your VPN provider's or your DNS server's IP appears

## 🔧 Management

### View Logs

```shell
docker compose logs -f
```

### Stop Services

```shell
docker compose down
```

### Restart Services

```shell
docker compose restart
```

### Update Services

```shell
docker compose pull
docker compose up -d
```

### Complete Cleanup

To completely remove all containers, images, and volumes:

```shell
docker compose down --rmi all -v
```

**⚠️ Warning**: This will delete all data including WireGuard configurations and client settings. Make sure to backup any important configurations before running this command.

## 🛠️ Troubleshooting

### Connection Issues

Check if containers are running:
```shell
docker compose ps
```

### Logs

Verify Gluetun logs:
```shell
docker compose logs gluetun
```

Check WireGuard Easy logs:
```shell
docker compose logs wg-easy
```

## 📚 Additional Resources

- [WireGuard Official Documentation](https://www.wireguard.com/)
- [Gluetun Wiki](https://github.com/qdm12/gluetun-wiki)
- [WG-Easy](https://wg-easy.github.io/wg-easy/v15.1/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Ways to Contribute

- **Report Issues**: Found a bug? Let us know!
- **Suggest Features**: Have ideas for improvements?
- **Submit Pull Requests**: Code contributions are appreciated
- **Upstream Contributions**: Usability improvements may be contributed to wg-easy

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This tool is for educational and personal use only. Please ensure compliance with your VPN provider's terms of service and local regulations.

