const fs = require('fs');
const path = require('path');
const config = require('../../config');

class CookieManager {
    constructor() {
        this.cookies = [];
        this.cookieHeader = '';
        this.lastLoaded = null;
        this.isValid = false;
    }

    /**
     * Load cookies dari file cookies.json
     * Format: Netscape/JSON (dari extension "Get cookies.txt LOCALLY")
     */
    loadCookies() {
        const cookiePath = path.resolve(config.cookieFile);

        if (!fs.existsSync(cookiePath)) {
            console.log('⚠️  [Cookie Manager] File cookies.json tidak ditemukan!');
            console.log('   Buat file cookies.json dengan export cookies dari browser.');
            console.log('   Lihat cookies.example.json untuk contoh format.');
            this.isValid = false;
            return false;
        }

        try {
            const rawData = fs.readFileSync(cookiePath, 'utf-8');
            const parsed = JSON.parse(rawData);

            // Support both array format dan object format
            if (Array.isArray(parsed)) {
                this.cookies = parsed;
            } else if (typeof parsed === 'object') {
                // Jika format { name: value } sederhana
                this.cookies = Object.entries(parsed).map(([name, value]) => ({
                    name,
                    value: String(value),
                    domain: '.youtube.com',
                    path: '/',
                }));
            }

            this.cookieHeader = this._buildCookieHeader();
            this.lastLoaded = new Date();
            this.isValid = this.validateCookies();

            if (this.isValid) {
                console.log(`✅ [Cookie Manager] ${this.cookies.length} cookies loaded successfully!`);
            } else {
                console.log('⚠️  [Cookie Manager] Cookies mungkin sudah expired. Bot tetap berjalan tanpa cookies.');
            }

            return this.isValid;
        } catch (error) {
            console.error('❌ [Cookie Manager] Error parsing cookies.json:', error.message);
            this.isValid = false;
            return false;
        }
    }

    /**
     * Build Cookie header string dari cookie objects
     */
    _buildCookieHeader() {
        return this.cookies
            .filter(c => c.name && c.value)
            .map(c => `${c.name}=${c.value}`)
            .join('; ');
    }

    /**
     * Ambil cookie header string
     */
    getCookieHeader() {
        return this.cookieHeader;
    }

    /**
     * Ambil cookies sebagai array untuk ytdl
     */
    getCookiesArray() {
        return this.cookies;
    }

    /**
     * Validasi cookies - cek apakah expired
     */
    validateCookies() {
        if (!this.cookies || this.cookies.length === 0) {
            return false;
        }

        const now = Math.floor(Date.now() / 1000);
        const essentialCookies = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', 'LOGIN_INFO'];

        // Cek apakah ada essential cookies
        const foundEssentials = this.cookies.filter(c =>
            essentialCookies.includes(c.name)
        );

        if (foundEssentials.length === 0) {
            console.log('⚠️  [Cookie Manager] Tidak ada essential cookies (SID, HSID, dll). Cookies mungkin tidak valid.');
            return false;
        }

        // Cek expiration
        const expiredCookies = foundEssentials.filter(c =>
            c.expirationDate && c.expirationDate < now
        );

        if (expiredCookies.length > 0) {
            console.log(`⚠️  [Cookie Manager] ${expiredCookies.length} cookies sudah expired!`);
            console.log('   Silakan export ulang cookies dari browser.');
            return false;
        }

        return true;
    }

    /**
     * Reload cookies dari file (bisa dipanggil tanpa restart bot)
     */
    reloadCookies() {
        console.log('🔄 [Cookie Manager] Reloading cookies...');
        return this.loadCookies();
    }

    /**
     * Buat ytdl agent options dengan cookies
     */
    getYtdlCookieOptions() {
        if (!this.isValid || this.cookies.length === 0) {
            return {};
        }

        // Format cookies untuk @distube/ytdl-core
        return {
            requestOptions: {
                headers: {
                    cookie: this.cookieHeader,
                    // Simulasi browser biasa agar tidak terdeteksi sebagai bot
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                },
            },
        };
    }

    /**
     * Ambil status cookies untuk embed message
     */
    getStatus() {
        return {
            loaded: this.cookies.length > 0,
            count: this.cookies.length,
            valid: this.isValid,
            lastLoaded: this.lastLoaded,
        };
    }
}

// Singleton instance
const cookieManager = new CookieManager();
module.exports = cookieManager;
