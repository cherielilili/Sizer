# Position Sizer

仓位计算器 PWA，手机添加到主屏幕即可当 App 使用。

**在线地址**：https://cherielilili.github.io/Sizer/

## 功能

- **仓位计算**：输入账户权益、风险%、入场价、止损价 → 自动算出持仓股数
- **Long / Short** 切换
- **阶梯止损**：2-Stop / 3-Stop 模式，自动分配仓位和止损价位
- **Scale-Out 可视化**：水平条展示入场到各级止损的价位分布
- **R:R 目标**：1:1 ~ 5:1 六个盈亏比目标价和预期利润
- **PWA 支持**：可离线使用，手机可添加到主屏幕

## 公式

```
每股风险 = |入场价 - 止损价|
持仓股数 = floor(账户权益 × 风险% / 每股风险)
最大风险 = 账户权益 × 风险%
持仓市值 = 持仓股数 × 入场价
R:R 目标价 (Long)  = 入场价 + 每股风险 × R倍数
R:R 目标价 (Short) = 入场价 - 每股风险 × R倍数
```

## 技术栈

纯 HTML / CSS / JS，无框架依赖。通过 GitHub Pages 部署。

## 文件结构

```
├── index.html      # 页面结构
├── style.css       # 浅色主题 + 手机优先响应式
├── app.js          # 计算逻辑
├── manifest.json   # PWA 配置
├── sw.js           # Service Worker（离线缓存）
├── icon-192.png    # App 图标
└── icon-512.png    # App 图标（高清）
```
