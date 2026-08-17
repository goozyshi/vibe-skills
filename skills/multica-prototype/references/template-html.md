# Standalone Prototype HTML Template

## Metadata Block

Every prototype begins with this HTML comment:

```html
<!--
@prototype-meta
title: 主播聊天联系方式违规
module: guildAnchorManage
scenario: modify
source_file: src/views/guildAnchorManage/anchorChat/Overview.vue
route: /guild/anchorChat/overview
created_at: 2026-08-15
focus: 大盘新增联系方式违规筛选与计数列
-->
```

---

## CDN Selection

Pick based on `package.json`:

### Vue 3 + Element Plus
```html
<link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css" />
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script src="https://unpkg.com/element-plus"></script>
<script src="https://unpkg.com/@element-plus/icons-vue"></script>
```

### React + Ant Design
```html
<link rel="stylesheet" href="https://unpkg.com/antd/dist/reset.css" />
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/dayjs/dayjs.min.js"></script>
<script src="https://unpkg.com/antd/dist/antd.min.js"></script>
```

---

## Full Structure (Vue 3 + Element Plus)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>原型 - [标题]</title>
  <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #app { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f0f2f5; color: #303133; overflow: hidden; }

    .admin-layout { display: flex; width: 100vw; height: 100vh; }
    .admin-sidebar { width: 220px; background-color: #242f42; color: #fff; flex-shrink: 0; display: flex; flex-direction: column; }
    .admin-logo { height: 60px; line-height: 60px; padding: 0 20px; font-size: 16px; font-weight: bold; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 8px; }
    .menu-tree { flex: 1; overflow-y: auto; }
    .menu-group-title { padding: 12px 20px; color: #8fa1b3; font-weight: 500; font-size: 12px; }
    .menu-item { padding: 10px 20px 10px 32px; cursor: pointer; color: #bfcbd9; font-size: 13px; transition: background 0.2s; }
    .menu-item:hover { background: #283446; color: #409eff; }
    .menu-item.active { background: #1a2332; color: #409eff; font-weight: bold; border-right: 3px solid #409eff; }

    .admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .admin-header { height: 50px; background: #242f42; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; font-size: 13px; }
    .header-env { color: #f56c6c; font-weight: bold; }

    .admin-tabs { height: 36px; background: #fff; border-bottom: 1px solid #e4e7ed; display: flex; align-items: center; padding: 0 16px; gap: 6px; }
    .tab-item { padding: 4px 12px; font-size: 12px; border: 1px solid #dcdfe6; border-radius: 3px; background: #fafafa; cursor: pointer; }
    .tab-item.active { background: #409eff; color: #fff; border-color: #409eff; }

    .admin-content-wrapper { flex: 1; padding: 16px; overflow-y: auto; }
    .page-card { background: #fff; border-radius: 4px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

    /* Delta highlights — framework primary light tint */
    .delta-cell-highlight { background-color: var(--el-color-primary-light-9, #ecf5ff) !important; }
    .delta-header-highlight { background-color: var(--el-color-primary-light-8, #e6f1fc) !important; color: var(--el-color-primary, #409eff) !important; font-weight: bold; }
    .delta-form-highlight { background-color: var(--el-color-primary-light-9, #ecf5ff); padding: 4px 8px; border-radius: 4px; }

    /* Variant switcher (multi-variant only) */
    .variant-switcher { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1f2329; color: #fff; padding: 6px 16px; border-radius: 24px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.25); z-index: 9999; font-size: 13px; }
    .variant-btn { cursor: pointer; padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.1); border: none; color: #fff; font-size: 12px; }
    .variant-btn:hover { background: rgba(255,255,255,0.2); }
  </style>
</head>
<body>
  <div id="app">
    <div class="admin-layout">
      <div class="admin-sidebar">
        <div class="admin-logo"><span>🎮 Dashboard</span></div>
        <div class="menu-tree">
          <div class="menu-group-title">[模块名]</div>
          <div class="menu-item active">[当前页面]</div>
        </div>
      </div>

      <div class="admin-main">
        <div class="admin-header">
          <span class="header-env">--- 测试环境 ---</span>
          <span>管理员</span>
        </div>
        <div class="admin-tabs">
          <div class="tab-item active">[当前页面] ✕</div>
        </div>
        <div class="admin-content-wrapper">
          <div class="page-card">
            <!-- Search Form -->
            <el-form :inline="true" :model="searchForm" size="default">
              <!-- Baseline: pruned enums -->
              <el-form-item label="示例筛选">
                <el-select v-model="searchForm.example" clearable style="width: 130px;">
                  <el-option label="选项A" value="A"></el-option>
                  <el-option label="选项B" value="B"></el-option>
                </el-select>
              </el-form-item>
              <!-- Delta: full user-specified enums, highlighted -->
              <el-form-item label="新增筛选" class="delta-form-highlight">
                <el-select v-model="searchForm.newField" clearable style="width: 130px;">
                  <el-option label="全部" value=""></el-option>
                  <el-option label="枚举1" value="1"></el-option>
                  <el-option label="枚举2" value="2"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary">搜索</el-button>
                <el-button>重置</el-button>
              </el-form-item>
            </el-form>

            <!-- Table -->
            <el-table :data="tableData" border stripe style="width: 100%; margin-top: 12px;">
              <el-table-column prop="col1" label="基线列" min-width="150"></el-table-column>
              <!-- Delta column -->
              <el-table-column prop="newCol" label="新增列" class-name="delta-cell-highlight" label-class-name="delta-header-highlight" width="130"></el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary">查看详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <!-- Variant switcher (multi-variant only): include keyboard number key binding -->
      <div v-if="variants.length > 1" class="variant-switcher">
        <button class="variant-btn" @click="switchVariant('prev')">← 上一个</button>
        <span>方案 {{ currentIdx + 1 }} / {{ variants.length }}: {{ variants[currentIdx] }}</span>
        <button class="variant-btn" @click="switchVariant('next')">下一个 →</button>
      </div>
    </div>
  </div>

  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://unpkg.com/element-plus"></script>
  <script src="https://unpkg.com/@element-plus/icons-vue"></script>
  <script>
    const { createApp, ref, reactive, onMounted, onUnmounted } = Vue;
    const app = createApp({
      setup() {
        const searchForm = reactive({ example: '', newField: '' });
        const tableData = ref([
          { col1: '示例数据1', newCol: '值A' },
          { col1: '示例数据2', newCol: '值B' }
        ]);

        // Multi-variant support (remove if single variant)
        const variants = ref(['A', 'B']);
        const currentIdx = ref(0);
        const switchVariant = (dir) => {
          if (dir === 'prev') currentIdx.value = (currentIdx.value - 1 + variants.value.length) % variants.value.length;
          else currentIdx.value = (currentIdx.value + 1) % variants.value.length;
        };
        const onKey = (e) => {
          const n = parseInt(e.key);
          if (n >= 1 && n <= variants.value.length) currentIdx.value = n - 1;
          if (e.key === 'ArrowLeft') switchVariant('prev');
          if (e.key === 'ArrowRight') switchVariant('next');
        };
        onMounted(() => window.addEventListener('keydown', onKey));
        onUnmounted(() => window.removeEventListener('keydown', onKey));

        return { searchForm, tableData, variants, currentIdx, switchVariant };
      }
    });
    app.use(ElementPlus);
    app.mount('#app');
  </script>
</body>
</html>
```
