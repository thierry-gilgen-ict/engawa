# Publish Engawa v0.1.0 to npm

Requires npm login as a user with publish access to `@thierry-gilgen-ict` and a one-time OTP (or an automation token with bypass 2FA).

## 1. Build packages

```bash
cd engawa
pnpm install
pnpm build
```

## 2. Pack publish-ready tarballs

Core (from package directory):

```bash
cd packages/core && npm pack
```

Discovery and MCP need `0.1.0` semver deps in the tarball (not `workspace:*`). Use the staging copies:

```bash
# From engawa root after build
node scripts/stage-npm-tarballs.mjs
```

Or manually replace `workspace:*` with `0.1.0` in staged `package.json` files before `npm pack`.

## 3. Publish (order matters)

```bash
npm publish packages/core/thierry-gilgen-ict-engawa-core-0.1.0.tgz --access public --otp=YOUR_OTP
npm publish .npm-staging/discovery/thierry-gilgen-ict-engawa-discovery-0.1.0.tgz --access public --otp=YOUR_OTP
npm publish .npm-staging/mcp/thierry-gilgen-ict-engawa-mcp-0.1.0.tgz --access public --otp=YOUR_OTP
```

## 4. Verify clean install

```bash
rm -rf /tmp/engawa-smoke && mkdir /tmp/engawa-smoke && cd /tmp/engawa-smoke
npm init -y
npm install @thierry-gilgen-ict/engawa-core@0.1.0 @thierry-gilgen-ict/engawa-discovery@0.1.0 @thierry-gilgen-ict/engawa-mcp@0.1.0
node -e "import('@thierry-gilgen-ict/engawa-mcp').then(m => console.log(Object.keys(m)))"
```
