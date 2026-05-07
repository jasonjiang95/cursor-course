# nl2sql_data_analysis

智能数据分析系统（FastAPI + LangChain + SQLite + React）— 详见 `.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md`。

## 仓库结构

| 路径 | 说明 |
|------|------|
| **`NL2SQLAgent/backend/`** | FastAPI 应用，`GET /health`，Phase 3 起 `/api/v1` |
| **`NL2SQLAgent/frontend/`** | Vite + React + TypeScript（Phase 4 对接 API） |

**端口：** 后端 `8000`，前端开发 `5173`。后端 CORS 默认允许 `http://localhost:5173` 与 `http://127.0.0.1:5173`。

## Phase 1 快速验收

**后端测试**（后端需 Python **3.11+**，见 `NL2SQLAgent/backend/README.md`）

```powershell
cd NL2SQLAgent\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q
```

**后端启动**

```powershell
cd NL2SQLAgent\backend
.\.venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

另开终端：`curl http://127.0.0.1:8000/health`

**前端（Node.js 20 LTS）**

```powershell
cd NL2SQLAgent\frontend
npm install
npm run dev
```

浏览器打开 <http://localhost:5173> 应显示 Phase 1 占位首页。

- 详见 **`NL2SQLAgent/README.md`**
- 前端环境示例：`NL2SQLAgent/frontend/.env.example`

## Phase 3 开发文档（后端）

- **[NL2SQLAgent/docs/phase3-development.md](NL2SQLAgent/docs/phase3-development.md)**：环境、模块映射、实现顺序、ChatTongyi/工具约定、验收与脚本对账入口。**当前状态**：Phase 3 **已完成**。  
- 字段与 API 的 **SSOT** 仍以 [`.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md`](.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md) 中「技术契约与固定约定」为准。**下一步**：Phase 4 前端接 API（计划中 `p4-*` todo）。

## 远端仓库（规则配置）

参见 `.cursor/rules/linear-dev-workflow.mdc` 中的 `project.repo`。
