# Frontend Troubleshooting Guide

## Current Issues

### 1. Node.js Version Incompatibility
- **Current**: Node.js v24.11.1
- **Required**: Node.js 18.x or 20.x (Angular 18 supports these versions)
- **Issue**: Node.js 24 is too new and not supported

### 2. Build Errors
- Path resolution issues with Angular modules
- tslib resolution errors
- Missing file errors during build

## Solutions

### Solution 1: Downgrade Node.js (Recommended)

1. **Install Node.js 20.x LTS**:
   - Download from: https://nodejs.org/
   - Install Node.js 20.x LTS version
   - Restart your terminal/IDE

2. **Verify installation**:
   ```powershell
   node --version  # Should show v20.x.x
   npm --version
   ```

3. **Clean and reinstall**:
   ```powershell
   cd H:\Work\Development\frontend
   Remove-Item -Path "node_modules" -Recurse -Force
   Remove-Item -Path "package-lock.json" -Force
   npm install --legacy-peer-deps
   ```

4. **Run the app**:
   ```powershell
   npm start
   ```

### Solution 2: Use NVM (Node Version Manager)

If you need multiple Node.js versions:

1. **Install NVM for Windows**:
   - Download from: https://github.com/coreybutler/nvm-windows/releases

2. **Install and use Node.js 20**:
   ```powershell
   nvm install 20.11.0
   nvm use 20.11.0
   ```

3. **Then follow Solution 1 steps 3-4**

### Solution 3: Temporary Workaround (If you can't change Node.js)

1. **Update package.json** to use compatible versions
2. **Use --legacy-openssl-provider flag**:
   ```powershell
   $env:NODE_OPTIONS="--openssl-legacy-provider"
   npm start
   ```

## Quick Fix Commands

```powershell
# Clean everything
cd H:\Work\Development\frontend
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".angular" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall
npm cache clean --force
npm install --legacy-peer-deps

# Try to start
npm start
```

## Verification

After fixing, verify:
- ✅ `node --version` shows 18.x or 20.x
- ✅ `npm install` completes without errors
- ✅ `npm start` or `ng serve` starts successfully
- ✅ Application opens at http://localhost:4200

## Current Status
- ✅ package.json is correct
- ✅ Angular CLI is installed
- ✅ Dependencies are listed correctly
- ❌ Node.js version is incompatible (v24.11.1)
- ⚠️ node_modules may be corrupted


