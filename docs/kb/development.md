# 开发规范

> 本文件记录项目开发时必须遵守的工程规则。所有代码、文档、脚本和配置文件默认使用 UTF-8，避免中文、符号和跨平台文本出现乱码。

## UTF-8 编码规则

1. 所有新增或修改的文本文件必须保存为 UTF-8。
2. 推荐使用 UTF-8 without BOM；如工具只能输出 UTF-8 with BOM，提交前需确认不会影响 Flutter、Dart、ArkTS、JSON、YAML、Markdown 解析。
3. 不要使用系统默认 ANSI / GBK / GB2312 编码保存代码、文档、配置或测试快照。
4. Windows PowerShell 查看中文文件前，先切换输出编码：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

5. PowerShell 写文件时必须显式指定 UTF-8，例如：

```powershell
Set-Content -Path docs/example.md -Value $content -Encoding utf8
Add-Content -Path docs/example.md -Value $line -Encoding utf8
```

6. 脚本生成文件时必须显式指定编码：

```dart
File(path).writeAsStringSync(content, encoding: utf8);
```

```python
Path(path).write_text(content, encoding="utf-8")
```

7. JSON、ARB、YAML、Markdown 中可直接写中文，但必须保持 UTF-8 编码。
8. 复制外部文本后，如果出现 `锟斤拷`、`�`、`鈥`、`璇捐〃` 这类字符，视为乱码，不允许提交。

## 编辑器与 Git 约束

- 项目根目录的 `.editorconfig` 强制文本文件使用 `charset = utf-8`。
- 项目根目录的 `.gitattributes` 统一文本文件换行和编码标记。
- VS Code 建议确认右下角编码为 `UTF-8`；如不是，使用 `Reopen with Encoding` / `Save with Encoding` 切换。
- JetBrains / Android Studio 建议在 `Settings > Editor > File Encodings` 中设置 Global、Project、Properties Files 为 `UTF-8`。

## 提交前检查

提交前至少执行：

```bash
dart format .
flutter analyze
flutter test
```

如本次改动涉及桌面构建或平台代码，再执行对应平台构建验证。

