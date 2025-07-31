# GitHub Actions Release Workflow Setup

This workflow automates the entire release process for your PowerWorld Language Support extension.

## 🚀 What it does

1. **Compiles** TypeScript code
2. **Packages** extension into `.vsix` file
3. **Creates GitHub Release** with detailed changelog
4. **Publishes to VS Code Marketplace**
5. **Publishes to Open VSX Registry** (alternative marketplace)

## 🔧 Setup Required

### 1. VS Code Marketplace Token (Required)

To publish to the VS Code Marketplace, you need a Personal Access Token:

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Sign in with your Microsoft account
3. Create a new organization (if you don't have one)
4. Go to User Settings → Personal Access Tokens
5. Create new token with:
   - **Scopes**: `Marketplace (Manage)`
   - **Organization**: All accessible organizations
6. Copy the token (you won't see it again!)

### 2. Open VSX Token (Optional but Recommended)

Open VSX is an alternative marketplace used by VS Code alternatives:

1. Go to [Open VSX Registry](https://open-vsx.org/)
2. Sign in with GitHub
3. Go to your profile → Access Tokens
4. Create a new token
5. Copy the token

### 3. Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add these repository secrets:
   - `VSCE_PAT`: Your VS Code Marketplace token
   - `OVSX_PAT`: Your Open VSX token (optional)

## 📋 How to Use

### Method 1: Tag-based Release (Recommended)

```bash
# Create and push a version tag
git tag v0.1.0
git push origin v0.1.0
```

**Important**: The workflow will automatically update your `package.json` to match the tag version. So if you push tag `v1.2.0`, it will set `package.json` version to `1.2.0` before building.

This automatically:
- Builds the extension
- Creates a GitHub release
- Publishes to marketplaces

### Method 2: Manual Release

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Release and Publish Extension**
4. Click **Run workflow**
5. Enter:
   - Version number (e.g., `0.1.0`)
   - Whether to publish to marketplace (default: yes)
6. Click **Run workflow**

## 🎯 Workflow Features

### Automatic Version Management
- **Tag-based releases**: Updates `package.json` to match the git tag version
- **Manual releases**: Updates `package.json` to the version you specify
- **Ensures consistency**: Git tag, package.json, and release version always match

### Comprehensive Release Notes
- Professional changelog format
- Feature highlights
- Installation instructions
- Requirements and usage info

### Multi-Platform Publishing
- **VS Code Marketplace**: Main distribution channel
- **Open VSX Registry**: For VS Code alternatives (VSCodium, etc.)
- **GitHub Releases**: Direct `.vsix` download

### Error Handling
- Validates compilation before packaging
- Checks all dependencies
- Provides clear error messages

## 🔍 Monitoring Releases

### View Release Status
1. Go to **Actions** tab in your repository
2. Click on the latest workflow run
3. Monitor each step's progress

### Release Artifacts
- **GitHub**: Release page with `.vsix` file
- **VS Code Marketplace**: [Your extension page](https://marketplace.visualstudio.com/)
- **Open VSX**: [Your extension page](https://open-vsx.org/)

## 🐛 Troubleshooting

### Common Issues

**❌ "VSCE_PAT not found"**
- Solution: Add your marketplace token to GitHub secrets

**❌ "Publisher not found"**
- Solution: Ensure your `package.json` has the correct publisher name

**❌ "Version already exists"**
- Solution: Increment version number in `package.json` or use a new tag

**❌ "Version mismatch"**
- The workflow automatically syncs `package.json` version with git tags
- If you see issues, ensure your tag follows format `v1.2.3` (with 'v' prefix)

**❌ "Compilation failed"**
- Solution: Run `npm run compile` locally to check for TypeScript errors

### Debug Mode
Add this step to the workflow for debugging:
```yaml
- name: Debug Info
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Package version: $(node -p "require('./package.json').version")"
    ls -la
```

## 📝 Best Practices

1. **Test Locally First**: Always run `npm run compile` and test your extension before releasing
2. **Semantic Versioning**: Use semantic versioning (1.0.0, 1.0.1, 1.1.0, 2.0.0)
3. **Update README**: Keep your README.md updated with new features
4. **Check Marketplace**: Verify your extension appears correctly after publishing

## 🔗 Useful Links

- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Azure DevOps PAT](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Open VSX Registry](https://open-vsx.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
