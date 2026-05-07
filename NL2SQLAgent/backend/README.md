# Backend（Phase 1～3）

**Python：** 3.11.x 或 3.12.x（`>=3.11,<3.13`）。

## 环境

请使用 **Python 3.11 或 3.12** 创建虚拟环境（勿用 base 自带的 3.9）。示例目录名仍为 `.venv`：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

本机若没有独立安装 Python、只有 Anaconda，可用 conda 里的 3.11 解释器建环境，例如：

```powershell
"D:\anaconda3\envs\goc_langchain\python.exe" -m venv .venv
```

（Unix：`source .venv/bin/activate`）

复制 `.env.example` 为 `.env`。Phase 3 起须配置 **`DASHSCOPE_API_KEY`**、**`LLM_MODEL`** 及库路径变量（见 `.env.example` 注释）。

Python 版本约束见 **`pyproject.toml`** 中 `requires-python`。

## Phase 3 开发说明

完整模块划分、依赖追加、实现顺序、ChatTongyi/工具字段约定与验收：**[../docs/phase3-development.md](../docs/phase3-development.md)**。

**可复制 curl：** **[../docs/api-samples.md](../docs/api-samples.md)**。

对账脚本（Key 仅用环境变量，勿提交仓库）：

- `scripts/test_qwen3_chat_tongyi.py` — Qwen 流式与 `bind_tools`
- `scripts/test_nlsql_chat_tongyi_toolkit.py` — 官方 SQL Toolkit 工具入出参形态（可选参考）

## 启动

在项目 **`backend`** 目录下：

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- 健康检查：<http://127.0.0.1:8000/health> → `{"status":"ok"}`

## 测试

```powershell
cd backend
python -m pytest -q
```
