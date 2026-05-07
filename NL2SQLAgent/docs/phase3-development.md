# Phase 3 — 后端开发文档（LangChain + SQLite + 百炼 Qwen）

本文档描述 **Phase 3 目标、模块职责、环境依赖、实现顺序与验收**；字段级「唯一真理来源」仍以仓库内 [`.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md`](../../.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md) 的 **「技术契约与固定约定（SSOT）」** 为准，本文不重复复制大段契约，仅做开发导航与接口摘要。

---

## 1. 目标与边界

| 项 | 说明 |
|----|------|
| **目标** | 会话持久化（meta.db）、聊天管线（Agent + 工具）、NL2SQL（仅通过受控 `run_select` 执行查询）、响应中带 `viz_payload`；用 `curl` / `pytest` 验证。 |
| **API 前缀** | `/api/v1`（健康检查仍为 `GET /health`）。 |
| **LLM** | `langchain_community.chat_models.tongyi.ChatTongyi`，密钥 `DASHSCOPE_API_KEY`，模型名 `LLM_MODEL`（与百炼控制台一致，如 `qwen3-max`）。 |
| **Agent** | `create_tool_calling_agent` + `AgentExecutor`（LangChain **0.3.x**，经 `langchain_classic` / 与计划一致的导入路径）；首期 **不用 LangGraph**。 |
| **SQL 真源** | **`run_select` 工具最后一次成功调用** 的入参 SQL 与行列结果 → 写入 `extra.sql` / 构图数据；不得以助手正文正则作为唯一 SQL 依据。 |

---

## 2. 环境变量（`backend/.env`，勿提交）

复制 [`backend/.env.example`](../backend/.env.example) 为 `.env` 后按需填写：

| 变量 | 必填（Phase 3） | 说明 |
|------|-----------------|------|
| `DASHSCOPE_API_KEY` | 联调 LLM 时必填 | 百炼 / DashScope API Key |
| `LLM_MODEL` | 联调 LLM 时必填 | 例如 `qwen3-max`，以控制台为准 |
| `META_DB_PATH` | 推荐 | 默认 `./data/meta.db`，会话与消息 |
| `APP_DB_PATH` | 推荐 | 默认 `./data/app.db`，业务演示数据 |
| `CORS_ORIGINS` | 可选 | 逗号分隔，须含前端访问的 origin |

---

## 3. Python 依赖

在 Phase 1 的 [`backend/requirements.txt`](../backend/requirements.txt) 基础上 **追加**（版本区间以 **计划文档 → 依赖锁定** 为准，实施时整块合并进 `requirements.txt`）：

- `langchain>=0.3.20,<0.4`
- `langchain-community>=0.3.20,<0.4`
- `langchain-core>=0.3.20,<0.4`
- `langchain-classic`（若使用 `create_sql_agent` / `AgentExecutor` 等经典入口，与当前 `langchain_community` 示例一致）
- `dashscope>=1.20`
- `sqlparse>=0.5,<1`
- `sqlalchemy`（使用 `SQLDatabase` / `SQLDatabaseToolkit` 做探针或对齐官方 NL2SQL 示例时）

**约定**：LangChain 三件套主版本保持 **同为 0.3.x**。

---

## 4. 目录与模块映射（落地清单）

| 路径 | 职责 |
|------|------|
| `app/main.py` | `lifespan`、路由挂载、CORS |
| `app/core/config.py` | `Settings`：`cors_origins`、`llm_model`、`meta_db_path`、`app_db_path` 等 |
| `app/db/meta_db.py` | meta 库连接、DDL、`PRAGMA foreign_keys=ON`、启动时 `ensure_schema()` |
| `app/db/app_db.py` | 业务库演示表与样例数据 |
| `app/db/session_store.py` | 会话与消息 DAO；`messages.extra` 存 JSON 字符串 |
| `app/services/sql_tools.py` | **`@tool`**：`list_tables`、`get_table_schema`、`run_select`（校验 + LIMIT） |
| `app/services/llm_factory.py` | `get_chat_model()` → `ChatTongyi` |
| `app/services/agent_runner.py` | 拼装历史、调用 Agent、`build_viz_payload`、汇总写库字段 |
| `app/schemas/chat.py` | Pydantic：与契约一致的 `ChatMessage`、`VizPayload`、`ChatRoundResponse` 等 |
| `app/api/sessions.py` / `chat.py` | REST |
| `docs/api-samples.md`（仓库 `docs/` 或 NL2SQLAgent 下） | 与契约一致的 **curl** 样例 |

---

## 5. 实现顺序（依赖顺序固定）

与计划 Phase 3「实现顺序」一致，建议严格按序提交 PR：

1. `.env.example` + `Settings` 扩展  
2. `meta_db` DDL + `lifespan`  
3. `app_db` 演示数据  
4. `session_store`  
5. `sql_tools`（单测可先于 Agent）  
6. `llm_factory`  
7. `agent_runner`（`tool_calls` 见下节）  
8. `build_viz_payload`  
9. `schemas` + `sessions`/`chat` 路由  
10. `docs/api-samples.md`  
11. `tests/test_sessions.py`、`tests/test_chat.py`（mock LLM/Agent）

---

## 6. ChatTongyi / 工具调用（开发必须）

详细字段表（流式 chunk、`AIMessage.tool_calls`、`additional_kwargs` 等）见 **计划文档 →「ChatTongyi / Qwen3 消息与工具调用字段规范」**。

**裁定摘要**：

- 执行自定义 SQLite 工具时，**仅以 `AIMessage.tool_calls[].args`（dict）为入参真源**。  
- `additional_kwargs["tool_calls"]` 仅作调试/对账。  
- 首期 `POST .../chat` 建议 **非流式 `invoke`**。

**本地对账脚本**（勿把 Key 写入仓库）：

- [`backend/scripts/test_qwen3_chat_tongyi.py`](../backend/scripts/test_qwen3_chat_tongyi.py) — 流式 + 简单 `bind_tools`  
- [`backend/scripts/test_nlsql_chat_tongyi_toolkit.py`](../backend/scripts/test_nlsql_chat_tongyi_toolkit.py) — LangChain 官方 `SQLDatabaseToolkit` 与 `create_sql_agent` 的 **工具入参/出参** 形态（可选参考；**本仓库业务契约仍推荐自研三工具 + `run_select` 收口**）。**详尽入参键、`intermediate_steps` 约定**见 SSOT：[智能数据分析系统模块规划](../../.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md) 中小节「LangChain SQLDatabaseToolkit 工具入参（可选参考，非本仓库主路径）」。

---

## 7. 自研三工具（契约）vs 官方 NL2SQL Toolkit

| 方式 | 说明 |
|------|------|
| **契约推荐（本仓库主路径）** | `list_tables` / `get_table_schema` / `run_select`：只读、`SELECT only`、无 `LIMIT` 时追加上限，安全边界自控。 |
| **LangChain `SQLDatabaseToolkit`** | `sql_db_list_tables`（`invoke({"tool_input": ""})`）、`sql_db_schema`、`sql_db_query`、`sql_db_query_checker`；适合 PoC，默认工具可能生成非只读语义，需与产品经理/安全约定后再用。 |

---

## 8. REST 与 `messages.extra`（摘要）

- 持久化：`content` + `extra` JSON（`sql`、`viz_payload`、`error`）。  
- 对外扁平字段：`ChatMessage.sql` / `viz_payload` / `error`。  
- 可预期业务错误：**HTTP 200** + `assistant_message.error`（见契约表）。  

完整路径与 Pydantic 示例见计划 **「REST API」「OpenAPI / Pydantic」「HTTP 状态语义」**。

---

## 9. Phase 3 验收

- `pytest` 全绿（含 mock 管线）。  
- `curl`：`POST /api/v1/sessions` → `POST .../sessions/{id}/chat` → 响应含 `assistant_message`，且 `viz_payload` 合法或为 `null`。  
- `docs/api-samples.md` 中命令可复制运行。

**状态**：**已完成**。后端与上述文档、计划内 Phase 3 原子任务已落地；真机联调 LLM 须在 `backend/.env` 配置 `DASHSCOPE_API_KEY` 与 `LLM_MODEL`。前后端 UI 接 API 属 **Phase 4**，见总计划 Phase 4 与 `p4-*` todo。

---

## 10. 相关链接

- 总计划：[智能数据分析系统模块规划_e9257a18.plan.md](../../.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md)  
- 后端入口说明：[backend/README.md](../backend/README.md)  
- 根 README：[README.md](../../README.md)
