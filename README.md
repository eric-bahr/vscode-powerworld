# PowerWorld Language Support

A comprehensive VS Code extension that provides language support for PowerWorld auxiliary (.aux) files.

## Features

### Syntax Highlighting
- PowerWorld keywords, functions, and data blocks
- String highlighting (double quotes)
- Comment highlighting (`//`)
- SCRIPT block highlighting

### Language Features
- **IntelliSense**: Auto-completion for 200+ PowerWorld functions
- **Hover Information**: Shows field details when hovering over data values
- **Code Folding**: Collapse SCRIPT and data blocks (includes headers)
- **Commenting**: Ctrl+/ hotkey support for line comments
- **Document Symbols**: Shows SCRIPT blocks in outline/breadcrumb navigation

### Validation & Error Detection
- **Field Validation**: Detects extra/missing fields in data blocks
- **Semicolon Validation**: Ensures function calls in SCRIPT blocks end with `;`
- **Smart Context**: Proper state tracking between SCRIPT and data blocks


## Usage

The extension automatically activates when you open `.aux` files. Features include:

- **Syntax highlighting** for PowerWorld syntax
- **Auto-completion** with Ctrl+Space in SCRIPT blocks
- **Field validation** with red squiggles for errors
- **Hover information** showing field names and types
- **Code folding** to collapse sections

## Contributing

This extension was developed to improve the PowerWorld .aux file development experience. Feel free to submit issues or feature requests.

## License

MIT License - see LICENSE file for details.


## Requirements

- Visual Studio Code 1.74.0 or higher

## Known Issues

- None currently reported

## Release Notes

### 0.1.0

- Initial release
- Basic syntax highlighting for PowerWorld .aux files
- IntelliSense completion for PowerWorld functions and keywords
- Hover documentation for common PowerWorld functions
- Document symbol provider for navigation

