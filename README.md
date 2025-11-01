# WireGuard Easy & Gluetun

**Personal VPN Gateway with Commercial VPN Protection** - Build your own WireGuard VPN server that routes all traffic through a commercial VPN provider via Gluetun. Connect unlimited devices securely and enjoy the benefits of both self-hosted and commercial VPN services.

> **📖 Want to learn more?** Check out this [detailed introduction article](https://blog.bktus.com/en/archives/2918/) explaining the principles and architecture of this VPN chaining setup.

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
- **Regularly Synchronized**: Code is periodically updated from the upstream wg-easy repository
- **Contributing Back**: Usability improvements are contributed back to the wg-easy project

### Synchronization with wg-easy

This project maintains compatibility with wg-easy by:
- Regularly syncing with the latest wg-easy releases
- Testing all updates for compatibility with Gluetun integration

## 📋 Prerequisites

- Docker Engine 20.10 or later
- Docker Compose V2
- A VPN provider account (for Gluetun)
- Root/sudo access on the host machine

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

Edit `.env` file with your settings:
- `WG_HOST`: Your public IP or domain
- `PASSWORD`: Web UI password for WireGuard Easy
- `VPN_SERVICE_PROVIDER`: Your VPN provider (e.g., nordvpn, expressvpn)
- `VPN_USERNAME`: Your VPN username
- `VPN_PASSWORD`: Your VPN password

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

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WG_HOST` | Public hostname/IP for WireGuard | - |
| `PASSWORD` | Web UI password | - |
| `WG_PORT` | WireGuard port | 51820 |
| `WG_DEFAULT_DNS` | DNS server for clients | 1.1.1.1 |
| `VPN_SERVICE_PROVIDER` | Gluetun VPN provider | - |
| `SERVER_COUNTRIES` | VPN server country | - |

### Port Forwarding

Make sure to forward the following ports on your router:
- `51820/udp` - WireGuard VPN
- `51821/tcp` - Web UI (optional, for remote management)

## 📱 Adding Clients

1. Access the web interface
2. Click "New Client"
3. Enter a name for the device
4. Scan the QR code with WireGuard app or download the config file

## 🔧 Management

### View Logs

```shell
docker compose logs -f
```

### Stop Services

```shell
docker compose down
```

### Update Services

```shell
docker compose pull
docker compose up -d
```

### Restart Services

```shell
docker compose restart
```

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

