# 🎵 Discord Music Bot JS

Bot musik Discord dengan JavaScript (Node.js) yang dilengkapi **bypass verifikasi robot YouTube** menggunakan cookies.

## ✨ Fitur

- 🎶 Putar musik dari YouTube (URL atau search)
- 📋 Queue management (antrian lagu per server)
- ⏯️ Pause, Resume, Skip, Stop
- 🔊 Volume control (1-100)
- 🍪 **Cookie-based Anti-Robot Bypass** — Bypass "confirm you're not a robot" dari YouTube
- 🔄 Reload cookies tanpa restart bot
- 📊 Cookie status monitoring
- 🔌 Auto-disconnect setelah 3 menit idle

## 📋 Daftar Command

| Command | Alias | Deskripsi |
|---------|-------|-----------|
| `!play <url/search>` | `!p` | Putar lagu dari YouTube |
| `!skip` | `!s`, `!next` | Skip lagu |
| `!stop` | `!leave`, `!dc` | Stop & keluar voice channel |
| `!pause` | - | Pause lagu |
| `!resume` | `!r` | Resume lagu |
| `!queue` | `!q` | Lihat antrian lagu |
| `!np` | `!now` | Info lagu yang sedang diputar |
| `!volume <1-100>` | `!vol`, `!v` | Atur volume |
| `!reload-cookies` | `!rc` | Muat ulang cookies |
| `!cookie-status` | `!cs` | Cek status cookies |
| `!help` | `!h` | Daftar command |

## 🚀 Instalasi

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [FFmpeg](https://ffmpeg.org/) (sudah termasuk via `ffmpeg-static`)

### 2. Clone & Install
```bash
git clone <repo-url>
cd MusicBotJS
npm install
```

### 3. Setup Discord Bot Token
1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **"New Application"** → beri nama → **Create**
3. Pergi ke tab **"Bot"** → klik **"Add Bot"**
4. Copy **Token** bot
5. Aktifkan **"MESSAGE CONTENT INTENT"** di bagian Privileged Gateway Intents
6. Buat file `.env`:
```
DISCORD_TOKEN=paste_token_kamu_disini
PREFIX=!
```

### 4. Invite Bot ke Server
1. Di Developer Portal → tab **"OAuth2"** → **"URL Generator"**
2. Pilih scopes: `bot`, `applications.commands`
3. Pilih permissions: `Send Messages`, `Connect`, `Speak`, `Embed Links`, `Read Message History`
4. Copy URL dan buka di browser untuk invite bot

### 5. Jalankan Bot
```bash
node index.js
```

## 🍪 Setup Cookies (Anti-Robot Bypass)

> **PENTING!** Tanpa cookies, YouTube akan sering memblokir bot dengan pesan "Sign in to confirm you're not a bot".

### Cara Export Cookies:

1. **Login YouTube** di browser Chrome/Firefox
2. **Install extension** ["Get cookies.txt LOCALLY"](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
3. **Buka YouTube** → klik extension → pilih **"Export"**
4. **Format output** ke JSON:
   - Export cookies, buka filenya
   - Ubah format ke array of objects seperti contoh di `cookies.example.json`
5. **Simpan** sebagai `cookies.json` di folder root bot
6. **Jalankan bot** atau ketik `!reload-cookies` jika bot sudah jalan

### Format cookies.json:
```json
[
    {
        "domain": ".youtube.com",
        "name": "SID",
        "value": "your_sid_value",
        "path": "/",
        "expirationDate": 1735689600
    },
    {
        "domain": ".youtube.com",
        "name": "HSID",
        "value": "your_hsid_value",
        "path": "/",
        "expirationDate": 1735689600
    }
]
```

### Cookies Penting (Essential):
- `SID`, `HSID`, `SSID` — Session cookies
- `APISID`, `SAPISID` — API auth cookies
- `LOGIN_INFO` — Login verification

## 🔧 Troubleshooting

### ❌ "Terdeteksi sebagai Robot"
→ Cookies expired atau tidak valid. Export ulang cookies dari browser.

### ❌ "403 Forbidden"
→ YouTube memblokir request. Pastikan:
1. Cookies sudah di-load (cek `!cookie-status`)
2. Cookies masih valid (belum expired)
3. Akun YouTube yang dipakai export cookies masih aktif

### ❌ Bot tidak bisa join voice channel
→ Pastikan bot punya permission `Connect` dan `Speak` di server.

### ❌ "DISCORD_TOKEN tidak ditemukan"
→ Buat file `.env` dan isi `DISCORD_TOKEN=your_token`.

## 📁 Struktur Project

```
MusicBotJS/
├── index.js                  # Main entry point
├── config.js                 # Konfigurasi
├── cookies.json              # YouTube cookies (buat sendiri)
├── cookies.example.json      # Contoh format cookies
├── .env                      # Environment variables (buat sendiri)
├── .env.example              # Template .env
├── .gitignore
├── package.json
├── README.md
└── src/
    ├── commands/
    │   ├── play.js           # !play
    │   ├── skip.js           # !skip
    │   ├── stop.js           # !stop
    │   ├── queue.js          # !queue
    │   ├── pause.js          # !pause
    │   ├── resume.js         # !resume
    │   ├── nowplaying.js     # !np
    │   ├── volume.js         # !volume
    │   ├── reloadCookies.js  # !reload-cookies
    │   ├── cookieStatus.js   # !cookie-status
    │   └── help.js           # !help
    └── utils/
        ├── cookieManager.js  # Cookie loading & validation
        └── player.js         # Audio player & queue
```

## 📜 License

MIT License
