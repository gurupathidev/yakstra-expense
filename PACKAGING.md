# Platform Packaging Guide

This guide explains how to package the Yakstra Expense Calculator for different platforms.

## Web (Already Complete!)

The app works immediately in any modern web browser. Simply open `index.html`.

### Deploy to Web Hosting

Upload these files to any web server:
- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `assets/` folder

Popular hosting options:
- GitHub Pages (free)
- Netlify (free)
- Vercel (free)
- Firebase Hosting (free tier)

## Progressive Web App (PWA)

Already configured! Users can install from browser:

**Desktop:** Click install icon in address bar
**Mobile:** Use "Add to Home Screen" from browser menu

## Package for Desktop (Windows, macOS, Linux)

### Option 1: Electron (Native Desktop App)

1. Install Node.js from nodejs.org
2. Create package.json in project folder:

```bash
npm init -y
npm install electron --save-dev
```

3. Create `main.js`:

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

4. Update package.json:

```json
{
  "name": "yakstra-expense-calculator",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  }
}
```

5. Run the app:

```bash
npm start
```

6. Build installers:

```bash
npm install electron-builder --save-dev
npm run dist
```

### Option 2: Tauri (Rust-based, Smaller Size)

1. Install Rust and Node.js
2. Follow Tauri setup: https://tauri.app/v1/guides/getting-started/setup

```bash
npx create-tauri-app
# Follow prompts and copy web files
```

## Package for Mobile (iOS & Android)

### Using Capacitor

1. Install Capacitor:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

2. Add platforms:

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

3. Copy web files:

```bash
npx cap copy
```

4. Open in native IDE:

```bash
npx cap open ios      # Opens Xcode (macOS only)
npx cap open android  # Opens Android Studio
```

5. Build and deploy from Xcode or Android Studio

### Using Cordova (Alternative)

1. Install Cordova:

```bash
npm install -g cordova
cordova create yakstra com.yakstra.expense YakstraExpense
```

2. Add platforms:

```bash
cd yakstra
cordova platform add ios
cordova platform add android
```

3. Copy web files to `www/` folder

4. Build:

```bash
cordova build ios
cordova build android
```

## Quick Start Scripts

Create `package.json` for easy deployment:

```json
{
  "name": "yakstra-expense-calculator",
  "version": "1.0.0",
  "description": "Cross-platform expense tracker",
  "scripts": {
    "dev": "python3 -m http.server 8000",
    "electron": "electron .",
    "build:electron": "electron-builder",
    "capacitor:ios": "npx cap open ios",
    "capacitor:android": "npx cap open android"
  }
}
```

## Simple Testing

### Local Web Server

**Python 3:**
```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

**PHP:**
```bash
php -S localhost:8000
```

**Node (http-server):**
```bash
npx http-server -p 8000
```

## Platform-Specific Notes

### Windows
- Test in Chrome, Edge, Firefox
- Electron works best for desktop app
- Can create .exe installer with electron-builder

### macOS
- Test in Safari and Chrome
- Electron or Tauri for desktop app
- Xcode required for iOS build (requires Apple Developer account $99/year)

### Linux
- Works great in Firefox and Chrome
- Electron or Tauri for desktop app
- AppImage format recommended for distribution

### iOS
- Requires macOS and Xcode
- Need Apple Developer account for App Store
- PWA installation via Safari works without app store

### Android
- Android Studio required
- Can test with Android Emulator
- Google Play account costs $25 one-time fee
- Can also distribute APK directly

## Recommended Approach

1. **Start with PWA** - Works immediately on all platforms
2. **Electron for Desktop** - If you need offline desktop apps
3. **Capacitor for Mobile** - For native iOS/Android apps
4. **Host on Web** - Easiest deployment, works everywhere

## No-Build-Tools Option

The app already works without any build tools!
- Just open index.html in a browser
- Or upload to any web host
- Users can install as PWA from browser

---

**The application is fully functional as-is. Packaging is optional!**
